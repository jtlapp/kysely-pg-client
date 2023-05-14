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
} from 'kysely';

import { PostgresClientDialectConfig } from './postgres-client-dialect-config';
import { PostgresClientDriver } from './postgres-client-driver';

export class PostgresClientDialect implements Dialect {
  readonly #config: PostgresClientDialectConfig;

  constructor(config: PostgresClientDialectConfig) {
    this.#config = config;
  }

  createDriver(): Driver {
    return new PostgresClientDriver(this.#config);
  }

  createQueryCompiler(): QueryCompiler {
    return new PostgresQueryCompiler();
  }

  createAdapter(): DialectAdapter {
    return new PostgresAdapter();
  }

  createIntrospector(db: Kysely<any>): DatabaseIntrospector {
    return new PostgresIntrospector(db);
  }
}
