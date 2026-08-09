"use server";

import { db } from "@/lib/db";
import { getProductWithQuantity } from "@/lib/getProductWithQuantity";
import { lowInventoryNotification } from "@/lib/notification/inventory-notify";
import { InvoiceType, Material } from "@prisma/client";

type TUpdateInventoryProps = {
  invoiceId: string;
  companyId: number;
  materials: Material[];
};

// this function is used to update the inventory when the invoice is updated and create sales history
// this function only call when this estimate already converted to invoice
// this function first check unused material in invoice if find this remove and return to the inventory
// or compare previous quantity with new quantity and update the inventory
export async function updateInventoryOrCreateHistory({
  invoiceId,
  companyId,
  materials,
}: TUpdateInventoryProps) {
  try {
    await db.$transaction(async (db) => {
      // get previous product
      // Unused service material history remove and return to the inventory
      const productsWithQuantity = getProductWithQuantity(materials);

      // find unused materials in invoice
      const findUnUsedMaterialsInInvoice = await db.material.findMany({
        where: {
          invoiceId: invoiceId,
          OR: [
            {
              productId: {
                notIn: materials
                  .filter((p) => p?.productId)
                  .map((product) => product?.productId!),
              },
            },
            {
              invoiceItemId: {
                notIn: materials
                  .filter((p) => p?.invoiceItemId)
                  .map((product) => product?.invoiceItemId!),
              },
            },
          ],
        },
      });

      // unused materials in invoice removed and unused materials quantity added to inventory
      const inventoryHistoryIds = await Promise.all(
        findUnUsedMaterialsInInvoice.map(async (material) => {
          if (!material.productId) return;
          await db.inventoryProduct.update({
            where: {
              id: material.productId,
            },
            data: {
              quantity: {
                increment: Number(material.quantity || 0), // increment the quantity
              },
            },
          });

          // remove the history entry
          const findInventoryProductHistory =
            await db.inventoryProductHistory.findFirst({
              where: {
                companyId: companyId,
                productId: material.productId,
                type: "Sale",
                invoiceId: invoiceId,
              },
            });

          await db.material.delete({
            where: {
              id: material.id,
            },
          });

          return findInventoryProductHistory?.id;
        }),
      );

      const uniqueInventoryHistoryIds = Array.from(
        new Set(inventoryHistoryIds.filter(Boolean)),
      );

      await Promise.all(
        uniqueInventoryHistoryIds.map(async (id) => {
          await db.inventoryProductHistory.delete({
            where: { id: id! },
          });
        }),
      );

      // update or remove inventory product
      await Promise.all(
        productsWithQuantity.map(async (product) => {
          if (!product.id) return;

          const inventoryProduct = await db.inventoryProduct.findUnique({
            where: {
              id: product.id,
            },
          });

          if (!inventoryProduct) {
            return;
          }

          // const newQuantity = Math.abs(
          //   inventoryProduct.quantity - product.quantity,
          // );

          const oldMaterials = await db.material.findMany({
            where: {
              invoiceId: invoiceId,
              productId: product.id,
            },
          });

          const oldQuantity = oldMaterials?.reduce(
            (acc: number, material: Material) => {
              return acc + (Number(material.quantity) || 0);
            },
            0,
          );

          const diffQuantity = oldQuantity - product.quantity;

          let updatedQuantity = Number(inventoryProduct.quantity || 0);
          if (diffQuantity >= 0) {
            updatedQuantity = updatedQuantity + diffQuantity;
          } else if (diffQuantity <= 0) {
            updatedQuantity = updatedQuantity - Math.abs(diffQuantity);
          }

          //  low inventory check
          if (updatedQuantity <= 0) {
            throw new Error(
              `The quantity of "${product.name}" is not enough in the inventory`,
            );
          }

          // Update the history quantity
          // TODO: when update invoice this get me a prisma error
          const findInventoryProductHistory =
            await db.inventoryProductHistory.findFirst({
              where: {
                companyId: companyId,
                productId: inventoryProduct.id,
                type: "Sale",
                invoiceId: invoiceId,
              },
            });
          // inventory sales history create or update
          // if (type === "Invoice") {
          if (findInventoryProductHistory) {
            await db.inventoryProductHistory.update({
              where: {
                id: findInventoryProductHistory.id,
              },
              data: {
                quantity: product.quantity,
                price: (
                  Number(product?.totalSellPrice ?? 0) / product.quantity
                ).toFixed(2),
              },
            });
          } else {
            await db.inventoryProductHistory.create({
              data: {
                companyId: companyId,
                productId: inventoryProduct.id,
                quantity: product.quantity,
                price: (
                  Number(product?.totalSellPrice ?? 0) / product.quantity
                ).toFixed(2),
                type: "Sale",
                invoiceId: invoiceId,
              },
            });
          }

          // Update the inventoryProduct quantity
          const updatedProduct = await db.inventoryProduct.update({
            where: {
              id: product.id,
            },
            data: {
              quantity: updatedQuantity,
            },
          });

          await lowInventoryNotification({
            companyId,
            lowInventoryAlert: updatedProduct.lowInventoryAlert || 0,
            currentQuantity: Number(updatedProduct.quantity) || 0,
            productName: updatedProduct.name,
            productId: updatedProduct.id,
          });
        }),
      );
    });
  } catch (err) {
    throw err;
  }
}

// this function is used to update the inventory when the estimate is converted to invoice
// there are no comparison between previous quantity and new quantity
// this function only update the inventory and create sales history
type updateInventoryOnEstimateConversionProps = {
  productsWithQuantity: {
    id: number;
    name: string;
    quantity: number;
    sell?: number;
    totalSellPrice?: number;
    vendorId?: number;
  }[];
  invoiceId: string;
  companyId: number;
};
export async function updateInventoryOnEstimateConversion({
  productsWithQuantity,
  invoiceId,
  companyId,
}: updateInventoryOnEstimateConversionProps) {
  try {
    // Collect updated products outside the transaction so lowInventoryNotification
    // doesn't hold the DB connection open while doing its own getUsersByRole query.
    const updatedProducts: {
      lowInventoryAlert: number | null;
      quantity: unknown;
      name: string;
      id: number;
    }[] = [];

    await db.$transaction(async (db) => {
      const findInvoice = await db.invoice.findUnique({
        where: { id: invoiceId },
      });

      if (!findInvoice) {
        throw new Error("Invoice not found");
      }
      await Promise.all(
        productsWithQuantity.map(async (product) => {
          if (!product.id) return;
          const findInventoryProduct = await db.inventoryProduct.findUnique({
            where: { id: product.id },
          });

          if (!findInventoryProduct) {
            return;
          }
          const findProductHistory = await db.inventoryProductHistory.findFirst(
            {
              where: {
                companyId: companyId,
                productId: product.id,
                type: "Sale",
                invoiceId,
              },
            },
          );

          // if find inventory product history first delete it or not find to create a new inventory product history
          if (findProductHistory) {
            await db.inventoryProductHistory.delete({
              where: {
                id: findProductHistory.id,
              },
            });
          } else {
            await db.inventoryProductHistory.create({
              data: {
                companyId: companyId,
                productId: findInventoryProduct.id,
                quantity: product.quantity,
                price: (
                  Number(product?.totalSellPrice ?? 0) / product.quantity
                ).toFixed(2),
                type: "Sale",
                invoiceId,
              },
            });
          }
          if (product.quantity > Number(findInventoryProduct?.quantity || 0)) {
            throw new Error(
              `The quantity "${product.name}" is not enough in the inventory`,
            );
          }
          // update the inventory product quantity
          const updatedProduct = await db.inventoryProduct.update({
            where: {
              id: product.id,
            },
            data: {
              quantity: {
                decrement: product.quantity,
              },
            },
          });

          updatedProducts.push(updatedProduct);
        }),
      );
    });

    // Run low-inventory notifications after the transaction commits so they
    // don't hold the DB connection open during getUsersByRole queries.
    await Promise.all(
      updatedProducts.map((updatedProduct) =>
        lowInventoryNotification({
          companyId,
          lowInventoryAlert: updatedProduct.lowInventoryAlert || 0,
          currentQuantity: Number(updatedProduct.quantity) || 0,
          productName: updatedProduct.name,
          productId: updatedProduct.id,
        }),
      ),
    );
  } catch (err) {
    throw err;
  }
}

type TUpdateInventoryOnDelete = {
  productsWithQuantity: {
    id: number;
    name: string;
    quantity: number;
  }[];
  invoiceId: string;
};

// this function is used to update the inventory when the invoice is deleted
export async function updateInventoryOnInvoiceDelete({
  productsWithQuantity,
  invoiceId,
}: TUpdateInventoryOnDelete) {
  try {
    await db.$transaction(async (db) => {
      await Promise.all(
        productsWithQuantity.map(async (product) => {
          if (!product.id) return;
          const findInventoryProduct = await db.inventoryProduct.findUnique({
            where: { id: product.id },
          });
          if (!findInventoryProduct) {
            return;
          }
          const findProductHistory = await db.inventoryProductHistory.findFirst(
            {
              where: {
                companyId: findInventoryProduct.companyId,
                productId: product.id,
                type: "Sale",
                invoiceId,
              },
            },
          );
          // if find inventory product history first delete it or not find to create a new inventory product history
          if (findProductHistory) {
            await db.inventoryProductHistory.delete({
              where: {
                id: findProductHistory.id,
              },
            });
          }
          // update the inventory product quantity
          await db.inventoryProduct.update({
            where: {
              id: product.id,
            },
            data: {
              quantity: {
                increment: product.quantity,
              },
            },
          });
        }),
      );
    });
  } catch (err) {
    throw err;
  }
}

// update then inventory product quantity when invoice are create
type TUpdateInventoryWhenInvoiceCreate = {
  items: any;
  invoiceId: string;
  invoiceType: InvoiceType;
  companyId: number;
};

export async function updateInventoryWhenInvoiceCreate({
  items,
  invoiceType,
  invoiceId,
  companyId,
}: TUpdateInventoryWhenInvoiceCreate) {
  try {
    // step 11: check invoice status and then inventory update without status pending
    if (invoiceType === InvoiceType.Invoice) {
      // merge all the same products and sum the quantity
      let materials: Material[] = [];

      for (const item in items) {
        const itemMaterials = items[item].materials;

        if (itemMaterials) {
          // @ts-ignore
          materials = [...materials, ...itemMaterials];
        }
      }

      const productsWithQuantity = getProductWithQuantity(materials);

      await updateInventoryOnEstimateConversion({
        companyId,
        invoiceId,
        productsWithQuantity,
      });
    }
  } catch (err) {
    throw err;
  }
}
