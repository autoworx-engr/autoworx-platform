"use server";

import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";
import { revalidatePath } from "next/cache";

type TDeleteInvoiceProps = {
  id: string;
};

export async function deleteEstimateTemplate({
  id,
}: TDeleteInvoiceProps): Promise<ServerAction | TErrorHandler> {
  try {
    const deletedEstimateTemplate = await db.$transaction(async (db) => {
      const findInvoice = await db.invoiceTemplate.findUnique({
        where: {
          id,
        },
      });
      if (!findInvoice) {
        throw new Error("Template not found");
      }
      const materials = await db.material.findMany({
        where: {
          invoiceTemplateId: id,
          productId: { not: null },
        },
      });

      materials && materials.length > 0
        ? materials.reduce(
            (
              acc: {
                id: number;
                name: string;
                invoiceItemId?: number | null;
                quantity: number;
              }[],
              material,
            ) => {
              const product = acc.find((p) => p?.id === material.productId);
              if (product) {
                if (material.quantity !== null) {
                  product.quantity += Number(material.quantity);
                }
              } else {
                acc.push({
                  id: material.productId as number,
                  name: material.name || "",
                  invoiceItemId: material.invoiceItemId,
                  quantity: Number(material.quantity) || 0,
                });
              }
              return acc;
            },
            [],
          )
        : [];

      await db.task.deleteMany({
        where: { invoiceTemplateId: id },
      });

      await db.templatePhoto.deleteMany({
        where: { invoiceTemplateId: id },
      });

      const deletedEstimateTemplate = await db.invoiceTemplate.delete({
        where: {
          id,
        },
      });

      return deletedEstimateTemplate;
    });

    revalidatePath("/estimate/templates");

    return {
      type: "success",
      data: deletedEstimateTemplate,
    };
  } catch (err) {
    return errorHandler(err);
  }
}
