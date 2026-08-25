"use server";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { lowInventoryNotification } from "@/lib/notification/inventory-notify";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";
import {
  TUpdateProductValidation,
  updateProductValidationSchema,
} from "@/validations/schemas/inventory/inventoryProduct.validation";
import { revalidatePath } from "next/cache";

export async function editProduct(
  data: TUpdateProductValidation,
): Promise<ServerAction | TErrorHandler> {
  try {
    const { id, name, ...otherFields } =
      await updateProductValidationSchema.parseAsync(data);
    const companyId = await getCompanyId();
    const result = await db.$transaction(async (tx) => {
      const existingProduct = await tx.inventoryProduct.findFirst({
        where: {
          name,
          companyId,
          type: otherFields.type,
          NOT: { id },
        },
      });

      if (existingProduct) {
        throw {
          type: "error",
          message:
            otherFields.type === "Supply"
              ? "Same name supply already exists"
              : "Same name product already exists",
          field: "productName",
        };
      }

      // Update product
      const updatedProduct = await tx.inventoryProduct.update({
        where: { id },
        data: { name, ...otherFields },
      });

      return updatedProduct;
    });

    // Send notification outside transaction if it's not critical
    if (result.lowInventoryAlert && result.quantity !== undefined) {
      await lowInventoryNotification({
        companyId,
        lowInventoryAlert: Number(result.lowInventoryAlert),
        currentQuantity: Number(result.quantity) || 0,
        productName: result.name,
        productId: result.id,
      });
    }

    revalidatePath("/inventory");
    return {
      type: "success",
      data: result,
    };
  } catch (error) {
    return errorHandler(error);
  }
}
