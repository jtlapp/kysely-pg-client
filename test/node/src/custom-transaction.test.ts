import { CompiledQuery, Transaction } from 'kysely'

import {
  DIALECTS,
  clearDatabase,
  destroyTest,
  initTest,
  TestContext,
  expect,
  Database,
  insertDefaultDataSet,
} from './custom-test-setup.js'

for (const dialect of DIALECTS) {
  describe(`${dialect}: custom transaction`, () => {
    /* BEGIN UNCHANGED CODE | Copyright (c) 2022 Sami Koskimäki | MIT License */
    let ctx: TestContext
    let executedQueries: CompiledQuery[] = []

    before(async function () {
      ctx = await initTest(this, dialect, (event) => {
        if (event.level === 'query') {
          executedQueries.push(event.query)
        }
      })
    })

    beforeEach(async () => {
      await insertDefaultDataSet(ctx)
      executedQueries = []
    })

    afterEach(async () => {
      await clearDatabase(ctx)
    })

    after(async () => {
      await destroyTest(ctx)
    })
    /* END UNCHANGED CODE */

    it('should commit a successful transaction', async () => {
      const personID = 1000
      await ctx.db.transaction().execute(async (trx) => {
        await insertPerson(trx, personID)
        await insertPet(trx, personID)
      })

      expect(await doesPersonExists(personID)).to.equal(true)
      expect(await doesPetExists(personID)).to.equal(true)
    })

    it('should rollback an unsuccessful transaction', async () => {
      const personID = 1001
      try {
        await ctx.db.transaction().execute(async (trx) => {
          await insertPerson(trx, personID)
          await insertPet(trx, personID)
          throw new Error()
        })
      } catch (error) {}

      expect(await doesPersonExists(personID)).to.equal(false)
      expect(await doesPetExists(personID)).to.equal(false)
    })

    it('should disallow parallel requests for connections', async () => {
      const results = await Promise.allSettled([
        executeThread(1100),
        executeThread(1101),
      ])
      expect(results.map((it) => it.status)).to.eql(['fulfilled', 'rejected'])
      expect((results[1] as PromiseRejectedResult).reason.message).to.contain(
        'not configured as a pool'
      )

      async function executeThread(id: number) {
        return ctx.db
          .insertInto('person')
          .values({
            id,
            first_name: `Person ${id}`,
            last_name: null,
            gender: 'other',
          })
          .execute()
      }
    })

    /* BEGIN UNCHANGED CODE | Copyright (c) 2022 Sami Koskimäki | MIT License */
    async function insertPet(
      trx: Transaction<Database>,
      ownerId: number
    ): Promise<void> {
      await trx
        .insertInto('pet')
        .values({
          name: `Pet of ${ownerId}`,
          owner_id: ownerId,
          species: 'cat',
        })
        .execute()
    }

    async function insertPerson(
      trx: Transaction<Database>,
      id: number
    ): Promise<void> {
      await trx
        .insertInto('person')
        .values({
          id: id,
          first_name: `Person ${id}`,
          last_name: null,
          gender: 'other',
        })
        .execute()
    }

    async function doesPersonExists(id: number): Promise<boolean> {
      return !!(await ctx.db
        .selectFrom('person')
        .select('id')
        .where('id', '=', id)
        .where('first_name', '=', `Person ${id}`)
        .executeTakeFirst())
    }

    async function doesPetExists(ownerId: number): Promise<boolean> {
      return !!(await ctx.db
        .selectFrom('pet')
        .select('id')
        .where('owner_id', '=', ownerId)
        .where('name', '=', `Pet of ${ownerId}`)
        .executeTakeFirst())
    }
  })
}
/* END UNCHANGED CODE */
