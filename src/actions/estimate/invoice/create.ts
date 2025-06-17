"use server";

import { createTask } from "@/actions/task/createTask";
import { authOptions } from "@/authOptions";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { getProductWithQuantity } from "@/lib/getProductWithQuantity";
import { InspectionType } from "@/stores/estimate-create";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";
import { estimateCreateValidationSchema } from "@/validations/schemas/estimate/estimate.validation";
import {
  Coupon,
  InvoiceType,
  Labor,
  Material,
  Service,
  Tag,
} from "@prisma/client";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

/**
 * Creates a new invoice in the system
 * @param {Object} params - Invoice creation parameters
 * @returns {Promise<ServerAction | TErrorHandler>} Success response with invoice data or error
 */

type TCreateInvoiceProps = {
  invoiceId: string;
  type: InvoiceType;

  clientId?: number;
  vehicleId?: number;

  subtotal: number;
  discount: number;
  tax: number;
  serviceFee: number;
  deposit: number;
  depositNotes: string;
  depositMethod: string;
  grandTotal: number;
  due: number;

  internalNotes: string;
  terms: string;
  policy: string;
  customerNotes: string;
  customerComments: string;

  photos: string[];
  items: {
    service: Service | null;
    materials: ((Material & { tags: Tag[] }) | null)[];
    labor: (Labor & { tags: Tag[] }) | null;
    tags: Tag[];
  }[];

  tasks: { id: undefined | number; task: string }[];

  coupon?: Coupon | null;
  columnId?: number;
  inspections: InspectionType[];
  damageNotes: string | null;
};

export async function createInvoice({
  invoiceId,
  type,
  clientId,
  vehicleId,
  subtotal,
  discount,
  tax,
  serviceFee,
  deposit,
  depositNotes,
  depositMethod,
  grandTotal,
  due,

  internalNotes,
  terms,
  policy,
  customerNotes,
  customerComments,

  photos,
  items,
  tasks,

  coupon,
  columnId,
  inspections,
  damageNotes,
}: TCreateInvoiceProps): Promise<ServerAction | TErrorHandler> {
  try {
    // Step 1: Validate input data using Zod schema
    await estimateCreateValidationSchema.parseAsync({
      invoiceId,
      type,

      clientId,
      vehicleId,

      subtotal,
      discount,
      tax,
      serviceFee,
      deposit,
      depositNotes,
      depositMethod,
      grandTotal,
      due,

      internalNotes,
      terms,
      policy,
      customerNotes,
      customerComments,

      photos,
      items,
      tasks,

      coupon,
      columnId,
      inspections,
      damageNotes,
    });

    // Step 2: Get authenticated session and company ID
    const session = await getServerSession(authOptions);
    const companyId = session?.user.companyId;

    if (!companyId) {
      throw new Error("Company ID is required to create an email template.");
    }

    const invoice = await db.$transaction(async (db) => {
      // Step 3: Determine the column ID for invoice placement
      let finalColumnId = columnId;
      let isWorkOrder = false;

      if (!finalColumnId) {
        // If type is "Estimate", the column should be "Pending", otherwise, it should be "In Progress"
        if (type === "Estimate") {
          const defaultColumn = await db.column.findFirst({
            where: {
              title: "Pending",
              type: "shop",
              companyId,
            },
            select: {
              id: true,
            },
          });
          if (defaultColumn) {
            finalColumnId = defaultColumn.id;
          } else {
            throw new Error("Default column not found");
          }
        } else {
          const inProgressColumnId = await db.column.findFirst({
            where: {
              title: "In Progress",
              type: "shop",
              companyId,
            },
            select: {
              id: true,
            },
          });
          if (inProgressColumnId) {
            finalColumnId = inProgressColumnId.id;
            isWorkOrder = true;
          } else {
            throw new Error("In Progress column not found");
          }
        }
      } else {
        // Handle invoice type based on column
        // If the column is "In Progress", the invoice type should be "Invoice"
        const column = await db.column.findUnique({
          where: {
            id: finalColumnId,
          },
        });
        if (column) {
          type = column.title === "In Progress" ? "Invoice" : type;
          isWorkOrder = column.title === "In Progress";
        } else {
          throw new Error("Column not found to create invoice conversions");
        }
      }

      // Step 5: Calculate total cost from materials and labor
      const totalCost = items.reduce((acc, item) => {
        const materialCostPrice = item.materials.reduce(
          (acc, cur) => acc + Number(cur?.cost) * Number(cur?.quantity),
          0,
        );
        const laborCostPrice =
          Number(item.labor?.charge) * Number(item.labor?.hours);

        return acc + materialCostPrice + laborCostPrice;
      }, 0);

      // Step 6: Create the main invoice record
      const newInvoice = await db.invoice.create({
        data: {
          id: invoiceId,
          type,
          clientId,
          vehicleId,
          profit: grandTotal - totalCost,
          subtotal,
          discount,
          tax,
          serviceFee,
          deposit,
          grandTotal,
          due,
          internalNotes,
          terms,
          policy,
          customerNotes,
          customerComments,
          companyId,
          userId: session.user.id as any,
          columnId: finalColumnId,
          isWorkOrder,
          workOrderCreatedAt: isWorkOrder ? new Date() : null,
          convertedAt: new Date(),
          damageNotes,
        },
      });
      //for estimate creation mark
      // If it's an estimate, find the client's lead and update
      if (type === "Estimate" && clientId) {
        const theClient = await db.client.findUnique({
          where: { id: clientId },
        });
        if (theClient?.leadId) {
          await db.lead.update({
            where: { id: theClient.leadId },
            data: { isEstimateCreated: true },
          });
        }
      }
      //save the inspections
      // Step 7: Create the inspections records
      await Promise.all(
        inspections.map(async (inspection) => {
          return db.invoiceInspection.create({
            data: {
              invoiceId: newInvoice.id,
              title: inspection.title,
              driver: inspection.driver,
              passenger: inspection.passenger,
              notes: inspection.notes,
            },
          });
        }),
      );
      // Check if inventory product quantities are available when status is not "Pending"
      if (newInvoice.type === InvoiceType.Invoice) {
        // merge all the same products and sum the quantity
        let materials: Material[] = [];

        for (const item in items) {
          const itemMaterials = items[item].materials;

          if (itemMaterials) {
            // @ts-ignore
            materials = [...materials, ...itemMaterials];
          }
        }

        // Aggregate all materials to calculate total quantities for each product
        const productsWithQuantity = getProductWithQuantity(materials);

        await Promise.all(
          productsWithQuantity.map(async (product) => {
            if (!product.id) return;
            const findInventoryProduct = await db.inventoryProduct.findUnique({
              where: { id: product.id },
            });
            if (!findInventoryProduct) {
              return;
            }
            if (
              product.quantity > Number(findInventoryProduct?.quantity || 0)
            ) {
              throw new Error(
                `The quantity "${product.name}" is not enough in the inventory`,
              );
            }
            return null;
          }),
        );
      }

      // Step 7: Process and upload photos
      await Promise.all(
        photos.map(async (photo) => {
          return db.invoicePhoto.create({
            data: {
              invoiceId: newInvoice.id,
              photo,
            },
          });
        }),
      );

      // Step 8: Process invoice items (services, materials, labor, tags)
      const serviceIndex: (number | undefined)[] = [];
      await Promise.all(
        items.map(async (item) => {
          const service = item.service;
          serviceIndex.push(service?.id);
          const materials = item.materials;
          const labor = item.labor;
          const tags = item.tags;

          // Create new labor
          let laborId;
          if (labor) {
            const newLabor = await db.labor.create({
              data: {
                name: labor.name,
                categoryId: labor.categoryId,
                notes: labor.notes,
                hours: labor.hours,
                charge: labor.charge,
                discount: labor.discount,
                companyId,
              },
            });

            // Create labor tags
            await Promise.all(
              labor.tags.map(async (tag) => {
                return db.laborTag.create({
                  data: {
                    laborId: newLabor.id,
                    tagId: tag.id,
                  },
                });
              }),
            );

            laborId = newLabor.id;
          }

          // Create invoice item
          const invoiceItem = await db.invoiceItem.create({
            data: {
              invoiceId: newInvoice.id,
              serviceId: service?.id,
              laborId: laborId,
              serviceDesc: service?.description,
            },
          });

          // Create materials
          await Promise.all(
            materials.map(async (material) => {
              if (!material || !material.name) return;
              if (Number(material?.quantity || 0) <= 0) {
                throw new Error("Material quantity should be greater than 0");
              }
              // if (Number(material?.cost || 0) > Number(material?.sell || 0)) {
              //   throw new Error(
              //     "Material sell price should be greater than cost",
              //   );
              // }
              // Create material
              const newMat = await db.material.create({
                data: {
                  name: material.name,
                  vendorId: material.vendorId,
                  categoryId: material.categoryId,
                  notes: material.notes,
                  quantity: material.quantity,
                  cost: material.cost,
                  sell: material.sell,
                  discount: material.discount,
                  invoiceId: newInvoice.id,
                  companyId,
                  invoiceItemId: invoiceItem.id,
                  productId: material.productId,
                },
              });
              // Create material tag
              await Promise.all(
                material.tags.map(async (tag) => {
                  return db.materialTag.create({
                    data: {
                      materialId: newMat.id,
                      tagId: tag.id,
                    },
                  });
                }),
              );
              return null;
            }),
          );

          // Process tags
          await Promise.all(
            tags.map(async (tag) => {
              return db.itemTag.create({
                data: {
                  itemId: invoiceItem.id,
                  tagId: tag.id,
                },
              });
            }),
          );
        }),
      );

      await db.invoice.update({
        where: {
          id: newInvoice.id,
        },
        data: {
          serviceIndex: JSON.stringify(serviceIndex),
        },
      });

      // Step 10: Handle coupon redemption
      if (coupon) {
        await db.coupon.update({
          where: {
            id: coupon.id,
          },
          data: {
            redemptions: coupon.redemptions + 1,
          },
        });

        // Create client coupon
        await db.clientCoupon.create({
          data: {
            clientId: clientId!,
            couponId: coupon.id,
          },
        });
      }
      return newInvoice;
    });

    // Step 9: Create associated tasks
    await Promise.all(
      tasks.map(async (task) => {
        if (!task) return;

        const taskSplit = task.task.split(":");

        return createTask({
          title: taskSplit[0].trim(),
          description: taskSplit.length > 1 ? taskSplit[1].trim() : "",
          priority: "Medium",
          assignedUsers: [],
          invoiceId: invoice.id,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          clientId,
        });
      }),
    );

    // Step 12: Revalidate the estimate page
    revalidatePath("/estimate");

    // Return success response
    return {
      type: "success",
      data: invoice,
    };
  } catch (err) {
    // Error handling
    const formattedError = errorHandler(err);
    return formattedError;
  }
}
