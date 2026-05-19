"use server";

import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { lowInventoryNotification } from "@/lib/notification/inventory-notify";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";
import {
  replenishProductValidationSchema,
  TReplenishProductValidation,
} from "@/validations/schemas/inventory/replenishProduct.validation";
import { revalidatePath } from "next/cache";

export async function replenish({
  productId,
  date,
  vendorId,
  quantity,
  price,
  unit,
  lot,
  notes,
}: TReplenishProductValidation): Promise<ServerAction | TErrorHandler> {
  try {
    await replenishProductValidationSchema.parseAsync({
      productId,
      date,
      vendorId,
      quantity,
      price,
      unit,
      lot,
      notes,
    });

    const companyId = await getCompanyId();

    const product = await db.inventoryProduct.findUnique({
      where: { id: productId },
    });
    if (!product) throw new Error("Product not found");

    const vendor = vendorId
      ? await db.vendor.findUnique({
          where: { id: vendorId },
        })
      : null;

    const newHistory = await db.inventoryProductHistory.create({
      data: {
        companyId,
        productId,
        date,
        quantity: +quantity,
        notes,
        type: "Purchase",
        price: price,
        vendorId: vendor?.id,
      },
    });

    // update product quantity
    const newQuantity = Number(product.quantity) + Number(quantity);

    const updatedProduct = await db.inventoryProduct.update({
      where: { id: productId },
      data: {
        quantity: newQuantity,
        price: price,
        unit: unit || product?.unit,
        lot: lot || product?.lot,
      },
    });

    // send low inventory notification to all admins and managers
    await lowInventoryNotification({
      companyId,
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
  } catch (error) {
    return errorHandler(error);
  }
}
