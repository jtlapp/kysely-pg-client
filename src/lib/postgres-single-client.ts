import { PostgresCursor, PostgresQueryResult } from 'kysely';

export interface PostgresSingleClient {
  query<R>(
    sql: string,
    parameters: ReadonlyArray<unknown>
  ): Promise<PostgresQueryResult<R>>;
  query<R>(cursor: PostgresCursor<R>): PostgresCursor<R>;
  // also includes end(), but not needed by pools
  connect(): Promise<void>;
  end(): Promise<void>;
}
