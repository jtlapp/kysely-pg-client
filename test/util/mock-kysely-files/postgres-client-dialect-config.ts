// Adapted from https://github.com/kysely-org/kysely/blob/master/src/dialect/postgres/postgres-dialect-config.ts
// Unchanged code appears between BEGIN and END comments. If these sections
// ever become different from the Kysely code, they should be updated here.

import { PostgresCursorConstructor } from 'kysely'

import { PostgresSingleClient } from '../../../src'

/**
 * Configuration for PostgresClientDialect, which accepts an instance of
 * `pg.Client` or a function that returns one.
 */
export interface PostgresClientDialectConfig {
  /**
   * A postgres Client instance or a function that returns one.
   *
   * If a function is provided, it's called once when the first query is executed.
   *
   * https://node-postgres.com/apis/client
   */
  client: PostgresSingleClient | (() => Promise<PostgresSingleClient>)

  /**
   * https://github.com/brianc/node-postgres/tree/master/packages/pg-cursor
   * ```ts
   * import Cursor from 'pg-cursor'
   * // or
   * import * as Cursor from 'pg-cursor'
   *
   * new PostgresClientDialect({
   *  cursor: Cursor
   * })
   * ```
   */
  /* BEGIN UNCHANGED CODE | Copyright (c) 2022 Sami Koskimäki | MIT License */
  cursor?: PostgresCursorConstructor // different line
  /* END UNCHANGED CODE */
}
