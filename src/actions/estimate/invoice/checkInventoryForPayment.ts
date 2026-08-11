"use server";

import { db } from "@/lib/db";
import {
  checkInventoryShortages,
  type InventoryCheckResult,
  type MaterialLike,
} from "./checkInventory";

export type { InventoryCheckResult, InventoryShortage } from "./checkInventory";

/**
 * Answers "would saving this invoice be rejected for lack of stock?" for the
 * payment flow, so a short-stock estimate can still record its payment without
 * the whole save being rolled back. The rules live in checkInventoryShortages.
 *
 * Returns `sufficient: true` for an invoice that doesn't exist yet — there is
 * nothing to convert or update in that case.
 */
export async function checkInventoryForPayment({
  invoiceId,
  materials,
}: {
  invoiceId: string;
  materials: (MaterialLike | null)[];
}): Promise<InventoryCheckResult> {
  const enough: InventoryCheckResult = { sufficient: true, shortages: [] };

  try {
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      select: { type: true },
    });
    if (!invoice) return enough;

    return checkInventoryShortages({
      invoiceId,
      materials,
      rule: invoice.type === "Invoice" ? "update" : "conversion",
    });
  } catch {
    // A failed check must not block taking a payment — fall back to the normal
    // path, where the server still enforces the same rules.
    return enough;
  }
}
