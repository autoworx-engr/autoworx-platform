"use server";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import getUser from "@/lib/getUser";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";
import {
  createProductValidationSchema,
  TCreateProductValidation,
} from "@/validations/schemas/inventory/inventoryProduct.validation";
import { revalidatePath } from "next/cache";

export async function createProduct(
  data: TCreateProductValidation,
): Promise<ServerAction | TErrorHandler> {
  try {
    const user = await getUser();
    const companyId = await getCompanyId();
    const validatedData = await createProductValidationSchema.parseAsync(data);
    if (validatedData.isDatabase === true && validatedData.categoryName) {
      const checkCategory = await db.category.findMany({
        where: {
          companyId,
          name: validatedData?.categoryName,
        },
      });

      if (checkCategory.length === 0) {
        let newCategory = await db.category.create({
          data: {
            companyId,
            name: validatedData?.categoryName,
          },
        });

        validatedData.categoryId = newCategory.id;
      } else {
        validatedData.categoryId = checkCategory[0].id;
      }
    }

    const result = await db.$transaction(async (tx) => {
      const existingProduct = await tx.inventoryProduct.findFirst({
        where: {
          name: validatedData.name,
          companyId,
          type: validatedData.type,
        },
      });
      if (existingProduct) {
        throw new Error(
          validatedData.type === "Supply"
            ? "Supply already exists"
            : "Product already exists",
        );
      }

      const { categoryName, isDatabase, ...productData } = validatedData;
      const newProduct = await tx.inventoryProduct.create({
        data: {
          ...productData,
          companyId,
          userId: user.id,
        },
      });
      await tx.inventoryProductHistory.create({
        data: {
          companyId,
          productId: newProduct.id,
          date: new Date(),
          quantity: Number(newProduct.quantity) || 1,
          type: "Purchase",
          price: newProduct.price,
          vendorId: newProduct.vendorId ? newProduct.vendorId : null,
        },
      });
      return newProduct;
    });

    revalidatePath("/inventory");
    return {
      type: "success",
      data: result,
    };
  } catch (error) {
    return errorHandler(error);
  }
}
