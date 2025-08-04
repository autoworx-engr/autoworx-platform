'use server';
import { handlePrismaError } from '@/error-boundary/handlePrismaError';
import { createTask } from '@/actions/task/createTask';
import { errorHandler } from '@/error-boundary/globalErrorHandler';
import { getCompanyId } from '@/lib/companyId';
import { db } from '@/lib/db';
import { ServerAction } from '@/types/action';
import { TErrorHandler } from '@/types/globalError';
import { estimateEditValidationSchema } from '@/validations/schemas/estimate/estimate.validation';
import {
    InvoiceType,
    Labor,
    Material,
    Service,
    Tag,
    Prisma,
} from '@prisma/client';
import { revalidatePath } from 'next/cache';

import { getProductWithQuantity } from '@/lib/getProductWithQuantity';
import { InspectionType } from '@/stores/estimate-create';
import {
    updateInventoryOnEstimateConversion,
    updateInventoryOrCreateHistory,
} from './updateInventory';
import { addVehicleParts } from '../technician/addVehicleParts';
import { updateServiceAutomationTrigger } from '@/service/service-maintenance-automation-trigger/api';
import { sendInvoiceDeliveredNotification } from '@/lib/notification/invoice-notify';
import { updateInvoiceAutomationTrigger } from '@/service/invoice-automation-trigger/api';

interface UpdateEstimateInput {
    id: string;

    clientId: number | undefined;
    vehicleId: number | undefined;

    columnId: number | undefined;

    subtotal: number;
    discount: number;
    tax: number;
    serviceFee: number;
    grandTotal: number;
    due: number;

    internalNotes: string;
    terms: string;
    policy: string;
    customerNotes: string;
    customerComments: string;

    photos: string[];
    items: {
        id?: number;
        service: Service | null;
        materials: ((Material & { tags: Tag[] }) | null)[];
        labor: (Labor & { tags: Tag[] }) | null;
        tags: Tag[];
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

export async function updateInvoice(
    data: UpdateEstimateInput,
    fromPayment: boolean = false,
    retryCount: number = 0
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

        const column = await db.column.findUnique({
            where: { id: data.columnId },
        });

        // Get the technician details
        const technicians = await db.technician.findMany({
            where: {
                invoiceId: data.id,
            },
            include: {
                vehicleParts: true,
            },
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
                            ...itemMaterials.filter(
                                material => material !== null
                            ),
                        ];
                    }
                }

                // const productsWithQuantity = getProductWithQuantity(materials);

                if (invoice?.type === 'Invoice') {
                    await updateInventoryOrCreateHistory({
                        materials,
                        companyId,
                        invoiceId: invoice.id,
                    });
                } else if (
                    invoice?.type === 'Estimate' &&
                    (column?.title === 'In Progress' || fromPayment)
                ) {
                    const productsWithQuantity =
                        getProductWithQuantity(materials);
                    await updateInventoryOnEstimateConversion({
                        productsWithQuantity,
                        companyId,
                        invoiceId: invoice.id,
                    });
                }

                let isWorkOrder = invoice?.isWorkOrder;
                let deliveredAt = invoice?.deliveredAt;
                let completedAt = invoice?.completedAt;

                if (column) {
                    // data.type = column.title === "In Progress" ? "Invoice" : data.type;
                    if (column.title === 'In Progress') {
                        data.type = 'Invoice';
                        isWorkOrder = true;
                        deliveredAt = null;
                    } else if (column.title === 'Delivered') {
                        if (!deliveredAt) {
                            deliveredAt = new Date();
                        }
                    } else if (column.title === 'Completed') {
                        if (!completedAt) {
                            completedAt = new Date();
                        } else {
                            completedAt = invoice?.completedAt;
                        }
                    }
                } else {
                    data.columnId = undefined;
                    data.type = 'Estimate';
                }
                // re-calculating the profit
                const totalCost = data.items?.reduce((acc, item) => {
                    const materials = item.materials;
                    const labor = item.labor;

                    const materialCost = materials?.reduce((acc, material) => {
                        return (
                            acc +
                            Number(material?.cost) * Number(material?.quantity)
                        );
                    }, 0);

                    const laborCost =
                        Number(labor?.charge) * Number(labor?.hours);

                    return acc + materialCost + laborCost;
                }, 0);

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
                            (invoice?.workOrderCreatedAt ?? isWorkOrder)
                                ? new Date()
                                : null,
                        convertedAt: new Date(),
                        completedAt,
                        deliveredAt,
                        damageNotes: data.damageNotes,
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
                    invoice?.column?.title !== 'Delivered' &&
                    column?.title === 'Delivered'
                ) {
                    // send notification when invoice is delivered
                    sendInvoiceDeliveredNotification({
                        companyId: updatedInvoice.companyId,
                        invoiceId: updatedInvoice.id,
                        clientName: `${updatedInvoice.client?.firstName} ${updatedInvoice.client?.lastName}`,
                    });
                }

                // delete existing photos
                await txDb.invoicePhoto.deleteMany({
                    where: {
                        invoiceId: data.id,
                    },
                });

                // create new photos
                await Promise.all(
                    data?.photos?.map(async photo => {
                        return txDb.invoicePhoto.create({
                            data: {
                                invoiceId: data.id,
                                photo,
                            },
                        });
                    })
                );
                // delete existing inspections
                await txDb.invoiceInspection.deleteMany({
                    where: {
                        invoiceId: data.id,
                    },
                });

                // create new inspections
                await Promise.all(
                    data.inspections.map(async inspection => {
                        return txDb.invoiceInspection.create({
                            data: {
                                invoiceId: data.id,
                                title: inspection.title,
                                driver: inspection.driver,
                                passenger: inspection.passenger,
                                notes: inspection.notes,
                            },
                        });
                    })
                );

                // delete existing items
                await txDb.invoiceItem.deleteMany({
                    where: {
                        invoiceId: data.id,
                    },
                });

                // todo: LOOP FOR SERVICES ITEMS
                const serviceIndex: (number | undefined)[] = [];

                await Promise.all(
                    data.items?.map(async item => {
                        const service = item.service;
                        serviceIndex.push(service?.id);

                        const materials = item.materials;
                        const labor = item.labor;
                        const tags = item.tags;

                        let laborId;
                        // delete existing labors
                        if (labor?.id) {
                            const existingLabor = await txDb.labor.findUnique({
                                where: {
                                    id: labor.id,
                                },
                            });

                            if (
                                existingLabor &&
                                existingLabor.cannedLabor === false
                            ) {
                                await txDb.labor.delete({
                                    where: {
                                        id: labor.id,
                                    },
                                });
                            }
                        }

                        // create new labor
                        if (labor) {
                            const newLabor = await txDb.labor.create({
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

                            // create labor tags
                            await Promise.all(
                                labor.tags.map(async tag => {
                                    if (tag?.id) {
                                        return txDb.laborTag.create({
                                            data: {
                                                laborId: newLabor.id,
                                                tagId: tag.id,
                                            },
                                        });
                                    }
                                })
                            );

                            laborId = newLabor.id;
                        }

                        // create new items
                        const invoiceItem = await txDb.invoiceItem.create({
                            data: {
                                invoiceId: data.id,
                                serviceId: service?.id,
                                laborId,
                                serviceDesc: service?.description,
                            },
                        });

                        const getTechnicianForThisService = technicians.filter(
                            technician => {
                                return (
                                    technician.serviceId === service?.id &&
                                    technician.invoiceId === data.id &&
                                    technician.invoiceItemId === item.id
                                );
                            }
                        );

                        // TODO: Insert the new technicians
                        (getTechnicianForThisService.map(async technician => {
                            const newTechnician = await txDb.technician.create({
                                data: {
                                    date: technician.date,
                                    dateClosed: technician.dateClosed,
                                    due: technician.due,
                                    amount: technician.amount,
                                    priority: technician.priority,
                                    status: technician.status,
                                    note: technician.note,
                                    serviceId: technician.serviceId,
                                    invoiceId: data.id,
                                    companyId,
                                    userId: technician.userId,
                                    invoiceItemId: invoiceItem.id,
                                },
                            });
                            await addVehicleParts(
                                technician.vehicleParts,
                                newTechnician.id
                            );
                        }),
                            // Delete existing materials
                            await txDb.material.deleteMany({
                                where: {
                                    invoiceItemId: invoiceItem.id,
                                },
                            }));

                        const materialsCreatePromise =
                            materials?.length > 0
                                ? materials?.map(async material => {
                                      if (!material || !material.name) return;
                                      if (
                                          Number(material?.quantity || 0) <= 0
                                      ) {
                                          throw new Error(
                                              'Material quantity should be greater than 0'
                                          );
                                      }

                                      const newMat = await txDb.material.create(
                                          {
                                              data: {
                                                  name: material.name,
                                                  vendorId: material.vendorId,
                                                  categoryId:
                                                      material.categoryId,
                                                  notes: material.notes,
                                                  quantity: material.quantity,
                                                  cost: material.cost,
                                                  sell: material.sell,
                                                  discount: material.discount,
                                                  invoiceId: data.id,
                                                  companyId,
                                                  invoiceItemId: invoiceItem.id,
                                                  productId: material.productId,
                                              },
                                          }
                                      );

                                      // create tags
                                      await Promise.all(
                                          material.tags.map(async tag => {
                                              if (tag?.id) {
                                                  return txDb.materialTag.create(
                                                      {
                                                          data: {
                                                              materialId:
                                                                  newMat.id,
                                                              tagId: tag.id,
                                                          },
                                                      }
                                                  );
                                              }
                                          })
                                      );
                                  })
                                : [];
                        // Create materials
                        await Promise.all(materialsCreatePromise);

                        // create tags
                        await Promise.all(
                            tags.map(async tag => {
                                if (tag?.id) {
                                    return txDb.itemTag.create({
                                        data: {
                                            itemId: invoiceItem.id,
                                            tagId: tag.id,
                                        },
                                    });
                                }
                            })
                        );
                    })
                );

                await txDb.invoice.update({
                    where: {
                        id: data.id,
                    },
                    data: {
                        serviceIndex: JSON.stringify(serviceIndex),
                    },
                });

                if (
                    invoice?.columnId !== updatedInvoice.columnId &&
                    updatedInvoice.type === 'Invoice'
                ) {
                    // if invoice status update invoice automation trigger
                    updateInvoiceAutomationTrigger({
                        companyId: updatedInvoice?.companyId!,
                        invoiceId: updatedInvoice?.id!,
                        columnId: updatedInvoice?.columnId!,
                    });
                }

                if (
                    updatedInvoice.type === 'Invoice' &&
                    invoice?.type === 'Estimate'
                ) {
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
                isolationLevel: 'Serializable', // Ensure data consistency
            }
        );

        // task create or update this section
        await Promise.all(
            data?.tasks?.map(async task => {
                // if task.id is undefined, create a new task
                if (task.id === undefined) {
                    return createTask({
                        title: task.task.split(':')[0],
                        description:
                            task.task.length > 1 ? task.task.split(':')[1] : '',
                        assignedUsers: [],
                        priority: 'Medium',
                        invoiceId: data.id,
                        timezone:
                            Intl.DateTimeFormat().resolvedOptions().timeZone,
                        clientId: data.clientId,
                    });
                } else if (task.id) {
                    // if task.id is not undefined, update the task
                    return db.task.update({
                        where: {
                            id: task?.id,
                        },
                        data: {
                            title: task.task.split(':')[0],
                            description:
                                task.task.length > 1
                                    ? task.task.split(':')[1]
                                    : '',
                        },
                    });
                }
            })
        );

        // Now fetch the most updated invoice with all the relations
        // const latestInvoice = (await db.invoice.findUnique({
        //     where: {
        //         id: updatedInvoice.id,
        //     },
        //     include: {
        //         client: true,
        //         vehicle: true,
        //         column: true,
        //         invoiceItems: {
        //             include: {
        //                 service: true,
        //                 labor: {
        //                     include: {
        //                         tags: {
        //                             include: { tag: true },
        //                         },
        //                     },
        //                 },
        //                 materials: {
        //                     include: {
        //                         tags: {
        //                             include: { tag: true },
        //                         },
        //                     },
        //                 },
        //                 tags: {
        //                     include: { tag: true },
        //                 },
        //             },
        //         },
        //         tasks: true,
        //     },
        // })) as any; // TODO: Fix the type

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
            }
        );

        revalidatePath('/dashboard/estimate');
        return {
            type: 'success',
            data: updatedInvoice,
        };
    } catch (err) {
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
                        `Retrying invoice update due to timeout. Attempt ${retryCount + 1}/${MAX_RETRIES}`
                    );

                    // Wait before retry (exponential backoff)
                    await new Promise(resolve =>
                        setTimeout(resolve, Math.pow(2, retryCount) * 1000)
                    );

                    return updateInvoice(data, fromPayment, retryCount + 1);
                }

                console.log({
                    prismaErrorCode:
                        err instanceof Prisma.PrismaClientKnownRequestError
                            ? err.code
                            : 'N/A',
                    error: prismaError,
                    retryCount,
                });
                return {
                    type: 'globalError',
                    message: prismaError.message,
                    statusCode: prismaError.statusCode,
                    errorSource: [
                        {
                            path: 'transaction',
                            message: 'Transaction failed , Please try again',
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
