// Adapted from https://github.com/kysely-org/kysely/blob/master/src/dialect/postgres/postgres-driver.ts
// Unchanged code appears between BEGIN and END comments. If these sections
// ever become different from the Kysely code, they should be updated here.

import {
  CompiledQuery,
  DatabaseConnection,
  Driver,
  PostgresCursorConstructor,
  QueryResult,
  TransactionSettings,
} from 'kysely'

import { PostgresClientDialectConfig } from './postgres-client-dialect-config'
import { PostgresSingleClient } from './postgres-single-client'
import { isFunction, freeze } from './utils/object-utils'
import { extendStackTrace } from './utils/stack-trace-utils'

/**
 * Kysely driver that uses a `pg.Client`, providing a single connection to
 * the database instead of a pool of connections as with `PostgresDriver`.
 */
export class PostgresClientDriver implements Driver {
  readonly #config: PostgresClientDialectConfig
  #client?: PostgresSingleClient
  #connection?: PostgresClientConnection
  #inUse = false

  constructor(config: PostgresClientDialectConfig) {
    this.#config = freeze({ ...config })
  }

  async init(): Promise<void> {}

  async acquireConnection(): Promise<DatabaseConnection> {
    if (this.#connection === undefined) {
      this.#client = isFunction(this.#config.client)
        ? await this.#config.client()
        : this.#config.client
      await this.#client.connect()
      this.#connection = new PostgresClientConnection(this.#client, {
        cursor: this.#config.cursor ?? null,
      })
    } else if (this.#inUse) {
      throw new Error(
        'Attempted to acquire a second connection; not configured as a pool'
      )
    }
    this.#inUse = true
    return this.#connection
  }

  /* BEGIN SYNCED CODE | Copyright (c) 2022 Sami Koskimäki | MIT License */
  async beginTransaction(
    connection: DatabaseConnection,
    settings: TransactionSettings
  ): Promise<void> {
    if (settings.isolationLevel) {
      await connection.executeQuery(
        CompiledQuery.raw(
          `start transaction isolation level ${settings.isolationLevel}`
        )
      )
    } else {
      await connection.executeQuery(CompiledQuery.raw('begin'))
    }
  }

  async commitTransaction(connection: DatabaseConnection): Promise<void> {
    await connection.executeQuery(CompiledQuery.raw('commit'))
  }

  async rollbackTransaction(connection: DatabaseConnection): Promise<void> {
    await connection.executeQuery(CompiledQuery.raw('rollback'))
  }
  /* END SYNCED CODE */

  async releaseConnection(connection: PostgresClientConnection): Promise<void> {
    if (connection !== this.#connection) {
      throw new Error('Attempted to release an unknown connection')
    }
    this.#inUse = false
  }

  async destroy(): Promise<void> {
    if (this.#client !== undefined) {
      await this.#client.end()
    }
  }
}

interface PostgresConnectionOptions {
  cursor: PostgresCursorConstructor | null
}

class PostgresClientConnection implements DatabaseConnection {
  #client: PostgresSingleClient
  #options: PostgresConnectionOptions

  constructor(
    client: PostgresSingleClient,
    options: PostgresConnectionOptions
  ) {
    this.#client = client
    this.#options = options
  }

  /* BEGIN SYNCED CODE | Copyright (c) 2022 Sami Koskimäki | MIT License */
  async executeQuery<O>(compiledQuery: CompiledQuery): Promise<QueryResult<O>> {
    try {
      const result = await this.#client.query<O>(compiledQuery.sql, [
        ...compiledQuery.parameters,
      ])

      if (
        result.command === 'INSERT' ||
        result.command === 'UPDATE' ||
        result.command === 'DELETE'
      ) {
        const numAffectedRows = BigInt(result.rowCount)

        return {
          // TODO: remove.
          numUpdatedOrDeletedRows: numAffectedRows,
          numAffectedRows,
          rows: result.rows ?? [],
        }
      }

      return {
        rows: result.rows ?? [],
      }
    } catch (err) {
      throw extendStackTrace(err, new Error())
    }
  }

  async *streamQuery<O>(
    compiledQuery: CompiledQuery,
    chunkSize: number
  ): AsyncIterableIterator<QueryResult<O>> {
    if (!this.#options.cursor) {
      throw new Error(
        "'cursor' is not present in your postgres dialect config. It's required to make streaming work in postgres."
      )
    }

    if (!Number.isInteger(chunkSize) || chunkSize <= 0) {
      throw new Error('chunkSize must be a positive integer')
    }

    const cursor = this.#client.query(
      new this.#options.cursor<O>(
        compiledQuery.sql,
        compiledQuery.parameters.slice()
      )
    )

    try {
      while (true) {
        const rows = await cursor.read(chunkSize)

        if (rows.length === 0) {
          break
        }

        yield {
          rows,
        }
      }
    } finally {
      await cursor.close()
    }
  }
  /* END SYNCED CODE */
}
