/**
 * One-time backfill: normalizes Client.mobile to the same canonical format
 * the app now writes everywhere (see src/utils/normalizePhone.ts), and reports
 * — but does NOT auto-merge — clients that collide once normalized.
 *
 * Merging is left to a human: two client rows with the same real phone number
 * may each have their own appointments/invoices/messages, and picking which
 * one "wins" is a business decision, not something safe to automate.
 *
 * Usage:
 *   npx tsx scripts/normalize-client-phones.ts            # dry run, no writes
 *   npx tsx scripts/normalize-client-phones.ts --apply     # normalize for real
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { normalizePhoneForStorage } from "../src/utils/normalizePhone";

const databaseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL || "";
const adapter = new PrismaPg({ connectionString: databaseUrl });
const db = new PrismaClient({ adapter });
const apply = process.argv.includes("--apply");

async function main() {
  const clients = await db.client.findMany({
    where: { mobile: { not: null } },
    select: {
      id: true,
      companyId: true,
      firstName: true,
      lastName: true,
      mobile: true,
    },
  });

  const toUpdate = clients.filter(
    (c) => c.mobile && normalizePhoneForStorage(c.mobile) !== c.mobile,
  );

  console.log(
    `${clients.length} clients with a mobile number; ${toUpdate.length} need normalizing.`,
  );

  if (apply) {
    for (const c of toUpdate) {
      await db.client.update({
        where: { id: c.id },
        data: { mobile: normalizePhoneForStorage(c.mobile!) },
      });
    }
    console.log(`Updated ${toUpdate.length} rows.`);
  } else {
    console.log(
      "Dry run — pass --apply to write changes. Sample of what would change:",
    );
    for (const c of toUpdate.slice(0, 20)) {
      console.log(
        `  #${c.id} "${c.mobile}" -> "${normalizePhoneForStorage(c.mobile!)}"`,
      );
    }
  }

  // Duplicate report, keyed by (companyId, normalized mobile) — uses the
  // POST-normalization value regardless of --apply, so this also tells you
  // what the duplicate picture will look like right after backfilling.
  const groups = new Map<string, typeof clients>();
  for (const c of clients) {
    if (!c.mobile) continue;
    const key = `${c.companyId}:${normalizePhoneForStorage(c.mobile)}`;
    const group = groups.get(key) ?? [];
    group.push(c);
    groups.set(key, group);
  }

  const duplicateGroups = Array.from(groups.entries()).filter(
    ([, group]) => group.length > 1,
  );

  console.log(
    `\n${duplicateGroups.length} phone numbers have multiple client records:`,
  );
  for (const [key, group] of duplicateGroups) {
    const [companyId, mobile] = key.split(":");
    console.log(`  company ${companyId}, ${mobile}:`);
    for (const c of group) {
      console.log(
        `    #${c.id} ${c.firstName} ${c.lastName ?? ""} (raw: "${c.mobile}")`,
      );
    }
  }

  await db.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await db.$disconnect();
  process.exit(1);
});
