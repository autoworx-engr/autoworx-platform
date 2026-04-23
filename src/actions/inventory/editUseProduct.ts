"use server";

import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { lowInventoryNotification } from "@/lib/notification/inventory-notify";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";
import {
  TUpdateSalesInventoryHistorySchema,
  updateSalesInventoryHistorySchema,
} from "@/validations/schemas/inventory/useProduct.validation";
import { revalidatePath } from "next/cache";

export async function editUseProduct({
  productId,
  invoiceId,
  quantity,
  notes,
  inventoryProductHistoryId,
}: TUpdateSalesInventoryHistorySchema): Promise<ServerAction | TErrorHandler> {
  try {
    await updateSalesInventoryHistorySchema.parseAsync({
      productId,
      invoiceId,
      quantity,
      notes,
      inventoryProductHistoryId,
    });
    // update product quantity
    const product = await db.inventoryProduct.findUnique({
      where: { id: productId },
      include: { vendor: true },
    });

    const getHistory = await db.inventoryProductHistory.findUnique({
      where: { id: inventoryProductHistoryId },
    });

    const updateHistory = await db.inventoryProductHistory.update({
      where: { id: inventoryProductHistoryId },
      data: {
        invoiceId,
        quantity: +quantity,
        notes,
      },
    });

    const newQuantity =
      Number(product!.quantity!) +
      Number(getHistory?.quantity!) -
      Number(quantity);

    const updatedProduct = await db.inventoryProduct.update({
      where: { id: productId },
      data: { quantity: newQuantity },
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
      data: updateHistory,
    };
  } catch (error) {
    return errorHandler(error);
  }
}
