"use server";

import { db } from "@/lib/db";
import { getProductWithQuantity } from "@/lib/getProductWithQuantity";
import { Material } from "@prisma/client";

export type InventoryShortage = {
  name: string;
  required: number;
  available: number;
};

export type InventoryCheckResult = {
  sufficient: boolean;
  shortages: InventoryShortage[];
};

// Only the fields getProductWithQuantity actually reads — the payment flow
// passes the in-memory estimate items, not full Prisma rows.
type MaterialLike = {
  productId?: number | null;
  // Decimal on saved rows, plain numbers in the in-memory store.
  quantity?: unknown;
  sell?: unknown;
  name?: string | null;
  invoiceItemId?: number | null;
};

/**
 * Answers "would saving this invoice be rejected for lack of stock?" without
 * writing anything, by mirroring the two rules in updateInventory.ts:
 *
 * - converting an estimate is rejected when it needs more than the inventory
 *   holds (updateInventoryOnEstimateConversion)
 * - updating an existing invoice is rejected when the resulting stock would
 *   land at 0 or below (updateInventoryOrCreateHistory)
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
      select: { id: true, type: true },
    });
    if (!invoice) return enough;

    const products = getProductWithQuantity(
      materials as unknown as Material[],
    ).filter((product) => product.id);
    if (!products.length) return enough;

    const inventoryProducts = await db.inventoryProduct.findMany({
      where: { id: { in: products.map((product) => product.id) } },
      select: { id: true, name: true, quantity: true },
    });

    // An invoice has already taken its materials out of stock, so only the
    // difference against what is being saved hits the inventory.
    const savedMaterials =
      invoice.type === "Invoice"
        ? await db.material.findMany({
            where: { invoiceId },
            select: { productId: true, quantity: true },
          })
        : [];

    const shortages: InventoryShortage[] = [];

    for (const product of products) {
      const inventoryProduct = inventoryProducts.find(
        (item) => item.id === product.id,
      );
      // Not an inventory-tracked product — the update path skips these too.
      if (!inventoryProduct) continue;

      const available = Number(inventoryProduct.quantity || 0);

      if (invoice.type === "Invoice") {
        const alreadyTaken = savedMaterials
          .filter((material) => material.productId === product.id)
          .reduce(
            (total, material) => total + Number(material.quantity || 0),
            0,
          );

        if (available + alreadyTaken - product.quantity <= 0) {
          shortages.push({
            name: inventoryProduct.name,
            required: product.quantity,
            available,
          });
        }
      } else if (product.quantity > available) {
        shortages.push({
          name: inventoryProduct.name,
          required: product.quantity,
          available,
        });
      }
    }

    return { sufficient: shortages.length === 0, shortages };
  } catch {
    // A failed check must not block taking a payment — fall back to the normal
    // path, where the server still enforces the same rules.
    return enough;
  }
}
