import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const databaseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL || "";

if (!databaseUrl) {
  throw new Error("DIRECT_URL or DATABASE_URL is required to sync sequences.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

async function syncSequences() {
  console.log("Starting PostgreSQL sequence synchronization...");

  try {
    await prisma.$connect();

    // Get all tables with sequence-based columns
    const tables: Array<{
      table_name: string;
      column_name: string;
      is_identity: string;
    }> = await prisma.$queryRawUnsafe(`
      SELECT
        t.table_name,
        c.column_name,
        c.is_identity
      FROM
        information_schema.tables t
        JOIN information_schema.columns c ON t.table_name = c.table_name
      WHERE
        t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
        AND c.column_default LIKE 'nextval%'
      ORDER BY t.table_name
    `);

    console.log(`Found ${tables.length} tables with sequence-based columns`);

    for (const { table_name, column_name } of tables) {
      try {
        // Get the sequence name
        const sequenceInfo: Array<{ sequence_name: string }> =
          await prisma.$queryRawUnsafe(`
          SELECT
            substring(column_default from '''([^'']+)''') as sequence_name
          FROM
            information_schema.columns
          WHERE
            table_schema = 'public'
            AND table_name = '${table_name}'
            AND column_name = '${column_name}'
        `);

        const sequenceName = sequenceInfo[0]?.sequence_name;
        if (!sequenceName) {
          console.log(`⚠️  No sequence found for ${table_name}.${column_name}`);
          continue;
        }

        // Get the max ID from the table
        const result: Array<{ max: number | null }> =
          await prisma.$queryRawUnsafe(
            `SELECT MAX("${column_name}") as max FROM "public"."${table_name}"`,
          );

        const maxId = result[0]?.max;
        if (maxId === null || maxId === undefined) {
          console.log(
            `⚠️  No records found in ${table_name}, skipping sequence sync`,
          );
          continue;
        }

        // Set sequence to max ID
        await prisma.$executeRawUnsafe(
          `SELECT setval('${sequenceName}', ${maxId}, true)`,
        );
        console.log(
          `✅ Synced ${sequenceName} to ${maxId} (table: ${table_name})`,
        );
      } catch (err: any) {
        console.error(
          `❌ Error syncing sequence for ${table_name}:`,
          err.message,
        );
      }
    }

    console.log("Sequence synchronization completed successfully");
  } catch (err) {
    console.error("Error during sequence synchronization:", err);
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}

syncSequences()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
