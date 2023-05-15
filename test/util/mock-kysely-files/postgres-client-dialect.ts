// Adapted from https://github.com/kysely-org/kysely/blob/master/src/dialect/postgres/postgres-dialect.ts
// Unchanged code appears between BEGIN and END comments. If these sections
// ever become different from the Kysely code, they should be updated here.

import {
  DatabaseIntrospector,
  Dialect,
  DialectAdapter,
  Driver,
  Kysely,
  PostgresAdapter,
  PostgresIntrospector,
  PostgresQueryCompiler,
  QueryCompiler,
} from 'kysely'

import { PostgresClientDialectConfig } from './postgres-client-dialect-config'
import { PostgresClientDriver } from '../../../src/lib/postgres-client-driver'

/**
 * A Kysely Postgres dialect that uses a single `pg.Client` instance, providng
 * a single database connection instead of a pool of connections.
 */
export class PostgresClientDialect implements Dialect {
  readonly #config: PostgresClientDialectConfig

  constructor(config: PostgresClientDialectConfig) {
    this.#config = config
  }

  createDriver(): Driver {
    return new PostgresClientDriver(this.#config)
  }

  /* BEGIN UNCHANGED CODE | Copyright (c) 2022 Sami Koskimäki | MIT License */
  createQueryCompiler(): QueryCompiler {
    return new PostgresQueryCompiler()
  }

  createAdapter(): DialectAdapter {
    return new PostgresAdapter()
  }

  createIntrospector(db: Kysely<any>): DatabaseIntrospector {
    return new PostgresIntrospector(db)
  }
  /* END UNCHANGED CODE */
}
