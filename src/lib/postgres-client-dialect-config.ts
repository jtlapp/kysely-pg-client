import { PostgresCursorConstructor } from 'kysely';

import { PostgresSingleClient } from './postgres-single-client';

/**
 * Configuration for PostgresClientDialect.
 */
export interface PostgresClientDialectConfig {
  /**
   * A postgres Client instance or a function that returns one.
   *
   * If a function is provided, it's called once when the first query is executed.
   *
   * https://node-postgres.com/apis/client
   */
  client: PostgresSingleClient | (() => Promise<PostgresSingleClient>);

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
  cursor?: PostgresCursorConstructor;
}
