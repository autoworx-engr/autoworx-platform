import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

async function main() {
  const color = await db.vehicleColor.findFirst();
  if (!color) {
    console.log("No color found to test.");
    return;
  }
  console.log("Found color:", color);

  try {
    const deleted = await db.vehicleColor.deleteMany({
      where: {
        id: color.id,
        companyId: color.companyId,
      },
    });
    console.log("Deleted count:", deleted.count);
  } catch (err) {
    console.error("Delete error:", err);
  } finally {
    await db.$disconnect();
    await pool.end();
  }
}
main();
