"use server";

import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { lowInventoryNotification } from "@/lib/notification/inventory-notify";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";
import {
  TUpdatePurchaseInventoryHistorySchema,
  updatePurchaseInventoryHistorySchema,
} from "@/validations/schemas/inventory/useProduct.validation";
import { revalidatePath } from "next/cache";

export async function editHistory({
  historyId,
  productId,
  date,
  vendorId,
  quantity,
  price,
  unit,
  lot,
  notes,
}: TUpdatePurchaseInventoryHistorySchema): Promise<
  ServerAction | TErrorHandler
> {
  try {
    await updatePurchaseInventoryHistorySchema.parseAsync({
      productId,
      historyId,
      date,
      vendorId,
      quantity,
      price,
      unit,
      lot,
      notes,
    });
    const product = await db.inventoryProduct.findUnique({
      where: { id: productId },
    });
    if (!product) throw new Error("Product not found");

    const history = await db.inventoryProductHistory.findUnique({
      where: { id: historyId },
    });
    if (!history) throw new Error("History record not found");

    const vendor = vendorId
      ? await db.vendor.findUnique({
          where: { id: vendorId },
        })
      : null;

    // update history
    const newHistory = await db.inventoryProductHistory.update({
      where: { id: historyId },
      data: {
        date: date || history?.date,
        quantity: +quantity || history?.quantity,
        notes: notes || history?.notes,
        price: price || history?.price,
        vendorId: vendor ? vendor.id : history?.vendorId,
      },
    });

    // update product quantity
    const newQuantity =
      Number(product.quantity) + Number(quantity) - Number(history.quantity);

    const updatedProduct = await db.inventoryProduct.update({
      where: { id: productId },
      data: {
        quantity: newQuantity,
        price: price || product?.price,
        unit: unit || product?.unit,
        lot: lot || product?.lot,
      },
    });

    // send low inventory notification to all admins and managers
    await lowInventoryNotification({
      lowInventoryAlert: updatedProduct.lowInventoryAlert || 0,
      currentQuantity: Number(updatedProduct.quantity) || 0,
      productName: updatedProduct.name,
      productId: updatedProduct.id,
    });

    revalidatePath("/inventory");

    return {
      type: "success",
      data: newHistory,
    };
  } catch (err) {
    return errorHandler(err);
  }
}
