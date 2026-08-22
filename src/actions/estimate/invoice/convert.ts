"use server";

import getProductByInvoiceId from "@/actions/common/getProductByInvoiceId";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { lowInventoryNotification } from "@/lib/notification/inventory-notify";
import { sendInvoiceConvertedNotification } from "@/lib/notification/invoice-notify";
import { updateInvoiceAutomationTrigger } from "@/service/invoice-automation-trigger/api";
import { updateTagAutomationTrigger } from "@/service/tag-automation-trigger/api";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";
import { InvoiceType } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function convertInvoice(
  id: string,
  companyId?: number,
  allowInsufficientInventory: boolean = false,
): Promise<ServerAction | TErrorHandler> {
  try {
    let cId = companyId;

    if (!cId) {
      cId = await getCompanyId();
    }

    const txResult = await db.$transaction(async (db) => {
      const invoice = await db.invoice.findUnique({
        where: { id },
        include: {
          client: true,
        },
      });

      if (!invoice) {
        return { type: "error" as const, message: "Invoice not found" };
      }

      if (invoice.type === "Estimate" && !invoice.columnId) {
        const pendingColumnId = await db.column.findFirst({
          where: {
            companyId: cId,
            title: "Pending",
            type: "shop",
          },
        });
        if (pendingColumnId) {
          await db.invoice.update({
            where: { id },
            data: {
              columnId: pendingColumnId?.id,
            },
          });
        }
      }

      // merge all the same products and sum the quantity
      const productsWithQuantity = await getProductByInvoiceId(id);

      const updatedInvoiceData = await db.invoice.update({
        where: { id },
        data: {
          type: invoice.type === "Estimate" ? "Invoice" : "Estimate",
          convertedAt: new Date(),
        },
      });

      if (updatedInvoiceData && updatedInvoiceData?.clientId) {
        const client = await db.client.findUnique({
          where: {
            id: updatedInvoiceData?.clientId,
          },
        });

        const column = await db.column.findFirst({
          where: {
            title: "Converted",
            type: "sales",
            companyId: client?.companyId,
          },
        });

        if (client?.leadId && column) {
          const existingLead = await db.lead.findFirst({
            where: {
              id: client?.leadId,
            },
          });
          const lead = await db.lead.update({
            where: {
              id: client?.leadId,
            },
            data: {
              columnId: column.id,
              columnChangedAt: new Date(),
            },
          });
        }
      }

      const inventoryNotifications: {
        companyId: number | undefined;
        lowInventoryAlert: number;
        currentQuantity: number;
        productName: string;
        productId: number;
      }[] = [];

      await Promise.all(
        productsWithQuantity.map(async (product) => {
          // NOTE: if its Estimate -> Invoice, we should create a new history entry
          // if its Invoice -> Estimate, we should remove the history entry
          const findInventoryProduct = await db.inventoryProduct.findUnique({
            where: {
              id: product.id,
            },
          });

          if (!findInventoryProduct) return;

          if (
            updatedInvoiceData.type === InvoiceType.Invoice &&
            product.quantity > Number(findInventoryProduct.quantity || 0) &&
            !allowInsufficientInventory
          ) {
            throw new Error(
              `The quantity of "${product.name}" is not enough in the inventory, You need ${product.quantity} but only have ${findInventoryProduct.quantity} quantity`,
            );
          }

          if (updatedInvoiceData.type === InvoiceType.Invoice) {
            await db.inventoryProductHistory.create({
              data: {
                companyId: cId,
                productId: product.id,
                date: new Date(),
                quantity: product.quantity,
                price: (
                  Number(product?.totalSellPrice ?? 0) / product.quantity
                ).toFixed(2),
                vendorId: productsWithQuantity.find((m) => m.id === product.id)
                  ?.vendorId,
                type: "Sale",
                invoiceId: id,
              },
            });
          } else {
            await db.inventoryProductHistory.deleteMany({
              where: {
                companyId: cId,
                invoiceId: id,
                productId: product.id,
                type: "Sale",
              },
            });
          }

          // NOTE: if its Estimate -> Invoice, we should decrement the quantity
          // if its Invoice -> Estimate, we should increment the quantity
          const updatedInventoryProduct = await db.inventoryProduct.update({
            where: {
              id: product.id,
            },
            data: {
              quantity: {
                increment:
                  updatedInvoiceData.type === InvoiceType.Invoice
                    ? -product.quantity
                    : product.quantity,
              },
            },
          });

          // queue low inventory notification to send after the transaction commits
          inventoryNotifications.push({
            companyId: cId,
            lowInventoryAlert: updatedInventoryProduct.lowInventoryAlert || 0,
            currentQuantity: Number(updatedInventoryProduct.quantity) || 0,
            productName: updatedInventoryProduct.name,
            productId: updatedInventoryProduct.id,
          });

          return updatedInventoryProduct;
        }),
      );

      const clientName = invoice.client?.firstName || "Client";

      return {
        type: "success" as const,
        invoice: updatedInvoiceData,
        clientName,
        inventoryNotifications,
      };
    });

    if (txResult.type === "error") {
      return txResult;
    }

    const {
      invoice: updatedInvoiceData,
      clientName,
      inventoryNotifications,
    } = txResult;

    // Fire side effects only after the transaction has committed successfully,
    // so a later rollback can't leave a notification/automation-trigger sent
    // for a conversion that never actually persisted.
    updateInvoiceAutomationTrigger({
      companyId: updatedInvoiceData?.companyId!,
      invoiceId: updatedInvoiceData?.id!,
      columnId: updatedInvoiceData?.columnId!,
      type: updatedInvoiceData?.type!,
    }).catch((err) =>
      console.error("updateInvoiceAutomationTrigger failed", err),
    );

    updateTagAutomationTrigger({
      columnId: updatedInvoiceData?.columnId!,
      companyId: updatedInvoiceData?.companyId!,
      pipelineType: "SHOP",
      conditionType: "post_tag",
      invoiceId: updatedInvoiceData?.id!,
    }).catch((err) => console.error("updateTagAutomationTrigger failed", err));

    for (const payload of inventoryNotifications) {
      lowInventoryNotification(payload).catch((err) =>
        console.error("lowInventoryNotification failed", err),
      );
    }

    if (updatedInvoiceData.type == "Invoice") {
      // send invoice converted notification to all admins and managers or sales
      sendInvoiceConvertedNotification({
        clientName,
        companyId: cId,
        invoiceId: updatedInvoiceData.id,
        invoiceType: updatedInvoiceData.type,
      }).catch((err) =>
        console.error("sendInvoiceConvertedNotification failed", err),
      );
    }

    try {
      revalidatePath("/estimate");
      revalidatePath("/dashboard/estimate");
      revalidatePath(`/dashboard/estimate/view/${id}`);
    } catch {
      // no-op: best-effort when called from worker context
    }

    return {
      type: "success",
      message: "Invoice converted",
      data: updatedInvoiceData,
    };
  } catch (err) {
    return errorHandler(err);
  }
}
