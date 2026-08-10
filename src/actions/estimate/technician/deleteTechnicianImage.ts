"use server";

import { deleteObject } from "@/actions/s3/deleteObject";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";

import { revalidatePath } from "next/cache";

export async function deleteTechnicianImage(imageId: number) {
  if (!imageId || typeof imageId !== "number") {
    return { success: false, message: "Invalid Image Id provided" };
  }

  try {
    const image = await db.technicianImage.findUnique({
      where: { id: imageId },
      include: {
        technician: { select: { invoiceId: true } },
      },
    });

    if (!image) return { success: false, message: "Image not found" };

    // delete from s3
    try {
      if (image.fileUrl) {
        await deleteObject(image.fileUrl);
      }
    } catch (error) {
      console.error("Failed to delete image object from storage", error);
    }

    await db.technicianImage.delete({
      where: { id: imageId },
    });

    revalidatePath("/dashboard/estimate/workorder");
    revalidatePath(
      `/dashboard/estimate/invoices/${image?.technician.invoiceId}`,
    );
  } catch (error) {
    console.error(error);
    return errorHandler(error);
  }

  return { success: true, message: "Image successfully deleted" };
}
