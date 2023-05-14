import { CompiledQuery, Transaction } from 'kysely';

/* BEGIN UNCHANGED CODE | Copyright (c) 2022 Sami Koskimäki | MIT License */
import {
  DIALECTS,
  clearDatabase,
  destroyTest,
  initTest,
  TestContext,
  expect,
  Database,
  insertDefaultDataSet,
} from './test-setup.js';

for (const dialect of DIALECTS) {
  describe(`${dialect}: transaction`, () => {
    let ctx: TestContext;
    let executedQueries: CompiledQuery[] = [];

    before(async function () {
      ctx = await initTest(this, dialect, (event) => {
        if (event.level === 'query') {
          executedQueries.push(event.query);
        }
      });
    });

    beforeEach(async () => {
      await insertDefaultDataSet(ctx);
      executedQueries = [];
    });

    afterEach(async () => {
      await clearDatabase(ctx);
    });

    after(async () => {
      await destroyTest(ctx);
    });

    if (dialect !== 'sqlite') {
      it('should set the transaction isolation level', async () => {
        await ctx.db
          .transaction()
          .setIsolationLevel('serializable')
          .execute(async (trx) => {
            await trx
              .insertInto('person')
              .values({
                first_name: 'Foo',
                last_name: 'Barson',
                gender: 'male',
              })
              .execute();
          });

        if (dialect == 'postgres') {
          expect(
            executedQueries.map((it) => ({
              sql: it.sql,
              parameters: it.parameters,
            }))
          ).to.eql([
            {
              sql: 'start transaction isolation level serializable',
              parameters: [],
            },
            {
              sql: 'insert into "person" ("first_name", "last_name", "gender") values ($1, $2, $3)',
              parameters: ['Foo', 'Barson', 'male'],
            },
            { sql: 'commit', parameters: [] },
          ]);
        } else if (dialect === 'mysql') {
          expect(
            executedQueries.map((it) => ({
              sql: it.sql,
              parameters: it.parameters,
            }))
          ).to.eql([
            {
              sql: 'set transaction isolation level serializable',
              parameters: [],
            },
            {
              sql: 'begin',
              parameters: [],
            },
            {
              sql: 'insert into `person` (`first_name`, `last_name`, `gender`) values (?, ?, ?)',
              parameters: ['Foo', 'Barson', 'male'],
            },
            { sql: 'commit', parameters: [] },
          ]);
        }
      });
    }

    if (dialect === 'postgres') {
      it('should be able to start a transaction with a single connection', async () => {
        const result = await ctx.db.connection().execute((db) => {
          return db.transaction().execute((trx) => {
            return trx
              .insertInto('person')
              .values({
                first_name: 'Foo',
                last_name: 'Barson',
                gender: 'male',
              })
              .returning('first_name')
              .executeTakeFirstOrThrow();
          });
        });

        expect(result.first_name).to.equal('Foo');
      });
    }
    /* END UNCHANGED CODE */

    it('should commit a successful transaction', async () => {
      await ctx.db.transaction().execute(async (trx) => {
        await insertPerson(trx, 1);
        await insertPet(trx, 1);
      });

      expect(await doesPersonExists(1)).to.equal(true);
      expect(await doesPetExists(1)).to.equal(true);
    });

    it('should rollback an unsuccessful transaction', async () => {
      try {
        await ctx.db.transaction().execute(async (trx) => {
          await insertPerson(trx, 1);
          await insertPet(trx, 1);
          throw new Error();
        });
      } catch (error) {}

      expect(await doesPersonExists(1)).to.equal(false);
      expect(await doesPetExists(1)).to.equal(false);
    });

    it('should disallow parallel requests for connections', async () => {
      const results = await Promise.allSettled([
        executeThread(1),
        executeThread(2),
      ]);
      expect(results.map((it) => it.status)).to.eql(['fulfilled', 'rejected']);
      expect((results[1] as PromiseRejectedResult).reason.message).to.contain(
        'not configured as a pool'
      );

      async function executeThread(id: number) {
        return ctx.db
          .insertInto('person')
          .values({
            id,
            first_name: `Person ${id}`,
            last_name: null,
            gender: 'other',
          })
          .execute();
      }
    });

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
        .execute();
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
        .execute();
    }

    async function doesPersonExists(id: number): Promise<boolean> {
      return !!(await ctx.db
        .selectFrom('person')
        .select('id')
        .where('id', '=', id)
        .where('first_name', '=', `Person ${id}`)
        .executeTakeFirst());
    }

    async function doesPetExists(ownerId: number): Promise<boolean> {
      return !!(await ctx.db
        .selectFrom('pet')
        .select('id')
        .where('owner_id', '=', ownerId)
        .where('name', '=', `Pet of ${ownerId}`)
        .executeTakeFirst());
    }
  });
}
/* END UNCHANGED CODE */
