"use server";

import { lowInventoryNotification } from "@/lib/notification/inventory-notify";
import type { InventoryShortage } from "./checkInventory";

/**
 * Tells the admins/managers that a stock shortage stopped an estimate from
 * being converted, so the products can be restocked. Needed because
 * lowInventoryNotification lives in a plain lib module and cannot be called
 * from a client component directly.
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
}: {
  invoiceId: string;
  shortages: InventoryShortage[];
  // Falls back to the session's company when omitted.
  companyId?: number;
}) {
  await Promise.all(
    shortages.map((shortage) =>
      lowInventoryNotification({
        companyId,
        productId: shortage.productId,
        productName: shortage.name,
        lowInventoryAlert: shortage.required,
        currentQuantity: shortage.available,
        description: `Payment recorded for estimate ${invoiceId}, but ${shortage.name} is low in stock — ${shortage.required} needed, ${shortage.available} available. The estimate was not converted. Restock in Autoworx.`,
        // One product failing must not stop the rest from being reported.
      }).catch((err) =>
        console.error("lowInventoryNotification failed", shortage.name, err),
      ),
    ),
  );
}
