// Adapted from https://github.com/kysely-org/kysely/blob/master/test/node/src/select.test.ts

import { Kysely } from 'kysely'
import { Client } from 'pg'

import { PostgresClientDialect } from '../../../dist/cjs'
import {
  DIALECTS,
  clearDatabase,
  destroyTest,
  initTest,
  insertPersons,
  TestContext,
  expect,
  PLUGINS,
  DIALECT_CONFIGS,
  Database,
} from './custom-test-setup.js'

for (const dialect of DIALECTS) {
  describe(`${dialect}: custom select`, () => {
    /* BEGIN UNCHANGED CODE | Copyright (c) 2022 Sami Koskimäki | MIT License */
    let ctx: TestContext

    before(async function () {
      ctx = await initTest(this, dialect)
    })

    beforeEach(async () => {
      await insertPersons(ctx, [
        {
          first_name: 'Jennifer',
          last_name: 'Aniston',
          gender: 'female',
          pets: [
            {
              name: 'Catto',
              species: 'cat',
              toys: [{ name: 'spool', price: 10 }],
            },
          ],
        },
        {
          first_name: 'Arnold',
          last_name: 'Schwarzenegger',
          gender: 'male',
          pets: [{ name: 'Doggo', species: 'dog' }],
        },
        {
          first_name: 'Sylvester',
          last_name: 'Stallone',
          gender: 'male',
          pets: [{ name: 'Hammo', species: 'hamster' }],
        },
      ])
    })

    afterEach(async () => {
      await clearDatabase(ctx)
    })

    after(async () => {
      await destroyTest(ctx)
    })
    /* END UNCHANGED CODE */

    /* BEGIN UNCHANGED CODE | Copyright (c) 2022 Sami Koskimäki | MIT License */
    if (dialect === 'postgres') {
      it('should throw an error if the cursor implementation is not provided for the postgres dialect', async () => {
        /* END UNCHANGED CODE */
        const db = new Kysely<Database>({
          dialect: new PostgresClientDialect({
            client: async () => new Client(DIALECT_CONFIGS.postgres),
          }),
          /* BEGIN UNCHANGED CODE | Copyright (c) 2022 Sami Koskimäki | MIT License */
          plugins: PLUGINS,
        })

        await expect(
          (async () => {
            for await (const _ of db
              .selectFrom('person')
              .selectAll()
              .stream()) {
            }
          })()
        ).to.be.rejectedWith(
          "'cursor' is not present in your postgres dialect config. It's required to make streaming work in postgres."
        )

        await db.destroy()
      })
    }
  })
}
/* END UNCHANGED CODE */
