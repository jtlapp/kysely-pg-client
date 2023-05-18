# kysely-pg-client

Non-pooling single-connection Postgres dialect for Kysely

## Introduction

`PostgresClientDialect` is a [Kysely](https://github.com/kysely-org/kysely) dialect for Postgres that takes uses a single connection instead of a pool of connections. As with the Postgres dialect that Kysely provides, it is based on [node-postgres](https://github.com/brianc/node-postgres) (pg), but it is configured with a [Client](https://node-postgres.com/apis/client) rather than a [Pool](https://node-postgres.com/apis/pool).

The dialect avoids the extra overhead of managing a pool and is ideal for serverless use, which would otherwise wastefully create and destroy a pool on each HTTP request. The overhead is likely trivial in clock cycles compared to the time it takes to issue a query, but it does allocate and deallocate objects, reducing available memory and increasing the frequency of garbage collection. The difference may not be much, but it could be of value when you're paying for resource usage or when the server has real-time requirements.

The alternative is to use Kysely's `PostgresDialect` with a maximum pool size of one, set via the configuration option `max: 1`.

This package uses [kysely-test-sync](https://github.com/jtlapp/kysely-test-sync) to run `PostgresClientDialect` against Kysely's test suite, dynamically downloading the relevant Kysely tests as needed. This should help ensure that the dialect is as reliable as the Kysely's pooling dialect and that it continues to benefit as Kysely gains more tests.

## Installation

Install the package with your preferred dependency manager:

```
npm install kysely-pg-client

yarn add kysely-pg-client

pnpm add kysely-pg-client
```

## Usage

## Testing

## License
