"use server";

import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { sendEstimateCreateNotification } from "@/lib/notification/invoice-notify";
import { updateInvoiceAutomationTrigger } from "@/service/invoice-automation-trigger/api";
import { Invoice, ModifierType } from "@prisma/client";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

type TRequestedService = {
  shopServiceId: string;
  vehicleType: ModifierType;
};

type TCreateDaftEstimate = {
  id: string;
  clientId: number;
  vehicleId?: number;
  requestedServices?: TRequestedService[];
  cId?: number;
  uId?: number;
};

export async function createDraftEstimate({
  id,
  clientId,
  vehicleId,
  requestedServices,
  cId,
  uId,
}: TCreateDaftEstimate) {
  const session = await getServerSession(authOptions);
  const companyId = cId ?? session?.user.companyId;
  const userId = uId ? uId : session?.user.id;

  if (!companyId) {
    throw new Error("Company ID is required to create an email template.");
  }
  if (!userId) {
    throw new Error("User ID is required to create an email template.");
  }

  let estimate: Invoice;

  const draftEstimate = await db.invoice.findFirst({
    where: {
      id,
    },
  });

  if (!draftEstimate) {
    // Get the "Pending" column id
    const columnId = await db.column.findFirst({
      where: {
        title: "Pending",
        companyId,
        type: "shop",
      },
    });

    if (!columnId) {
      // This should never happen
      throw new Error("Column not found");
    }

    let itemsToCreateData: any[] = [];

    if (requestedServices && requestedServices.length > 0) {
      const shopServiceIds = requestedServices
        .map((s: any) => Number(s.shopServiceId))
        .filter(Boolean);

      if (shopServiceIds.length > 0) {
        const selectedServices = await db.shopService.findMany({
          where: {
            id: { in: shopServiceIds },
          },
          include: {
            invoiceItems: {
              include: {
                service: true,
                materials: {
                  include: { tags: { include: { tag: true } } },
                },
                labor: {
                  include: { tags: { include: { tag: true } } },
                },
                tags: {
                  include: { tag: true },
                },
              },
            },
          },
        });

        for (const srv of selectedServices) {
          if (srv.invoiceItems && srv.invoiceItems.length > 0) {
            for (const item of srv.invoiceItems) {
              itemsToCreateData.push({
                shopService: { connect: { id: srv.id } },
                service: item.serviceId
                  ? { connect: { id: item.serviceId } }
                  : undefined,
                serviceDesc: item.service?.description,
                materials:
                  item.materials && item.materials.length > 0
                    ? {
                        create: item.materials.map((m) => ({
                          name: m.name,
                          companyId: companyId,
                          category: m.categoryId
                            ? { connect: { id: m.categoryId } }
                            : undefined,
                          notes: m.notes,
                          quantity: m.quantity,
                          cost: m.cost,
                          sell: m.sell,
                          discount: m.discount,
                          tags:
                            m.tags && m.tags.length > 0
                              ? {
                                  create: m.tags.map((mt) => ({
                                    tagId: mt.tagId,
                                  })),
                                }
                              : undefined,
                        })),
                      }
                    : undefined,
                labor: item.labor
                  ? {
                      create: {
                        name: item.labor.name,
                        companyId: companyId,
                        category: item.labor.categoryId
                          ? { connect: { id: item.labor.categoryId } }
                          : undefined,
                        notes: item.labor.notes,
                        hours: item.labor.hours,
                        charge: item.labor.charge,
                        discount: item.labor.discount,
                        tags:
                          item.labor.tags && item.labor.tags.length > 0
                            ? {
                                create: item.labor.tags.map((lt) => ({
                                  tagId: lt.tagId,
                                })),
                              }
                            : undefined,
                      },
                    }
                  : undefined,
                tags:
                  item.tags && item.tags.length > 0
                    ? {
                        create: item.tags.map((t) => ({
                          tagId: t.tagId,
                        })),
                      }
                    : undefined,
              });
            }
          } else {
            itemsToCreateData.push({
              shopService: { connect: { id: srv.id } },
            });
          }
        }
      }
    }

    const itemsToCreate =
      itemsToCreateData.length > 0 ? { create: itemsToCreateData } : undefined;

    if (vehicleId) {
      estimate = await db.invoice.create({
        data: {
          id,
          type: "Estimate",
          clientId,
          vehicleId,
          userId: Number(userId),
          companyId,
          columnId: columnId.id,
          invoiceItems: itemsToCreate,
        },
      });
    } else {
      estimate = await db.invoice.create({
        data: {
          id,
          type: "Estimate",
          clientId,
          userId: Number(userId),
          companyId,
          columnId: columnId.id,
          invoiceItems: itemsToCreate,
        },
      });
    }
    //update the lead to set estimateCreated to true
    const theClientOfLead = await db.client.findUnique({
      where: {
        id: clientId,
      },
    });
    if (theClientOfLead?.leadId) {
      await db.lead.update({
        where: {
          id: theClientOfLead.leadId,
        },
        data: {
          isEstimateCreated: true,
        },
      });
    }

    // Trigger automation
    updateInvoiceAutomationTrigger({
      companyId: estimate.companyId,
      invoiceId: estimate.id,
      columnId: estimate.columnId!,
      type: estimate.type,
    }).catch((err) =>
      console.error("updateInvoiceAutomationTrigger failed", err),
    );

    // send notification for invoice creation
    sendEstimateCreateNotification({
      companyId,
      invoiceId: estimate.id,
      invoiceType: estimate.type,
      clientName: theClientOfLead?.firstName + " " + theClientOfLead?.lastName,
    }).catch((err) =>
      console.error("sendEstimateCreateNotification failed", err),
    );
  } else {
    estimate = draftEstimate;
  }

  revalidatePath("/dashboard/communication/client/${clientId}");

  return {
    type: "success",
    data: estimate,
  };
}
