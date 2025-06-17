"use server";

import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { lowInventoryNotification } from "@/lib/notification/inventory-notify";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";
import {
  lossProductValidationSchema,
  TLossProductValidation,
} from "@/validations/schemas/inventory/useProduct.validation";
import { revalidatePath } from "next/cache";

export async function useProduct({
  productId,
  invoiceId,
  date,
  quantity,
  notes,
}: TLossProductValidation): Promise<ServerAction | TErrorHandler> {
  try {
    await lossProductValidationSchema.parseAsync({
      productId,
      invoiceId,
      date,
      quantity,
      notes,
    });
    const newHistory = await db.$transaction(async (db) => {
      const companyId = await getCompanyId();
      const product = await db.inventoryProduct.findUnique({
        where: { id: productId },
        include: { vendor: true },
      });

      const findProductHistory = await db.inventoryProductHistory.findFirst({
        where: {
          productId,
          invoiceId,
          companyId,
          type: "Sale",
        },
      });

      let historyRecord = null;

      if (findProductHistory && findProductHistory.invoiceId) {
        historyRecord = await db.inventoryProductHistory.update({
          where: {
            id: findProductHistory.id,
          },
          data: {
            quantity: Number(findProductHistory.quantity) + Number(quantity),
            date,
            notes,
          },
        });
      } else {
        historyRecord = await db.inventoryProductHistory.create({
          data: {
            companyId,
            productId,
            invoiceId,
            date,
            quantity: Number(quantity),
            notes,
            type: "Sale",
            price: product?.price,
            vendorId: product?.vendor?.id,
            isLost: !!invoiceId,
          },
        });
      }

      let newQuantity = 0;

      if (product?.quantity && Number(product?.quantity) >= Number(quantity)) {
        newQuantity = Number(product.quantity) - Number(quantity);
      } else {
        throw new Error(`Quantity of product ${product?.name} is not enough`);
      }

      const updatedInventoryProduct = await db.inventoryProduct.update({
        where: { id: productId },
        data: { quantity: newQuantity },
      });

      await lowInventoryNotification({
        companyId,
        lowInventoryAlert: updatedInventoryProduct.lowInventoryAlert || 0,
        currentQuantity: Number(updatedInventoryProduct.quantity) || 0,
        productName: updatedInventoryProduct.name,
        productId: updatedInventoryProduct.id,
      });
      return historyRecord;
    });

    revalidatePath("/dashboard/inventory");
    return {
      type: "success",
      data: newHistory,
    };
  } catch (err) {
    return errorHandler(err);
  }
}
