"use server";

import { lowInventoryNotification } from "@/lib/notification/inventory-notify";
import type { InventoryShortage } from "./checkInventory";

export type InventoryShortageReason = "payment" | "saved-anyway";

function describe(
  reason: InventoryShortageReason,
  invoiceId: string,
  shortage: InventoryShortage,
) {
  const stock = `${shortage.required} needed, ${shortage.available} available`;

  if (reason === "saved-anyway") {
    return `Estimate ${invoiceId} was saved with ${shortage.name} short in stock — ${stock}. Restock in Autoworx.`;
  }

  return `Payment recorded for estimate ${invoiceId}, but ${shortage.name} is low in stock — ${stock}. The estimate was not converted. Restock in Autoworx.`;
}

/**
 * Tells the admins/managers that an estimate ran into a stock shortage, so the
 * products can be restocked. Needed because lowInventoryNotification lives in a
 * plain lib module and cannot be called from a client component directly.
 *
 * `required` is passed as the alert threshold on purpose: lowInventoryNotification
 * only sends when `currentQuantity < lowInventoryAlert`, and a shortage always
 * means the available stock is below what the estimate needs. This mirrors what
 * authorize.ts already does on its shortage path.
 */
export async function notifyInventoryShortage({
  invoiceId,
  shortages,
  companyId,
  reason = "payment",
}: {
  invoiceId: string;
  shortages: InventoryShortage[];
  // Falls back to the session's company when omitted.
  companyId?: number;
  reason?: InventoryShortageReason;
}) {
  await Promise.all(
    shortages.map((shortage) =>
      lowInventoryNotification({
        companyId,
        productId: shortage.productId,
        productName: shortage.name,
        lowInventoryAlert: shortage.required,
        currentQuantity: shortage.available,
        description: describe(reason, invoiceId, shortage),
      }).catch((err) =>
        console.error("lowInventoryNotification failed", shortage.name, err),
      ),
    ),
  );
}
