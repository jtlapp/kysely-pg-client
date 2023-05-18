# kysely-pg-client

Non-pooling single-connection Postgres dialect for Kysely

## Introduction

`PostgresClientDialect` is a [Kysely](https://github.com/kysely-org/kysely) dialect for Postgres that uses a single connection instead of a pool of connections. As with the Postgres dialect that Kysely provides, it is based on [node-postgres](https://github.com/brianc/node-postgres) (pg), but it is configured with a [Client](https://node-postgres.com/apis/client) rather than a [Pool](https://node-postgres.com/apis/pool).

The dialect avoids the extra overhead of managing a pool and is ideal for serverless use, which would otherwise wastefully create and destroy a pool on each HTTP request. The overhead is likely trivial in clock cycles compared to the time it takes to issue a query, but it does allocate and deallocate objects, reducing available memory and increasing the frequency of garbage collection. The difference may not be much, but it could be of value when you're paying for resource usage or when the server has real-time requirements.

The alternative is to use Kysely's `PostgresDialect` with a maximum pool size of one, set via the configuration option `max: 1`.

This package uses [kysely-test-sync](https://github.com/jtlapp/kysely-test-sync) to run `PostgresClientDialect` against Kysely's test suite, downloading the relevant tests from the appropriate Kysely release. This should help ensure that the dialect is as reliable as the Kysely's pooling dialect and that it continues to benefit as Kysely gains more tests.

## Installation

Install the package with your preferred dependency manager:

```
npm install kysely-pg-client

yarn add kysely-pg-client

pnpm add kysely-pg-client
```

## Usage

Use `PostgresClientDialect` exactly as you would a [`PostgresDialect`](https://kysely-org.github.io/kysely/classes/PostgresDialect.html), except provide a [Client](https://node-postgres.com/apis/client) instead of a [Pool](https://node-postgres.com/apis/pool):

```ts
import { PostgresClientDialect } from 'kysely-pg-client'

const db = new Kysely<Database>({
  dialect: new PostgresClientDialect({
    client: new Client({
      host: 'localhost',
      database: 'kysely_test',
      // etc...
    }),
  }),
})
```

Its options argument is an interface of type [`PostgresClientDialectConfig`](https://github.com/jtlapp/kysely-pg-client/blob/main/src/lib/postgres-client-dialect-config.ts), which is analogous to Kysely's [`PostgresDialectConfig`](https://kysely-org.github.io/kysely/interfaces/PostgresDialectConfig.html), except that `PostgresClientDialectConfig` doesn't provide an `onCreateConnection` callback.

## Testing

There are two test suites you can run. The first runs the dialect against the tests in the Kysely release for which I've most recently ensured compatibility. The version of this release is found in the following file:

[`test/current/src/downloads/_kysely-version.txt`](https://github.com/jtlapp/kysely-pg-client/blob/main/test/current/src/downloads/_kysely-version.txt)

Before running the tests, you'll need to install the dependencies and run docker:

```
npm install
docker compose up
```

Run the tests using the `test` script using your choice of package manager:

```
npm run test

yarn test

pnpm test
```

The other test suite runs the dialect against the tests in the most recent release of Kysely that is compatible with the version given for Kysely in [`package.json`](https://github.com/jtlapp/kysely-pg-client/blob/main/package.json), according to semantic versioning. For example, if `package.json` indicates a version of `^1.3.3`, the suite will run using the tests found in the greatest version matching `1.*.*`. And if `package.json` indicates a version of `^0.24.2`, the suite will run using the tests found in the greatest version matching `0.24.*`. (See the [semantic versioning rules](https://github.com/jtlapp/kysely-test-sync#semantic-versioning-of-tests).) Run these tests using the `test:latest` script.

**IMPORTANT**: If the `test:latest` script reports problems, it does not necessarily mean that there are bugs in the repo. It only means that a more recent version of Kysely is somehow incompatible with the current version of this repo. This repo calls out to Kysely's native tests, and changes to those tests might require changes to this repo to keep it properly integrated with them. This repo also borrows some code from Kysely, and `test:latest` reports when Kysely has changed the borrowed code in some way.

However, if you do find that `test:latest` is reporting problems for a newer version of Kysely, please open an issue on this repo to report that it should be upgraded to work with the newer tests.

## License

MIT License. Copyright &copy; 2023 Joseph T. Lapp
