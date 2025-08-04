"use server";

import { createProduct } from "@/actions/inventory/create";
import { authOptions } from "@/authOptions";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";
import { materialCreateValidationSchema } from "@/validations/schemas/estimate/material/material.validation";
import { InventoryProduct, Material, Tag } from "@prisma/client";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

export async function newMaterial({
  name,
  categoryId,
  vendorId,
  tags,
  notes,
  quantity,
  cost,
  sell,
  discount,
  addToInventory,
}: {
  name: string;
  categoryId?: number;
  vendorId?: number;
  tags?: Tag[];
  notes?: string;
  quantity?: number;
  cost?: number;
  sell?: number;
  discount?: number;
  addToInventory?: boolean;
}): Promise<ServerAction | TErrorHandler> {
  try {
    const session = await getServerSession(authOptions);
    const companyId = session?.user.companyId;

    if (!companyId) {
      throw new Error("Company ID is required to create an email template.");
    }
    let newMaterial: Material | InventoryProduct | null = null;
    let newMaterialTags: { tag: Tag }[] = [];
    const validatedNewMaterialData =
      await materialCreateValidationSchema.parseAsync({
        name,
        categoryId,
        vendorId,
        notes,
        quantity,
        tags,
        cost,
        sell,
        discount,
        addToInventory,
      });

    const materialData = {
      name: validatedNewMaterialData.name,
      categoryId: validatedNewMaterialData.categoryId,
      vendorId: validatedNewMaterialData.vendorId,
      notes: validatedNewMaterialData.notes,
      quantity: validatedNewMaterialData.quantity,
      cost: validatedNewMaterialData.cost,
      sell: validatedNewMaterialData.sell,
      discount: validatedNewMaterialData.discount,
      companyId,
    };

    if (addToInventory) {
      const res = await createProduct({
        name: validatedNewMaterialData.name,
        categoryId: validatedNewMaterialData.categoryId,
        vendorId: validatedNewMaterialData.vendorId,
        description: validatedNewMaterialData.notes,
        quantity: validatedNewMaterialData.quantity?.toString() || "1",
        price: validatedNewMaterialData.cost || 0,
        type: "Product",
      });

      if (res.type === "success") {
        newMaterial = await db.material.create({
          data: {
            ...materialData,
            productId: res.data.id,
          },
        });
      } else {
        return res;
      }
    } else {
      newMaterial = await db.material.create({
        data: materialData,
      });
    }

    // create inventory tags
    if (tags && newMaterial) {
      if (addToInventory) {
        await Promise.all(
          tags.map(async (tag) => {
            const result = await db.inventoryProductTag.create({
              data: {
                inventoryId: newMaterial?.productId as number,
                tagId: tag.id,
              },
            });
          }),
        );

        newMaterialTags = await db.inventoryProductTag.findMany({
          where: {
            inventoryId: newMaterial?.id,
          },
          include: { tag: true },
        });
      } else {
        await Promise.all(
          tags.map(async (tag) => {
            await db.materialTag.create({
              data: {
                materialId: newMaterial?.id,
                tagId: tag.id,
              },
            });
          }),
        );

        newMaterialTags = await db.materialTag.findMany({
          where: {
            materialId: newMaterial?.id,
          },
          include: { tag: true },
        });
      }
    }

    revalidatePath("/estimate");

    return {
      type: "success",
      data: {
        ...newMaterial,
        tags: newMaterialTags.map((materialTag) => materialTag.tag),
      },
    };
  } catch (error) {
    return errorHandler(error);
  }
}
