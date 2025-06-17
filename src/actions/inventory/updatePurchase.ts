"use server";

import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { lowInventoryNotification } from "@/lib/notification/inventory-notify";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";
import {
  editPurchaseListValidation,
  EditReplenishProductValidation,
} from "@/validations/schemas/inventory/editPurchaseList.validation";
import { revalidatePath } from "next/cache";

export async function UpdatePurchase({
  historyId,
  productId,
  date,
  vendorId,
  originalQuantity,
  quantityDifference,
  price,
  unit,
  lot,
  notes,
  isIncreasing,
  type,
}: EditReplenishProductValidation): Promise<ServerAction | TErrorHandler> {
  try {
    await editPurchaseListValidation.parseAsync({
      historyId,
      productId,
      date,
      vendorId,
      originalQuantity,
      quantityDifference,
      price,
      unit,
      lot,
      notes,
      isIncreasing,
      type,
    });
    const companyId = await getCompanyId();

    const product = await db.inventoryProduct.findUnique({
      where: { id: productId },
    });

    const vendor = vendorId
      ? await db.vendor.findUnique({
          where: { id: vendorId },
        })
      : null;

    // Calculate updated quantity based on type
    let updatedQuantity = Number(originalQuantity);
    let actualQuantity = Number(product!.quantity!);

    if (type === "Purchase") {
      if (isIncreasing) {
        updatedQuantity += Number(quantityDifference);
        actualQuantity += Number(quantityDifference);
      } else {
        updatedQuantity -= Number(quantityDifference);
        actualQuantity -= Number(quantityDifference);
      }
    } else if (type === "Sale") {
      if (isIncreasing) {
        updatedQuantity += Number(quantityDifference);
        actualQuantity -= Number(quantityDifference);
      } else {
        updatedQuantity -= Number(quantityDifference);
        actualQuantity += Number(quantityDifference);
      }
    }

    const newHistory = await db.inventoryProductHistory.update({
      where: { id: historyId },
      data: {
        companyId,
        productId,
        date,
        quantity: updatedQuantity,
        notes,
        price: price ?? 0,
        vendorId: vendor?.id,
        type,
      },
    });

    const updatedProduct = await db.inventoryProduct.update({
      where: { id: productId },
      data: {
        quantity: actualQuantity,
        price: price ?? product?.price,
        unit: unit ?? product?.unit,
        lot: lot ?? product?.lot,
      },
    });

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
