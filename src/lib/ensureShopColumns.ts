import { db } from "@/lib/db";
import { defaultShopColumn } from "@/lib/defaultColumns";

/**
 * Returns the company's "Pending" shop column, provisioning it when missing.
 *
 * Every draft-estimate flow assumes this column exists — it is seeded at
 * registration (see `insertDefaultColumns` in actions/auth/register.ts) — but
 * companies created before shop columns were seeded, or that had columns
 * removed, can lack it and would otherwise fail with "Pending column not found".
 *
 * `Column` has no unique constraint on title, so `createMany` cannot dedupe.
 * We therefore seed the full default shop set only when the company has no shop
 * columns at all; otherwise we add just the missing "Pending" column.
 */
export async function getOrCreatePendingColumn(companyId: number) {
  const existing = await db.column.findFirst({
    where: { companyId, title: "Pending", type: "shop" },
  });
  if (existing) return existing;

  const shopColumnCount = await db.column.count({
    where: { companyId, type: "shop" },
  });

  if (shopColumnCount === 0) {
    await db.column.createMany({
      data: defaultShopColumn.map((column) => ({ ...column, companyId })),
    });
  } else {
    const pendingDefault = defaultShopColumn.find(
      (c) => c.title === "Pending",
    )!;
    await db.column.create({
      data: { ...pendingDefault, order: 0, companyId },
    });
  }

  const pending = await db.column.findFirst({
    where: { companyId, title: "Pending", type: "shop" },
  });

  if (!pending) {
    throw new Error(
      "Failed to provision the Pending shop column for the company.",
    );
  }

  return pending;
}
