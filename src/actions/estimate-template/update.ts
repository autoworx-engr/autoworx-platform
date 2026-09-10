"use server";
import { handlePrismaError } from "@/error-boundary/handlePrismaError";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";
import { Labor, Material, Service, Tag, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { InspectionType } from "@/stores/estimate-create";
import { estimateTemplateEditValidationSchema } from "@/validations/schemas/estimate-template/estimate.validation";

interface UpdateEstimateTemplateInput {
  id: string;
  title: string;
  columnId: number | undefined;
  subtotal: number;
  discount: number;
  tax: number;
  serviceFee: number;
  grandTotal: number;
  internalNotes: string;
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
  inspections: InspectionType[];
  customerNotes: string | null;
  damageNotes: string | null;
}

export async function updateEstimateTemplate(
  data: UpdateEstimateTemplateInput,
  retryCount: number = 0,
): Promise<ServerAction | TErrorHandler> {
  const MAX_RETRIES = 2;
  try {
    await estimateTemplateEditValidationSchema.parseAsync(data);

    const companyId = await getCompanyId();

    let finalColumnId = data?.columnId;

    if (!finalColumnId) {
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
    }

    //find invoice from database
    const template = await db.invoiceTemplate.findUnique({
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

    // use prisma transaction for better performance or safely save data in db
    const updatedEstimateTemplate = await db.$transaction(
      async (txDb) => {
        // await wait(21000);

        // merge all the same products and sum the quantity
        let materials: Material[] = [];

        for (const item in data.items) {
          const itemMaterials = data?.items[item].materials;

          if (itemMaterials) {
            materials = [
              ...materials,
              ...itemMaterials.filter((material) => material !== null),
            ];
          }
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
        const updatedEstimateTemplatePhotos = await Promise.all(
          data?.photos?.map(async (photo) => {
            if (!photo.id) {
              return await txDb.templatePhoto.create({
                data: {
                  invoiceTemplateId: data.id,
                  photo: photo.photo ?? "",
                },
              });
            }
            return photo;
          }),
        );

        // delete photos which are removed
        await txDb.templatePhoto.deleteMany({
          where: {
            invoiceTemplateId: data.id,
            id: {
              notIn: updatedEstimateTemplatePhotos
                ?.map((photo) => photo.id)
                .filter(Boolean) as number[],
            },
          },
        });

        // delete existing inspections
        await txDb.invoiceInspection.deleteMany({
          where: {
            invoiceTemplateId: data.id,
          },
        });

        // create new inspections
        const inspectionsToSave = data.inspections.filter((inspection) => {
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
              return await txDb.invoiceInspection.create({
                data: {
                  invoiceTemplateId: data.id,
                  title: inspection.title,
                  driver: inspection.driver,
                  passenger: inspection.passenger,
                  notes: inspection.notes,
                },
              });
            }),
          );
        }

        const updatedEstimateTemplateItem = await Promise.all(
          data.items?.map(async (item) => {
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
                  item.materials.map(async (material) => {
                    const hasMaterialInInvoice = await txDb.material.findFirst({
                      where: {
                        id: material?.id,
                        invoiceTemplateId: template?.id,
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
                          invoiceTemplateId: data.id,
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
                          invoiceTemplateId: data.id,
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
                  invoiceTemplateId: template?.id,
                  id: {
                    notIn: materials
                      ?.filter(Boolean)
                      .map((material) => material?.id),
                  },
                },
              });

              const tags = item.tags;

              const tagsCreatePromise = tags.map(async (tag) => {
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
                    notIn: tags.map((tag) => tag.id),
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

              const newEstimateTemplateItem = await txDb.invoiceItem.create({
                data: {
                  invoiceTemplateId: template?.id,
                  serviceId: item.service?.id,
                  laborId: newLabor?.id,
                  serviceDesc: item?.service?.description,
                },
              });

              item?.materials?.length > 0 &&
                (await Promise.all(
                  item.materials.map(async (material) => {
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
                        invoiceTemplateId: template?.id,
                        companyId,
                        invoiceItemId: newEstimateTemplateItem.id,
                        productId: material.productId,
                      },
                    });
                  }),
                ));

              const tags = item.tags;

              const tagsCreatePromise = tags.map(async (tag) => {
                await txDb.itemTag.create({
                  data: {
                    itemId: newEstimateTemplateItem.id,
                    tagId: tag.id,
                  },
                });
              });

              await Promise.all(tagsCreatePromise);
              return newEstimateTemplateItem;
            }
          }),
        );

        // delete removed items
        await txDb.invoiceItem.deleteMany({
          where: {
            invoiceTemplateId: template?.id,
            NOT: {
              id: {
                in: updatedEstimateTemplateItem
                  .map((item) => item.id)
                  .filter(Boolean) as number[],
              },
            },
          },
        });

        // update invoice itself
        const updatedInvoice = await txDb.invoiceTemplate.update({
          where: {
            id: data.id,
          },
          data: {
            columnId: finalColumnId,
            subtotal: data.subtotal,
            discount: data.discount,
            tax: data.tax,
            serviceFee: data.serviceFee,
            grandTotal: data.grandTotal,
            internalNotes: data.internalNotes,
            damageNotes: data?.damageNotes,
            customerNotes: data?.customerNotes,
            title: data?.title,
            serviceIndex: JSON.stringify(
              updatedEstimateTemplateItem
                .map((item) => item?.id)
                .filter(Boolean)
                .sort((a, b) => a - b),
            ),
          },
          include: {
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

        return updatedInvoice;
      },
      {
        maxWait: 20000, // 20 seconds
        timeout: 20000, // 20 seconds
        isolationLevel: "Serializable", // Ensure data consistency
      },
    );

    const invoiceTasks = await Promise.all(
      data?.tasks?.map(async (task) => {
        const parts = task.task.split(":");
        const title = parts[0].trim();
        const description = parts.length > 1 ? parts[1].trim() : "";

        if (task.id) {
          const { count } = await db.invoiceTemplateTask.updateMany({
            where: { id: task.id, invoiceTemplateId: data.id },
            data: { title, description },
          });
          if (count > 0) return { id: task.id };
        }

        return db.invoiceTemplateTask.create({
          data: {
            title,
            description,
            invoiceTemplateId: data.id,
            companyId,
          },
        });
      }),
    );

    // delete tasks which are removed from the invoice
    await db.invoiceTemplateTask.deleteMany({
      where: {
        invoiceTemplateId: data.id,
        id: {
          notIn: invoiceTasks
            .map((task) => task?.id)
            .filter(Boolean) as number[],
        },
      },
    });

    updatedEstimateTemplate.invoiceItems =
      updatedEstimateTemplate?.invoiceItems.map((item: any) => {
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
      });

    revalidatePath("/estimate/templates");
    return {
      type: "success",
      data: updatedEstimateTemplate,
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
            `Retrying estimate template update due to timeout. Attempt ${retryCount + 1}/${MAX_RETRIES}`,
          );

          // Wait before retry (exponential backoff)
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, retryCount) * 1000),
          );

          return updateEstimateTemplate(data);
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
              path: "estimate template delete transaction",
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
