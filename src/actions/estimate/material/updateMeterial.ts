"use server";

import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";
import { updateMaterialValidationSchema } from "@/validations/schemas/estimate/material/material.validation";
import { Tag } from "@prisma/client";

export async function updateMeterial({
  id,
  name,
  categoryId,
  vendorId,
  tags,
  notes,
  quantity,
  cost,
  sell,
  discount,
}: {
  id: number;
  name: string;
  categoryId?: number;
  vendorId?: number;
  tags?: Tag[];
  notes?: string;
  quantity?: number;
  cost?: number;
  sell?: number;
  discount?: number;
}): Promise<ServerAction | TErrorHandler> {
  try {
    await updateMaterialValidationSchema.parseAsync({
      id,
      name,
      categoryId,
      vendorId,
      tags,
      notes,
      quantity,
      cost,
      sell,
      discount,
    });
    const updatedMaterial = await db.material.update({
      where: { id },
      data: {
        name,
        categoryId,
        vendorId,
        notes,
        quantity,
        cost,
        sell,
        discount,
      },
    });

    // delete all material tags
    await db.materialTag.deleteMany({
      where: {
        materialId: id,
      },
    });

    // create material tags
    if (tags) {
      await Promise.all(
        tags.map((tag) =>
          db.materialTag.create({
            data: {
              materialId: id,
              tagId: tag.id,
            },
          }),
        ),
      );
    }
    // return the material with tags
    const updatedMaterialTags = await db.materialTag.findMany({
      where: {
        materialId: id,
      },
      include: { tag: true },
    });

    return {
      type: "success",
      data: {
        ...updatedMaterial,
        tags: updatedMaterialTags.map((materialTag) => materialTag.tag),
      },
    };
  } catch (error) {
    return errorHandler(error);
  }
}
