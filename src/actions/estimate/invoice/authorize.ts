"use server";

import getProductByInvoiceId from "@/actions/common/getProductByInvoiceId";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { lowInventoryNotification } from "@/lib/notification/inventory-notify";
import {
  sendInvoiceAuthorizeNotification,
  sendInvoiceConvertedNotification,
} from "@/lib/notification/invoice-notify";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";
import { InvoiceType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { authorizedLeadsConvertion } from "./authorizedLeadsConvertion";

export async function authorizeInvoice(
  invoiceId: string,
  authorizedName: string,
  url: string,
  invoiceType: string,
): Promise<ServerAction | TErrorHandler> {
  try {
    const updatedInvoice = await db.invoice.update({
      where: {
        id: invoiceId,
      },
      data: {
        authorizedName,
        signatureImage: url,
        type: InvoiceType.Invoice,
        wasAuthorized: true,
        convertedAt: new Date(),
      },
    });

    const productsWithQuantity = await getProductByInvoiceId(invoiceId);
    const companyId = updatedInvoice.companyId;

    if (
      invoiceType === InvoiceType.Estimate &&
      updatedInvoice.type === InvoiceType.Invoice
    ) {
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

          if (product.quantity > Number(findInventoryProduct?.quantity ?? 0)) {
            // low inventory send notification to all admins and managers
            console.log("convert to estimate", invoiceId);
            await db.invoice.update({
              where: {
                id: invoiceId,
              },
              data: {
                type: InvoiceType.Estimate,
              },
            });

            await lowInventoryNotification({
              companyId,
              lowInventoryAlert: product.quantity || 0,
              currentQuantity: Number(findInventoryProduct.quantity) || 0,
              description: `Authorized estimate ${updatedInvoice.id} conversation failed, Item ${product.name} is low in stock. Restock in Autoworx.`,
              productName: product.name,
              productId: product.id,
            });

            throw new Error(
              `The quantity of "${product.name}" is not enough in the inventory, You need ${product.quantity} but only have ${findInventoryProduct.quantity} quantity`,
            );
          }
          await db.inventoryProductHistory.create({
            data: {
              companyId,
              productId: product.id,
              date: new Date(),
              quantity: product.quantity,
              price: (
                Number(product?.totalSellPrice ?? 0) / product.quantity
              ).toFixed(2),
              vendorId: productsWithQuantity.find((m) => m.id === product.id)
                ?.vendorId,
              type: "Sale",
              invoiceId,
            },
          });
          await db.inventoryProduct.update({
            where: {
              id: product.id,
            },
            data: {
              quantity: {
                decrement: product.quantity,
              },
            },
          });
        }),
      );
    }

    let clientName;
    if (updatedInvoice.clientId) {
      const res = await db.client.findUnique({
        where: {
          id: updatedInvoice.clientId,
        },
        select: {
          firstName: true,
        },
      });
      clientName = res?.firstName || "Client";
    } else {
      clientName = "Client";
    }

    if (updatedInvoice.type === "Invoice") {
      // send notification to all admins and managers or sales when invoice is authorized
      sendInvoiceAuthorizeNotification({
        invoiceId: updatedInvoice.id,
        authorizedName,
        companyId: updatedInvoice.companyId,
        clientName,
      }).catch((err) =>
        console.error("sendInvoiceAuthorizeNotification failed", err),
      );
      sendInvoiceConvertedNotification({
        invoiceId: updatedInvoice.id,
        clientName,
        companyId: updatedInvoice.companyId,
        invoiceType: updatedInvoice.type,
      }).catch((err) =>
        console.error("sendInvoiceConvertedNotification failed", err),
      );

      await authorizedLeadsConvertion(updatedInvoice.id);
      // await updateServiceAutomationTrigger({
      //   companyId: updatedInvoice?.companyId,
      //   estimateId: updatedInvoice?.id,
      //   columnId: updatedInvoice?.columnId!,
      // });
      // if authorized invoice automation trigger
      //  updateInvoiceAutomationTrigger({
      //   companyId: updatedInvoice?.companyId!,
      //   invoiceId: updatedInvoice?.id!,
      //   columnId: updatedInvoice?.columnId!,
      // });
    }

    revalidatePath("/estimate");
  } catch (err) {
    return errorHandler(err);
  } finally {
    return {
      type: "success",
    };
  }
}

export async function deleteInvoiceAuthorize(
  invoiceId: string,
): Promise<ServerAction | TErrorHandler> {
  try {
    await db.invoice.update({
      where: {
        id: invoiceId,
      },
      data: {
        authorizedName: null,
        signatureImage: null,
      },
    });

    revalidatePath("/estimate");

    return {
      type: "success",
    };
  } catch (err) {
    return errorHandler(err);
  }
}
