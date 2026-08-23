"use server";

import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { Tag } from "@prisma/client";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

export async function updateLabor({
  id,
  name,
  categoryId,
  tags,
  notes,
  hours,
  charge,
  discount,
}: {
  id: number;
  name: string;
  categoryId?: number | null;
  tags?: Tag[];
  notes?: string | null;
  hours?: number;
  charge?: number;
  discount?: number;
}) {
  try {
    const session = await getServerSession(authOptions);
    const companyId = session?.user.companyId;

    await db.labor.findFirst({
      where: {
        name: {
          equals: name,
        },
        companyId,
        cannedLabor: true,
      },
    });

    const updatedLabor = await db.labor.update({
      where: { id },
      data: {
        name,
        categoryId,
        charge,
        notes,
        hours,
        discount,
      },
    });

    // delete all labor tags
    await db.laborTag.deleteMany({
      where: {
        laborId: id,
      },
    });

    // create labor tags
    if (tags) {
      await Promise.all(
        tags.map((tag) =>
          db.laborTag.create({
            data: {
              laborId: id,
              tagId: tag.id,
            },
          }),
        ),
      );
    }

    const updatedLaborTags = await db.laborTag.findMany({
      where: {
        laborId: id,
      },
      include: {
        tag: true,
      },
    });

    revalidatePath("/dashboard/estimate", "layout");

    return {
      success: true,
      data: {
        ...updatedLabor,
        tags: updatedLaborTags.map((tag) => tag.tag),
      },
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message ?? "Failed to update labor",
    };
  }
}
