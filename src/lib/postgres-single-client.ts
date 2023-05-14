import { PostgresCursor, PostgresQueryResult } from 'kysely';

/**
 * A postgres Client instance, including only the methods used by
 * PostgresClientDriver.
 */
export interface PostgresSingleClient {
  query<R>(
    sql: string,
    parameters: ReadonlyArray<unknown>
  ): Promise<PostgresQueryResult<R>>;
  query<R>(cursor: PostgresCursor<R>): PostgresCursor<R>;
  connect(): Promise<void>;
  end(): Promise<void>;
}
