"use server";
import { handlePrismaError } from "@/error-boundary/handlePrismaError";
import { createTask } from "@/actions/task/createTask";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";
import { estimateEditValidationSchema } from "@/validations/schemas/estimate/estimate.validation";
import {
  InvoiceType,
  Labor,
  Material,
  Service,
  Tag,
  Prisma,
  ShopBookingStatus,
  Invoice,
} from "@prisma/client";
import { revalidatePath } from "next/cache";

import { getProductWithQuantity } from "@/lib/getProductWithQuantity";
import { InspectionType } from "@/stores/estimate-create";
import {
  updateInventoryOnEstimateConversion,
  updateInventoryOrCreateHistory,
} from "./updateInventory";
import { updateServiceAutomationTrigger } from "@/service/service-maintenance-automation-trigger/api";
import { sendInvoiceDeliveredNotification } from "@/lib/notification/invoice-notify";
import { updateInvoiceAutomationTrigger } from "@/service/invoice-automation-trigger/api";
import { Decimal } from "@prisma/client/runtime/library";

interface UpdateEstimateInput {
  id: string;

  clientId: number | undefined;
  vehicleId: number | undefined;

  columnId: number | undefined;

  subtotal: number;
  discount: number;
  tax: number;
  serviceFee: number;
  vehicleExtraCost?: number;
  grandTotal: number;
  due: number;

  internalNotes: string;
  terms: string;
  policy: string;
  customerNotes: string;
  customerComments: string;

  photos: { id?: number; photo?: string }[];
  items: {
    id?: number;
    service: Service | null;
    materials: ((Material & { tags: Tag[] }) | null)[];
    labor: (Labor & { tags: Tag[] }) | null;
    tags: Tag[];
    serviceDesc?: string;
  }[];
  tasks: { id: undefined | number; task: string }[];
  type: InvoiceType;
  inspections: InspectionType[];
  damageNotes: string | null;
}

// transaction timeout test function
// function wait(ms: number) {
//     return new Promise(resolve => setTimeout(resolve, ms));
// }

     const hasInvoiceChanged = (
  invoice: Invoice | null,
  data: UpdateEstimateInput
): boolean => {
 if (!invoice) return false;
  const decimalChanged = (dbValue: Decimal | null | undefined, newValue: number) => {
    return new Decimal(newValue ?? 0).toString() !== (dbValue ?? new Decimal(0)).toString();
  };

  return (
    invoice.clientId !== data.clientId ||
    invoice.vehicleId !== data.vehicleId ||
    invoice.columnId !== data.columnId ||
    invoice.internalNotes !== data.internalNotes ||
    invoice.terms !== data.terms ||
    invoice.policy !== data.policy ||
    invoice.customerNotes !== data.customerNotes ||
    invoice.customerComments !== data.customerComments ||
    invoice.damageNotes !== data.damageNotes ||
    decimalChanged(invoice.subtotal, data.subtotal) ||
    decimalChanged(invoice.discount, data.discount) ||
    decimalChanged(invoice.tax, data.tax) ||
    decimalChanged(invoice.serviceFee, data.serviceFee) ||
    decimalChanged(invoice.grandTotal, data.grandTotal) ||
    decimalChanged(invoice.due, data.due)
  );
};
export async function updateInvoice(
  data: UpdateEstimateInput,
  fromPayment: boolean = false,
  retryCount: number = 0,
): Promise<ServerAction | TErrorHandler> {
  const MAX_RETRIES = 2;
  try {
    await estimateEditValidationSchema.parseAsync(data);

    const companyId = await getCompanyId();

 

    //find invoice from database
    const invoice = await db.invoice.findUnique({
      where: {
        id: data.id,
      },
      include: {
        column: {
          select: {
            title: true,
          },
        },
      },
    });

   const isChanged = hasInvoiceChanged(invoice, data);

    const column = await db.column.findUnique({
      where: { id: data.columnId },
    });

  

    // use prisma transaction for better performance or safely save data in db
    const updatedInvoice = await db.$transaction(
      async txDb => {
        // await wait(21000);

        // merge all the same products and sum the quantity
        let materials: Material[] = [];

        for (const item in data.items) {
          const itemMaterials = data?.items[item].materials;

          if (itemMaterials) {
            materials = [
              ...materials,
              ...itemMaterials.filter(material => material !== null),
            ];
          }
        }

        // const productsWithQuantity = getProductWithQuantity(materials);

        if (invoice?.type === "Invoice") {
          await updateInventoryOrCreateHistory({
            materials,
            companyId,
            invoiceId: invoice.id,
          });
        } else if (
          invoice?.type === "Estimate" &&
          (column?.title === "In Progress" || fromPayment)
        ) {
          const productsWithQuantity = getProductWithQuantity(materials);
          await updateInventoryOnEstimateConversion({
            productsWithQuantity,
            companyId,
            invoiceId: invoice.id,
          });
        }

        let isWorkOrder = invoice?.isWorkOrder;
        let deliveredAt = invoice?.deliveredAt;
        let completedAt = invoice?.completedAt;

        if (column && invoice) {
          const findShopBooking = await txDb.shopBooking.findUnique({
            where: {
              invoiceId: invoice.id,
            },
          });
          if (
            (column.title === "Completed" || column.title === "Delivered") &&
            findShopBooking
          ) {
            await txDb.shopBooking.update({
              where: {
                id: findShopBooking.id,
              },
              data: {
                status: ShopBookingStatus.COMPLETED,
              },
            });
          } else if (
            findShopBooking &&
            findShopBooking.status === ShopBookingStatus.COMPLETED
          ) {
            await txDb.shopBooking.update({
              where: {
                id: findShopBooking.id,
              },
              data: {
                status: ShopBookingStatus.CONFIRMED,
              },
            });
          }
          // data.type = column.title === "In Progress" ? "Invoice" : data.type;
          if (column.title === "In Progress") {
            data.type = "Invoice";
            isWorkOrder = true;
            deliveredAt = null;
          } else if (column.title === "Delivered") {
            if (!deliveredAt) {
              deliveredAt = new Date();
            }
          } else if (column.title === "Completed") {
            if (!completedAt) {
              completedAt = new Date();
            } else {
              completedAt = invoice?.completedAt;
            }
          }
        } else {
          data.columnId = undefined;
          data.type = "Estimate";
        }
        // re-calculating the profit
        const totalCost = data.items?.reduce((acc, item) => {
          const materials = item.materials;
          const labor = item.labor;

          const materialCost = materials?.reduce((acc, material) => {
            return acc + Number(material?.cost) * Number(material?.quantity);
          }, 0);

          const laborCost = Number(labor?.charge) * Number(labor?.hours);

          return acc + materialCost + laborCost;
        }, 0);

        // create or update photos
        const updatedInvoicePhotos = await Promise.all(
          data?.photos?.map(async photo => {
            if (!photo.id) {
              return txDb.invoicePhoto.create({
                data: {
                  invoiceId: data.id,
                  photo: photo.photo ?? "",
                },
              });
            }
            return photo;
          }),
        );

        // delete photos which are removed
        await txDb.invoicePhoto.deleteMany({
          where: {
            invoiceId: data.id,
            id: {
              notIn: updatedInvoicePhotos
                ?.map(photo => photo.id)
                .filter(Boolean) as number[],
            },
          },
        });

        // delete existing inspections
        await txDb.invoiceInspection.deleteMany({
          where: {
            invoiceId: data.id,
          },
        });

        // create new inspections
        const inspectionsToSave = data.inspections.filter(inspection => {
          const hasTitle =
            !!inspection.title && inspection.title.toString().trim() !== "";
          const hasFlags = !!inspection.driver || !!inspection.passenger;
          const hasNotes =
            !!inspection.notes && inspection.notes.toString().trim() !== "";
          return hasTitle || hasFlags || hasNotes;
        });

        if (inspectionsToSave.length > 0) {
          await Promise.all(
            inspectionsToSave.map(async inspection => {
              return txDb.invoiceInspection.create({
                data: {
                  invoiceId: data.id,
                  title: inspection.title,
                  driver: inspection.driver,
                  passenger: inspection.passenger,
                  notes: inspection.notes,
                },
              });
            }),
          );
        }

        const updatedInvoiceItem = await Promise.all(
          data.items?.map(async item => {
            let findExistingItem = null;
            if (Number(item?.id)) {
              findExistingItem = await txDb.invoiceItem.findUnique({
                where: {
                  id: item?.id,
                },
              });
            }

            if (findExistingItem) {
              // check if labor exist
              let findExistingLabor = null;
              if (Number(item?.labor?.id)) {
                findExistingLabor = await txDb.labor.findUnique({
                  where: {
                    id: item?.labor?.id,
                    cannedLabor: false,
                  },
                });
              }

              if (!findExistingLabor && item.labor) {
                //TODO: delete old labor if labor id exist and not canned labor
                if (item?.labor?.id && !item?.labor?.cannedLabor) {
                  await txDb.labor.delete({
                    where: {
                      id: item.labor?.id,
                      cannedLabor: false,
                    },
                  });
                }
                findExistingLabor = await txDb.labor.create({
                  data: {
                    name: item?.labor?.name ?? "",
                    categoryId: item?.labor?.categoryId,
                    notes: item?.labor?.notes,
                    hours: item?.labor?.hours ?? 0,
                    charge: item?.labor?.charge ?? 0,
                    discount: item?.labor?.discount ?? 0,
                    companyId,
                  },
                });
              }

              let updatedLabor = null;

              if (findExistingLabor) {
                updatedLabor = await txDb.labor.update({
                  where: {
                    id: findExistingLabor.id,
                  },
                  data: {
                    name: item?.labor?.name,
                    categoryId: item?.labor?.categoryId,
                    notes: item?.labor?.notes,
                    hours: item?.labor?.hours ?? 0,
                    charge: item?.labor?.charge ?? 0,
                    discount: item?.labor?.discount ?? 0,
                    companyId,
                  },
                });
              }
              console.log({ updatedLabor });
              // update item
              const updatedInvoiceItem = await txDb.invoiceItem.update({
                where: {
                  id: findExistingItem?.id,
                },
                data: {
                  serviceId: item.service?.id ?? null,
                  laborId: updatedLabor?.id ?? null,
                  serviceDesc: item?.serviceDesc || item?.service?.description,
                },
              });

              // update Material info
              // find first has material in invoice or invoiceId
              let materials: any[] = [];

              if (item?.materials?.length > 0) {
                materials = await Promise.all(
                  item.materials.map(async material => {
                    const hasMaterialInInvoice = await txDb.material.findFirst({
                      where: {
                        id: material?.id,
                        invoiceId: invoice?.id,
                        invoiceItemId: item?.id,
                      },
                    });
                    if (!material || !material.name) return;
                    if (Number(material?.quantity || 0) <= 0) {
                      throw new Error(
                        "Material quantity should be greater than 0",
                      );
                    }
                    if (hasMaterialInInvoice) {
                      const updatedMaterial = await txDb.material.update({
                        where: {
                          id: hasMaterialInInvoice.id,
                        },
                        data: {
                          name: material?.name,
                          vendorId: material?.vendorId,
                          categoryId: material?.categoryId,
                          notes: material?.notes,
                          quantity: material?.quantity,
                          cost: material?.cost,
                          sell: material?.sell ?? 0,
                          discount: material?.discount ?? 0,
                          invoiceId: data.id,
                          companyId,
                          invoiceItemId: findExistingItem.id,
                          productId: hasMaterialInInvoice.productId,
                        },
                      });
                      return updatedMaterial;
                    } else {
                      const newMaterial = await txDb.material.create({
                        data: {
                          name: material.name,
                          vendorId: material.vendorId,
                          categoryId: material.categoryId,
                          notes: material.notes,
                          quantity: material.quantity,
                          cost: material.cost,
                          sell: material.sell,
                          discount: material.discount,
                          invoiceId: data.id,
                          companyId,
                          invoiceItemId: findExistingItem.id,
                          productId: material.productId,
                        },
                      });
                      return newMaterial;
                    }
                  }),
                );
              }

              // delete removed unused materials for this item
              await txDb.material.deleteMany({
                where: {
                  invoiceItemId: findExistingItem?.id,
                  invoiceId: invoice?.id,
                  id: {
                    notIn: materials
                      ?.filter(Boolean)
                      .map(material => material?.id),
                  },
                },
              });

              const tags = item.tags;

              const tagsCreatePromise = tags.map(async tag => {
                let hasTagsExist = await txDb.itemTag.findFirst({
                  where: {
                    tagId: tag?.id,
                    itemId: findExistingItem?.id,
                  },
                });

                if (!hasTagsExist) {
                  hasTagsExist = await txDb.itemTag.create({
                    data: {
                      itemId: findExistingItem.id,
                      tagId: tag.id,
                    },
                  });
                }
                return hasTagsExist;
              });

              await Promise.all(tagsCreatePromise);
              // delete tags which are not in the updated list
              await txDb.itemTag.deleteMany({
                where: {
                  itemId: findExistingItem.id,
                  tagId: {
                    notIn: tags.map(tag => tag.id),
                  },
                },
              });
              return updatedInvoiceItem;
            } else {
              // if item not exist in invoice
              const labor = item?.labor;
              let newLabor = null;
              if (labor) {
                newLabor = await txDb.labor.create({
                  data: {
                    name: labor?.name ?? "",
                    categoryId: labor?.categoryId,
                    notes: labor?.notes,
                    hours: labor?.hours ?? 0,
                    charge: labor?.charge ?? 0,
                    discount: labor?.discount ?? 0,
                    companyId,
                  },
                });
              }

              const newInvoiceItem = await txDb.invoiceItem.create({
                data: {
                  invoiceId: invoice?.id,
                  serviceId: item.service?.id,
                  laborId: newLabor?.id,
                  serviceDesc: item?.service?.description,
                },
              });

              item?.materials?.length > 0 &&
                (await Promise.all(
                  item.materials.map(async material => {
                    if (!material || !material.name) return;
                    if (Number(material?.quantity || 0) <= 0) {
                      throw new Error(
                        "Material quantity should be greater than 0",
                      );
                    }
                    await txDb.material.create({
                      data: {
                        name: material.name,
                        vendorId: material.vendorId,
                        categoryId: material.categoryId,
                        notes: material.notes,
                        quantity: material.quantity,
                        cost: material.cost,
                        sell: material.sell,
                        discount: material.discount,
                        invoiceId: invoice?.id,
                        companyId,
                        invoiceItemId: newInvoiceItem.id,
                        productId: material.productId,
                      },
                    });
                  }),
                ));

              const tags = item.tags;

              const tagsCreatePromise = tags.map(async tag => {
                await txDb.itemTag.create({
                  data: {
                    itemId: newInvoiceItem.id,
                    tagId: tag.id,
                  },
                });
              });

              await Promise.all(tagsCreatePromise);
              return newInvoiceItem;
            }
          }),
        );

        // delete removed items
        await txDb.invoiceItem.deleteMany({
          where: {
            invoiceId: invoice?.id,
            NOT: {
              id: {
                in: updatedInvoiceItem
                  .map(item => item.id)
                  .filter(Boolean) as number[],
              },
            },
          },
        });

        // update invoice itself
        const updatedInvoice = await txDb.invoice.update({
          where: {
            id: data.id,
          },
          data: {
            clientId: data.clientId,
            vehicleId: data.vehicleId ?? null,
            profit: data.grandTotal - totalCost,
            columnId: data.columnId ?? null,
            subtotal: data.subtotal,
            discount: data.discount,
            tax: data.tax,
            serviceFee: data.serviceFee,
            vehicleExtraCost: data.vehicleExtraCost,
            grandTotal: data.grandTotal,
            due: data.due,
            internalNotes: data.internalNotes,
            terms: data.terms,
            policy: data.policy,
            customerNotes: data.customerNotes,
            customerComments: data.customerComments,
            type: data.type as InvoiceType,
            isWorkOrder,
            workOrderCreatedAt:
              (invoice?.workOrderCreatedAt ?? isWorkOrder) ? new Date() : null,
            convertedAt: new Date(),
            completedAt,
            deliveredAt,
            damageNotes: data.damageNotes,
            authorizedName: fromPayment ? undefined : isChanged ? null : invoice?.authorizedName,
            signatureImage: fromPayment ? undefined : isChanged ? null : invoice?.signatureImage,
            isViewed: false,
            serviceIndex: JSON.stringify(
              updatedInvoiceItem
                .map(item => item?.id)
                .filter(Boolean)
                .sort((a, b) => a - b),
            ),
          },
          include: {
            client: true,
            vehicle: true,
            column: true,
            invoiceItems: {
              include: {
                service: true,
                labor: {
                  include: {
                    tags: {
                      include: { tag: true },
                    },
                  },
                },
                materials: {
                  include: {
                    tags: {
                      include: { tag: true },
                    },
                  },
                },
                tags: {
                  include: { tag: true },
                },
              },
            },
            tasks: true,
          },
        });

        if (
          invoice?.column?.title !== "Delivered" &&
          column?.title === "Delivered"
        ) {
          // send notification when invoice is delivered
          sendInvoiceDeliveredNotification({
            companyId: updatedInvoice.companyId,
            invoiceId: updatedInvoice.id,
            clientName: `${updatedInvoice.client?.firstName} ${updatedInvoice.client?.lastName}`,
          });
        }

        if (invoice?.columnId !== updatedInvoice.columnId) {
          // if invoice status update invoice automation trigger
          updateInvoiceAutomationTrigger({
            companyId: updatedInvoice?.companyId!,
            invoiceId: updatedInvoice?.id!,
            columnId: updatedInvoice?.columnId!,
            type: updatedInvoice?.type!,
          });
        }

        if (updatedInvoice.type === "Invoice" && invoice?.type === "Estimate") {
          updateServiceAutomationTrigger({
            companyId: updatedInvoice?.companyId,
            estimateId: updatedInvoice?.id,
            columnId: updatedInvoice?.columnId!,
          });
        }

        return updatedInvoice;
      },
      {
        maxWait: 20000, // 20 seconds
        timeout: 20000, // 20 seconds
        isolationLevel: "Serializable", // Ensure data consistency
      },
    );

    // task create or update this section
    const invoiceTasks = await Promise.all(
      data?.tasks?.map(async task => {
        // if task.id is undefined, create a new task
        if (task.id === undefined) {
          const response = await createTask({
            title: task.task.split(":")[0],
            description: task.task.length > 1 ? task.task.split(":")[1] : "",
            assignedUsers: [],
            priority: "Medium",
            invoiceId: data.id,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            clientId: data.clientId,
            createdBy: "user",
          });

          if (response.type === "success") {
            return response.data;
          }
        } else if (task.id) {
          // if task.id is not undefined, update the task
          return db.task.update({
            where: {
              id: task?.id,
            },
            data: {
              title: task.task.split(":")[0],
              description: task.task.length > 1 ? task.task.split(":")[1] : "",
            },
          });
        }
      }),
    );

    // delete tasks which are removed from the invoice
    await db.task.deleteMany({
      where: {
        invoiceId: data.id,
        id: {
          notIn: invoiceTasks.map(task => task?.id).filter(Boolean) as number[],
        },
      },
    });

    updatedInvoice.invoiceItems = updatedInvoice?.invoiceItems.map(
      (item: any) => {
        item.tags = item.tags.map((tag: any) => tag.tag);
        item.materials = item.materials.map((material: any) => {
          material.tags = material.tags.map((tag: any) => tag.tag);
          return material;
        });
        item.labor = item.labor
          ? {
              ...item.labor,
              tags: item.labor.tags.map((tag: any) => tag.tag),
            }
          : null;
        return item;
      },
    );

    revalidatePath("/dashboard/estimate");
    return {
      type: "success",
      data: updatedInvoice,
    };
  } catch (err) {
    console.log({ err, retryCount });
    // Enhanced error handling for Prisma and transaction errors
    if (
      err instanceof Prisma.PrismaClientKnownRequestError ||
      err instanceof Prisma.PrismaClientValidationError ||
      err instanceof Prisma.PrismaClientUnknownRequestError ||
      err instanceof Prisma.PrismaClientRustPanicError ||
      err instanceof Prisma.PrismaClientInitializationError
    ) {
      const prismaError = handlePrismaError(err);
      if (prismaError) {
        // Retry logic for timeout errors
        if (
          (prismaError.statusCode === 408 || // REQUEST_TIMEOUT
            prismaError.statusCode === 503) && // SERVICE_UNAVAILABLE
          retryCount < MAX_RETRIES
        ) {
          console.log(
            `Retrying invoice update due to timeout. Attempt ${retryCount + 1}/${MAX_RETRIES}`,
          );

          // Wait before retry (exponential backoff)
          await new Promise(resolve =>
            setTimeout(resolve, Math.pow(2, retryCount) * 1000),
          );

          return updateInvoice(data, fromPayment, retryCount + 1);
        }

        console.log({
          prismaErrorCode:
            err instanceof Prisma.PrismaClientKnownRequestError
              ? err.code
              : "N/A",
          error: prismaError,
          retryCount,
        });
        return {
          type: "globalError",
          message: prismaError.message,
          statusCode: prismaError.statusCode,
          errorSource: [
            {
              path: "transaction",
              message: "update failed, Please try again",
            },
          ],
        } as TErrorHandler;
      }
    }

    // Fallback to general error handler
    const formattedError = errorHandler(err);
    console.log({ error: formattedError.errorSource, formattedError });
    return formattedError;
  }
}
