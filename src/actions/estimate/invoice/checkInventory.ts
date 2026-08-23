"use server";

import { db } from "@/lib/db";
import { getProductWithQuantity } from "@/lib/getProductWithQuantity";
import { InvoiceType, Material } from "@prisma/client";

export type InventoryShortage = {
  productId: number;
  name: string;
  required: number;
  available: number;
};

export type InventoryCheckResult = {
  sufficient: boolean;
  shortages: InventoryShortage[];
};

// Only the fields getProductWithQuantity actually reads — callers pass either
// saved Prisma rows or the in-memory estimate items.
export type MaterialLike = {
  productId?: number | null;
  // Decimal on saved rows, plain numbers in the in-memory store.
  quantity?: unknown;
  sell?: unknown;
  name?: string | null;
  invoiceItemId?: number | null;
};

/**
 * Answers "would this save be rejected for lack of stock?" without writing
 * anything, by mirroring the two rules the write paths enforce:
 *
 * - `"conversion"` — an estimate landing as an invoice (create / convert /
 *   authorize) is rejected when it needs more than the inventory holds
 * - `"update"` — an existing invoice being re-saved is rejected when the
 *   resulting stock would land at 0 or below, since it has already drawn its
 *   materials out (updateInventoryOrCreateHistory)
 */
export async function checkInventoryShortages({
  invoiceId,
  materials,
  rule,
}: {
  invoiceId?: string;
  materials: (MaterialLike | null)[];
  rule: "conversion" | "update";
}): Promise<InventoryCheckResult> {
  const enough: InventoryCheckResult = { sufficient: true, shortages: [] };

  try {
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
      rule === "update" && invoiceId
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
      // Not an inventory-tracked product — the write paths skip these too.
      if (!inventoryProduct) continue;

      const available = Number(inventoryProduct.quantity || 0);

      if (rule === "update") {
        const alreadyTaken = savedMaterials
          .filter((material) => material.productId === product.id)
          .reduce(
            (total, material) => total + Number(material.quantity || 0),
            0,
          );

        if (available + alreadyTaken - product.quantity <= 0) {
          shortages.push({
            productId: inventoryProduct.id,
            name: inventoryProduct.name,
            required: product.quantity,
            available,
          });
        }
      } else if (product.quantity > available) {
        shortages.push({
          productId: inventoryProduct.id,
          name: inventoryProduct.name,
          required: product.quantity,
          available,
        });
      }
    }

    return { sufficient: shortages.length === 0, shortages };
  } catch {
    // A failed check must not block the save — the write path still enforces
    // the same rules, so the worst case is the old "not enough stock" error.
    return enough;
  }
}

/**
 * Shortages for converting or authorizing an already-saved estimate, reading
 * its materials from the database. Used by the convert/authorize buttons so a
 * warning can be shown before the write is attempted.
 */
export async function checkInventoryForConversion(
  invoiceId: string,
): Promise<InventoryCheckResult> {
  const enough: InventoryCheckResult = { sufficient: true, shortages: [] };

  try {
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      select: { type: true },
    });

    // Invoice -> Estimate puts stock back, so it can never run short.
    if (!invoice || invoice.type === InvoiceType.Invoice) return enough;

    const materials = await db.material.findMany({
      where: { invoiceId, productId: { not: null } },
      select: { productId: true, quantity: true, name: true, sell: true },
    });

    return checkInventoryShortages({ materials, rule: "conversion" });
  } catch {
    return enough;
  }
}

/**
 * Shortages for saving from the create/edit screen, where the materials live in
 * the browser store. A saved invoice re-saves against the "update" rule;
 * everything else — an estimate save included, even though it only reserves the
 * stock on paper — is measured against what the inventory holds right now, so
 * the shortage can be warned about before the estimate is written.
 */
export async function checkInventoryForInvoiceSave({
  invoiceId,
  materials,
}: {
  invoiceId?: string;
  materials: (MaterialLike | null)[];
  // Callers still pass what they are saving as; the check no longer depends on
  // it now that estimate saves are warned about too.
  targetType?: InvoiceType;
}): Promise<InventoryCheckResult> {
  const enough: InventoryCheckResult = { sufficient: true, shortages: [] };

  try {
    const invoice = invoiceId
      ? await db.invoice.findUnique({
          where: { id: invoiceId },
          select: { type: true },
        })
      : null;

    if (invoice?.type === InvoiceType.Invoice) {
      return checkInventoryShortages({ invoiceId, materials, rule: "update" });
    }

    return checkInventoryShortages({ materials, rule: "conversion" });
  } catch {
    return enough;
  }
}
