"use server";

import getProductByInvoiceId from "@/actions/common/getProductByInvoiceId";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { lowInventoryNotification } from "@/lib/notification/inventory-notify";
import { sendInvoiceConvertedNotification } from "@/lib/notification/invoice-notify";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";
import { InvoiceType } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function convertInvoice(
  id: string,
): Promise<ServerAction | TErrorHandler> {
  try {
    const companyId = await getCompanyId();

    const updatedInvoiceData = await db.$transaction(async (db) => {
      const invoice = await db.invoice.findUnique({
        where: { id },
        include: {
          client: true,
        },
      });

      if (!invoice) {
        return { type: "error", message: "Invoice not found" };
      }

      if (invoice.type === "Estimate" && !invoice.columnId) {
        const pendingColumnId = await db.column.findFirst({
          where: {
            companyId,
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
            product.quantity > Number(findInventoryProduct.quantity || 0)
          ) {
            throw new Error(
              `The quantity of "${product.name}" is not enough in the inventory, You need ${product.quantity} but only have ${findInventoryProduct.quantity} quantity`,
            );
          }

          if (updatedInvoiceData.type === InvoiceType.Invoice) {
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
                invoiceId: id,
              },
            });
          } else {
            await db.inventoryProductHistory.deleteMany({
              where: {
                companyId,
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

          // low inventory send notification to all admins and managers
          await lowInventoryNotification({
            companyId,
            lowInventoryAlert: updatedInventoryProduct.lowInventoryAlert || 0,
            currentQuantity: Number(updatedInventoryProduct.quantity) || 0,
            productName: updatedInventoryProduct.name,
            productId: updatedInventoryProduct.id,
          });

          return updatedInventoryProduct;
        }),
      );

      const clientName = invoice.client?.firstName || "Client";

      if (updatedInvoiceData.type === "Invoice") {
        // send invoice converted notification to all admins and managers or sales
        sendInvoiceConvertedNotification({
          clientName,
          companyId,
          invoiceId: updatedInvoiceData.id,
          invoiceType: updatedInvoiceData.type,
        });
      }

      return updatedInvoiceData;
    });

    revalidatePath("/estimate");

    return {
      type: "success",
      message: "Invoice converted",
      data: updatedInvoiceData,
    };
  } catch (err) {
    return errorHandler(err);
  }
}

export async function convertInvoicePublic(
  id: string,
  companyId: number,
): Promise<ServerAction | TErrorHandler> {
  try {
    const updatedInvoiceData = await db.$transaction(async (db) => {
      const invoice = await db.invoice.findUnique({
        where: { id },
        include: {
          client: true,
        },
      });

      if (!invoice) {
        return { type: "error", message: "Invoice not found" };
      }

      if (invoice.type === "Estimate" && !invoice.columnId) {
        const pendingColumnId = await db.column.findFirst({
          where: {
            companyId,
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
          type: InvoiceType.Invoice,
          convertedAt: new Date(),
        },
      });

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
            product.quantity > Number(findInventoryProduct.quantity || 0)
          ) {
            await lowInventoryNotification({
              companyId,
              lowInventoryAlert: product.quantity || 0,
              currentQuantity: Number(findInventoryProduct.quantity) || 0,
              description: `Authorized estimate ${updatedInvoiceData.id} conversation failed, Item ${product.name} is low in stock. Restock in Autoworx.`,
              productName: product.name,
              productId: product.id,
            });

            throw new Error(
              `The quantity of "${product.name}" is not enough in the inventory, You need ${product.quantity} but only have ${findInventoryProduct.quantity} quantity`,
            );
          }

          if (updatedInvoiceData.type === InvoiceType.Invoice) {
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
                invoiceId: id,
              },
            });
          } else {
            await db.inventoryProductHistory.deleteMany({
              where: {
                companyId,
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

          // low inventory send notification to all admins and managers
          await lowInventoryNotification({
            companyId,
            lowInventoryAlert: updatedInventoryProduct.lowInventoryAlert || 0,
            currentQuantity: Number(updatedInventoryProduct.quantity) || 0,
            productName: updatedInventoryProduct.name,
            productId: updatedInventoryProduct.id,
          });

          return updatedInventoryProduct;
        }),
      );

      const clientName = invoice.client?.firstName || "Client";

      if (updatedInvoiceData.type === "Invoice") {
        // send invoice converted notification to all admins and managers or sales
        sendInvoiceConvertedNotification({
          clientName,
          companyId,
          invoiceId: updatedInvoiceData.id,
          invoiceType: updatedInvoiceData.type,
        });
      }

      return updatedInvoiceData;
    });

    // revalidatePath("/estimate");

    return {
      type: "success",
      message: "Invoice converted",
      data: updatedInvoiceData,
    };
  } catch (err) {
    return errorHandler(err);
  }
}

// convert invoice for public
// export async function convertInvoicePublic(
//   id: string,
//   companyId: number,
// ): Promise<ServerAction> {
//   const invoice = await db.invoice.findUnique({
//     where: { id, companyId },
//   });

//   if (!invoice) {
//     return { type: "error", message: "Invoice not found" };
//   }

//   const updatedInvoiceData = await db.invoice.update({
//     where: { id },
//     data: {
//       type: invoice.type === "Estimate" ? "Invoice" : "Estimate",
//       convertedAt: new Date(),
//     },
//   });

//   if (invoice.type === "Estimate" && !invoice.columnId) {
//     const pendingColumnId = await db.column.findFirst({
//       where: {
//         companyId,
//         title: "Pending",
//         type: "shop",
//       },
//     });
//     if (pendingColumnId) {
//       await db.invoice.update({
//         where: { id },
//         data: {
//           columnId: pendingColumnId?.id,
//         },
//       });
//     }
//   }

//   // get all the product materials
//   const materials = await db.material.findMany({
//     where: {
//       invoiceId: id,
//       // productId not null
//       productId: { not: null },
//     },
//     include: {
//       vendor: true,
//     },
//   });

//   // merge all the same products and sum the quantity
//   const productsWithQuantity = getProductWithQuantity(materials);

//   await Promise.all(
//     productsWithQuantity.map(async (product) => {
//       // NOTE: if its Estimate -> Invoice, we should create a new history entry
//       // if its Invoice -> Estimate, we should remove the history entry
//       const findInventoryProduct = await db.inventoryProduct.findUnique({
//         where: {
//           id: product.id,
//         },
//       });

//       if (!findInventoryProduct) return;

//       if (
//         updatedInvoiceData.type === InvoiceType.Invoice &&
//         product.quantity > Number(findInventoryProduct.quantity || 0)
//       ) {
//         throw new Error(
//           `The quantity of "${product.name}" is not enough in the inventory, You need ${product.quantity} but only have ${findInventoryProduct.quantity} quantity`,
//         );
//       }

//       if (updatedInvoiceData.type === InvoiceType.Invoice) {
//         await db.inventoryProductHistory.create({
//           data: {
//             companyId,
//             productId: product.id,
//             date: new Date(),
//             quantity: product.quantity,
//             price: (
//               Number(product?.totalSellPrice ?? 0) / product.quantity
//             ).toFixed(2),
//             vendorId: productsWithQuantity.find((m) => m.id === product.id)
//               ?.vendorId,
//             type: "Sale",
//             invoiceId: id,
//           },
//         });
//       } else {
//         await db.inventoryProductHistory.deleteMany({
//           where: {
//             companyId,
//             invoiceId: id,
//             productId: product.id,
//             type: "Sale",
//           },
//         });
//       }

//       // NOTE: if its Estimate -> Invoice, we should decrement the quantity
//       // if its Invoice -> Estimate, we should increment the quantity
//       const updatedInventoryProduct = await db.inventoryProduct.update({
//         where: {
//           id: product.id,
//         },
//         data: {
//           quantity: {
//             increment:
//               updatedInvoiceData.type === InvoiceType.Invoice
//                 ? -product.quantity
//                 : product.quantity,
//           },
//         },
//       });

//       // low inventory send notification to all admins and managers
//       await lowInventoryNotification({
//         companyId,
//         lowInventoryAlert: updatedInventoryProduct.lowInventoryAlert || 0,
//         currentQuantity: updatedInventoryProduct.quantity || 0,
//         productName: updatedInventoryProduct.name,
//         productId: updatedInventoryProduct.id,
//       });

//       return updatedInventoryProduct;
//     }),
//   );

//   // TODO
//   // revalidatePath("/estimate");

//   return {
//     type: "success",
//     message: "Invoice converted",
//     // data: updatedInventoryProduct,
//   };
// }
