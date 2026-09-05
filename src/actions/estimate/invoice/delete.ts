"use server";

import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";
import { revalidatePath } from "next/cache";
import { updateInventoryOnInvoiceDelete } from "./updateInventory";
import { InvoiceType } from "@prisma/client";

type TDeleteInvoiceProps = {
  id: string;
  replenishInventory: boolean;
};

export async function deleteInvoice({
  id,
  replenishInventory = false,
}: TDeleteInvoiceProps): Promise<ServerAction | TErrorHandler> {
  try {
    const previousInvoice = await db.$transaction(async (db) => {
      const findInvoice = await db.invoice.findUnique({
        where: {
          id,
        },
        include: {
          client: true,
        },
      });
      if (!findInvoice) {
        throw new Error("Invoice not found");
      }
      const materials = await db.material.findMany({
        where: {
          invoiceId: id,
          // productId not null
          productId: { not: null },
        },
      });

      const productsWithQuantity =
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

      if (
        productsWithQuantity.length > 0 &&
        replenishInventory &&
        findInvoice.type === InvoiceType.Invoice
      ) {
        // replenish inventory
        await updateInventoryOnInvoiceDelete({
          productsWithQuantity,
          invoiceId: id,
        });
      }

      // Technician rows require an invoiceId with no cascade, and InvoiceRedo
      // rows require a technicianId with no cascade, so both must be cleared
      // before the invoice can be deleted or P2003 is thrown.
      await db.invoiceRedo.deleteMany({ where: { invoiceId: id } });
      await db.technician.deleteMany({ where: { invoiceId: id } });

      // Tasks belong to their invoice — they must not outlive it. The FK now
      // cascades too, but deleting here keeps the behaviour correct on any
      // database where that migration has not been applied yet.
      await db.task.deleteMany({ where: { invoiceId: id } });

      const deletedInvoice = await db.invoice.delete({
        where: {
          id,
        },
      });
      // Update the isEstimateCreated field to false in the Lead table
      if (findInvoice.client?.leadId) {
        await db.lead.updateMany({
          where: {
            id: findInvoice.client.leadId,
          },
          data: {
            isEstimateCreated: false,
          },
        });
      }
      return deletedInvoice;
    });

    revalidatePath("/estimate");

    return {
      type: "success",
      data: {
        type: previousInvoice.type,
      },
    };
  } catch (err) {
    return errorHandler(err);
  }
}
