"use server";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { sendLeadStageChangeOrCloseNotification } from "@/lib/notification/pipeline-notify";
import { LeadWithSalesUser } from "@/types/invoiceLead";
import { Client, Prisma, Vehicle } from "@prisma/client";
import moment from "moment-timezone";

type TGetLeads = {
  columnId?: number;
  searchTerm?: string;
  take?: number;
  skip?: number;
};

export const getLeads = async ({
  columnId,
  take,
  skip,
  searchTerm = "",
}: TGetLeads): Promise<LeadWithSalesUser[]> => {
  const companyId = await getCompanyId();
  try {
    let query: Prisma.LeadWhereInput = {};
    if (searchTerm && columnId) {
      query = {
        companyId,
        columnId,
        clientName: {
          contains: searchTerm,
        },
      };
    } else if (columnId) {
      query = {
        companyId,
        columnId,
      };
    } else {
      query = {
        companyId,
        clientName: {
          contains: searchTerm,
        },
      };
    }

    const timezone = moment.tz.guess();
    const todayTimeString = moment()
      .tz(timezone)
      .startOf("day")
      .format("YYYY-MM-DDTHH:mm:ss");

    const leadsData = await db.lead.findMany({
      where: { ...query },
      take,
      skip,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        salesUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        tasks: true,
        column: true,
        leadTags: {
          include: {
            tag: true,
          },
        },
        Client: {
          include: {
            appointments: {
              where: {
                date: {
                  gte: moment(todayTimeString) as any,
                },
              },
              orderBy: {
                date: "desc",
              },
              select: {
                id: true,
                title: true,
                date: true,
                startTime: true,
                endTime: true,
              },
            },
            _count: {
              select: {
                ClientSMS: {
                  where: {
                    sentBy: "Client",
                    companyId,
                    isRead: false,
                  },
                },
              },
            },
          },
        },
      },
    });

    let leadsDataWithClient: LeadWithSalesUser[] = [];
    let ind = 0;

    for (const lead of leadsData) {
      let dataToPush: {
        client:
          | (Client & {
              vehicle?: Vehicle | null;
              appointments?: {
                id: number;
                date: Date | null;
                startTime: string | null;
                endTime: string | null;
              }[];
            })
          | null;
        column?: any;
      } = {
        client: null,
        // column: {},
      };
      // const client = await db.client.findFirst({
      //   where: {
      //     leadId: lead.id,
      //     companyId,
      //   },
      //   include: {
      //     appointments: {
      //       where: {
      //         date: {
      //           gte: moment(todayTimeString) as any,
      //         },
      //       },
      //       orderBy: {
      //         date: "desc",
      //       },
      //       select: {
      //         id: true,
      //         title: true,
      //         date: true,
      //         startTime: true,
      //         endTime: true,
      //       },
      //     },
      //   },
      // });
      const client = lead.Client.find(
        (client) => client.companyId === companyId && client.leadId === lead.id,
      );
      const appointments = client?.appointments.filter((appointment) => {
        if (
          appointment.date &&
          moment(appointment?.date).isSameOrAfter(todayTimeString)
        ) {
          if (
            moment(appointment.date)
              .startOf("day")
              .format("YYYY-MM-DDTHH:mm:ss") === todayTimeString &&
            moment(appointment.endTime, "HH:mm").isBefore(moment())
          ) {
            return false;
          }
          return true;
        }
      });
      if (client) {
        dataToPush.client = { ...client, appointments };
      }
      if (lead.vehicleId) {
        let vehicle = await db.vehicle.findFirst({
          where: {
            id: lead.vehicleId,
            companyId,
          },
        });
        if (dataToPush.client) dataToPush.client.vehicle = vehicle;
      }
      if (!lead.isQualified) {
        dataToPush.column = {
          id: Math.random(),
          title: "Unqualified",
        };
      } else {
        dataToPush.column = lead.column;
      }

      const { Client, ...leadWithoutClient } = lead;
      leadsDataWithClient.push({
        ...leadWithoutClient,
        ...dataToPush,
        totalMessage: client?._count?.ClientSMS ?? 0,
      });
      ind++;
    }

    return leadsDataWithClient;
  } catch (error) {
    console.error("Error fetching leads for sales pipeline:", error);
    throw error;
  }
};

export async function updateLeadColumn(leadId: number, newColumnId: number) {
  try {
    const companyId = await getCompanyId();

    const updatedLead = await db.lead.update({
      where: {
        companyId: companyId,
        id: leadId,
      },
      data: {
        columnId: newColumnId,
        columnChangedAt: new Date(),
      },
      include: {
        column: true,
      },
    });

    if (updatedLead.column?.title === "Converted") {
      await sendLeadStageChangeOrCloseNotification({
        companyId,
        description: `Lead "${updatedLead.clientName}" has been closed. Track it in your pipeline.`,
        title: "Lead Closed",
        notificationType: "LEADS_CLOSED",
      });
    }

    await sendLeadStageChangeOrCloseNotification({
      companyId,
      description: `Lead "${updatedLead.clientName}" moved to "${updatedLead?.column?.title}". Track progress in Autoworx.`,
      title: "Lead Stage Changed",
      notificationType: "STAGE",
    });

    // revalidatePath("/dashboard/pipeline/sales/lead");
    // revalidatePath("/dashboard/pipeline/sales/pipeline");
    return updatedLead;
  } catch (error) {
    console.error("Error updating lead column:", error);
    throw error;
  }
}
