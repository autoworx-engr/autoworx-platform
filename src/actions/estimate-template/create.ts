"use server";
import { authOptions } from "@/authOptions";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { InspectionType } from "@/stores/estimate-create";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";
import { estimateTemplateCreateValidationSchema } from "@/validations/schemas/estimate-template/estimate.validation";
import { InvoiceTemplate, Labor, Material, Service, Tag } from "@prisma/client";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

/**
 * Creates a new invoice in the system
 * @param {Object} params - Invoice creation parameters
 * @returns {Promise<ServerAction | TErrorHandler>} Success response with invoice data or error
 */

type TCreateEstimateTemplateProps = {
  templateId: string;
  title: string;
  subtotal: number;
  discount: number;
  tax: number;
  serviceFee: number;
  grandTotal: number;
  internalNotes: string;
  photos: { id?: number; photo?: string }[];
  items: {
    service: Service | null;
    materials: ((Material & { tags: Tag[] }) | null)[];
    labor: (Labor & { tags: Tag[] }) | null;
    tags: Tag[];
  }[];
  tasks: { id: undefined | number; task: string }[];
  columnId?: number;
  inspections: InspectionType[];
  damageNotes: string | null;
  customerNotes: string | null;
};

export async function createEstimateTemplate({
  title,
  templateId,
  subtotal,
  discount,
  tax,
  serviceFee,
  grandTotal,
  internalNotes,
  photos,
  items,
  tasks,
  columnId,
  inspections,
  damageNotes,
  customerNotes,
}: TCreateEstimateTemplateProps): Promise<ServerAction | TErrorHandler> {
  try {
    // Step 1: Validate input data using Zod schema
    await estimateTemplateCreateValidationSchema.parseAsync({
      templateId,
      title,
      subtotal,
      discount,
      tax,
      serviceFee,
      grandTotal,
      internalNotes,
      photos,
      items,
      tasks,
      columnId,
      inspections,
      damageNotes,
      customerNotes,
    });

    // Step 2: Get authenticated session and company ID
    const session = await getServerSession(authOptions);
    const companyId = session?.user.companyId;

    if (!companyId) {
      throw new Error("Company ID is required to create an email template.");
    }

    const template = await db.$transaction(
      async (db): Promise<InvoiceTemplate> => {
        let finalColumnId = columnId;

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
        // Step 6: Create the main template record
        const newTemplate = await db.invoiceTemplate.create({
          data: {
            id: templateId,
            title,
            subtotal,
            discount,
            tax,
            serviceFee,
            grandTotal,
            internalNotes,
            damageNotes,
            customerNotes,
            companyId,
            columnId: finalColumnId,
          },
        });
        console.log("new template", newTemplate);
        console.log("new photos", photos);
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
              return await db.invoiceInspection.create({
                data: {
                  invoiceTemplateId: newTemplate.id,
                  title: inspection.title,
                  driver: inspection.driver,
                  passenger: inspection.passenger,
                  notes: inspection.notes,
                },
              });
            }),
          );
        }
        // Step 7: Process and upload photos
        await Promise.all(
          photos.map(async (photo) => {
            const templatePhoto = await db.templatePhoto.create({
              data: {
                invoiceTemplateId: newTemplate.id,
                photo: photo.photo ?? "",
              },
            });

            console.log("newTemplate.id", newTemplate.id);
            console.log("templatePhoto", templatePhoto);

            return templatePhoto;
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
                  return await db.laborTag.create({
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
                invoiceTemplateId: newTemplate?.id,
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
                    invoiceTemplateId: newTemplate.id,
                    companyId,
                    invoiceItemId: invoiceItem.id,
                    productId: material.productId,
                  },
                });
                // Create material tag
                await Promise.all(
                  material.tags.map(async (tag) => {
                    return await db.materialTag.create({
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

        await db.invoiceTemplate.update({
          where: {
            id: newTemplate.id,
          },
          data: {
            serviceIndex: JSON.stringify(serviceIndex),
          },
        });
        return newTemplate;
      },
    );

    // Store the template's task blueprint as template DATA — never as a `Task`.
    // Adding a task to a template must not create anything in Task & Activity;
    // real tasks are only created when an estimate/invoice uses this template.
    const templateTasks = tasks
      .filter((task) => task?.task)
      .map((task) => {
        const taskSplit = task.task.split(":");
        return {
          title: taskSplit[0].trim(),
          description: taskSplit.length > 1 ? taskSplit[1].trim() : "",
          invoiceTemplateId: template.id,
          companyId,
        };
      });

    if (templateTasks.length > 0) {
      await db.invoiceTemplateTask.createMany({ data: templateTasks });
    }

    // Step 12: Revalidate the estimate page
    revalidatePath("/estimate/templates");

    return {
      type: "success",
      data: template,
    };
  } catch (err) {
    const formattedError = errorHandler(err);
    return formattedError;
  }
}
