"use server";

import { createTask } from "@/actions/task/createTask";
import { authOptions } from "@/authOptions";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { getProductWithQuantity } from "@/lib/getProductWithQuantity";
import { sendEstimateCreateNotification } from "@/lib/notification/invoice-notify";
import { updateInvoiceAutomationTrigger } from "@/service/invoice-automation-trigger/api";
import { updateServiceAutomationTrigger } from "@/service/service-maintenance-automation-trigger/api";
import { updateTagAutomationTrigger } from "@/service/tag-automation-trigger/api";
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
  vehicleExtraCost?: number;
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
  isShopBooking?: boolean;

  photos: { id?: number; photo?: string }[];
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

  forceCompanyId?: number;
  allowInsufficientInventory?: boolean;
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
  vehicleExtraCost,
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
  isShopBooking = false,

  forceCompanyId,
  allowInsufficientInventory = false,
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
      vehicleExtraCost,
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
      isShopBooking,
    });

    // Step 2: Get authenticated session and company ID
    let companyId = forceCompanyId;
    let session: Awaited<ReturnType<typeof getServerSession>> | null = null;

    if (!companyId) {
      session = await getServerSession(authOptions);
      companyId = (session as any)?.user?.companyId;
      if (!companyId) {
        throw new Error("Company ID is required to create an email template.");
      }
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
          vehicleExtraCost,
          deposit,
          grandTotal,
          due,
          internalNotes,
          terms,
          policy,
          customerNotes,
          customerComments,
          companyId,
          userId: (session as any)?.user?.id as any,
          columnId: finalColumnId,
          isWorkOrder,
          workOrderCreatedAt: isWorkOrder ? new Date() : null,
          convertedAt: new Date(),
          damageNotes,
          isShopBooking,
        },
        include: {
          client: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
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
      const inspectionsToSave = inspections.filter((inspection) => {
        const hasTitle =
          !!inspection.title && inspection.title.toString().trim() !== "";
        const hasFlags = !!inspection.driver || !!inspection.passenger;
        const hasNotes =
          !!inspection.notes && inspection.notes.toString().trim() !== "";
        return hasTitle || hasFlags || hasNotes;
      });

      if (inspectionsToSave.length > 0) {
        await Promise.all(
          inspectionsToSave.map(async (inspection) => {
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
      }
      // Check if inventory product quantities are available when status is not "Pending"
      if (
        newInvoice.type === InvoiceType.Invoice &&
        !allowInsufficientInventory
      ) {
        // merge all the same products and sum the quantity
        let materials: Material[] = [];

        for (const item in items) {
          const itemMaterials = items[item].materials;

          if (itemMaterials) {
            // filter out any null/undefined materials to ensure proper typing
            materials = [
              ...materials,
              ...(itemMaterials.filter(Boolean) as Material[]),
            ];
          }
        }

        // Aggregate all materials to calculate total quantities for each product
        const productsWithQuantity = getProductWithQuantity(materials);

        const productIds = productsWithQuantity
          .map((p) => p.id)
          .filter(Boolean) as number[];
        if (productIds.length > 0) {
          const dbProducts = await db.inventoryProduct.findMany({
            where: { id: { in: productIds } },
          });
          for (const product of productsWithQuantity) {
            if (!product.id) continue;
            const dbProduct = dbProducts.find((p) => p.id === product.id);
            if (
              dbProduct &&
              product.quantity > Number(dbProduct.quantity || 0)
            ) {
              throw new Error(
                `The quantity "${product.name}" is not enough in the inventory`,
              );
            }
          }
        }
      }

      // Step 7: Process and upload photos
      if (photos && photos.length > 0) {
        await db.invoicePhoto.createMany({
          data: photos.map((photo) => ({
            invoiceId: newInvoice.id,
            photo: photo.photo ?? "",
          })),
        });
      }

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
            if (labor.tags && labor.tags.length > 0) {
              await db.laborTag.createMany({
                data: labor.tags.map((tag) => ({
                  laborId: newLabor.id,
                  tagId: tag.id,
                })),
              });
            }

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
              if (material.tags && material.tags.length > 0) {
                await db.materialTag.createMany({
                  data: material.tags.map((tag) => ({
                    materialId: newMat.id,
                    tagId: tag.id,
                  })),
                });
              }
              return null;
            }),
          );

          // Process tags
          if (tags && tags.length > 0) {
            await db.itemTag.createMany({
              data: tags.map((tag) => ({
                itemId: invoiceItem.id,
                tagId: tag.id,
              })),
            });
          }
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

      // Create associated tasks
      const validTasks = tasks.filter((t) => t);
      if (validTasks.length > 0) {
        await db.task.createMany({
          data: validTasks.map((task) => {
            const taskSplit = task.task.split(":");
            return {
              title: taskSplit[0].trim(),
              description: taskSplit.length > 1 ? taskSplit[1].trim() : "",
              priority: "Medium",
              invoiceId: newInvoice.id,
              clientId,
              companyId,
              userId: parseInt((session as any)?.user?.id || "0") || null,
              createdBy: "user",
            };
          }),
        });
      }

      return newInvoice;
    });

    // send notification for invoice creation
    sendEstimateCreateNotification({
      companyId,
      invoiceId: invoice.id,
      invoiceType: invoice.type,
      clientName: invoice.client?.firstName + " " + invoice.client?.lastName,
    }).catch((err) =>
      console.error("sendEstimateCreateNotification failed", err),
    );

    if (invoice.type == "Invoice") {
      updateServiceAutomationTrigger({
        companyId: invoice?.companyId,
        estimateId: invoice?.id,
        columnId: invoice?.columnId!,
      }).catch((err) =>
        console.error("updateServiceAutomationTrigger failed", err),
      );

      updateTagAutomationTrigger({
        columnId: invoice?.columnId!,
        companyId: invoice?.companyId,
        pipelineType: "SHOP",
        conditionType: "post_tag",
        invoiceId: invoice?.id,
      }).catch((err) =>
        console.error("updateTagAutomationTrigger failed", err),
      );
    }

    // If newly invoice created invoice automation trigger
    updateInvoiceAutomationTrigger({
      companyId: invoice?.companyId,
      invoiceId: invoice?.id!,
      columnId: invoice?.columnId!,
      type: invoice?.type!,
    }).catch((err) =>
      console.error("updateInvoiceAutomationTrigger failed", err),
    );

    // Step 12: Revalidate the estimate page

    try {
      revalidatePath("/estimate");
    } catch {
      // no-op: cache revalidation is best-effort outside request context
    }

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
