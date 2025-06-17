"use server";

import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";
// import { Tag } from "@prisma/client";
import { authOptions } from "@/authOptions";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { TErrorHandler } from "@/types/globalError";
import {
  laborCreateValidationSchema,
  TLaborCreateValidationSchema,
} from "@/validations/schemas/estimate/labor/labor.validation";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

export async function newLabor({
  name,
  categoryId,
  tags,
  notes,
  hours,
  charge,
  discount,
  cannedLabor,
}: TLaborCreateValidationSchema): Promise<ServerAction | TErrorHandler> {
  try {
    const session = await getServerSession(authOptions);
    const companyId = session?.user.companyId;

    if (!companyId) {
      throw new Error("Company ID is required");
    }

    const validatedLaborData = await laborCreateValidationSchema.parseAsync({
      name,
      categoryId,
      tags,
      notes,
      hours,
      charge,
      discount,
      cannedLabor,
    });

    // Check if any labor exists with the same name
    const existingLabor = await db.labor.findFirst({
      where: {
        name: {
          equals: validatedLaborData.name,
        },
        companyId,
        cannedLabor: true,
      },
    });

    if (existingLabor) {
      throw Error("Labor with the same name already exists");
    }

    const newLabor = await db.labor.create({
      data: {
        name: validatedLaborData.name,
        categoryId: validatedLaborData.categoryId,
        notes: validatedLaborData.notes,
        hours: validatedLaborData.hours,
        charge: validatedLaborData.charge,
        discount: validatedLaborData.discount,
        companyId: companyId,
        cannedLabor: validatedLaborData.cannedLabor,
      },
    });

    // create labor tags
    if (tags) {
      await Promise.all(
        tags.map(
          (tag) =>
            tag &&
            db.laborTag.create({
              data: {
                laborId: newLabor.id,
                tagId: tag.id,
              },
            }),
        ),
      );
    }

    const newLaborTags = await db.laborTag.findMany({
      where: {
        laborId: newLabor.id,
      },
      include: {
        tag: true,
      },
    });

    revalidatePath("/estimate");

    return {
      type: "success",
      data: {
        ...newLabor,
        tags: newLaborTags.map((tag) => tag.tag),
      },
    };
  } catch (error) {
    return errorHandler(error);
  }
}
