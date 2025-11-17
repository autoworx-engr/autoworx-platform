"use server";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { sendLeadStageChangeOrCloseNotification } from "@/lib/notification/pipeline-notify";
import { LeadWithSalesUser } from "@/types/invoiceLead";
import { Prisma } from "@prisma/client";
import moment from "moment-timezone";
import { updatePipelineAutomationTrigger } from "../automation/pipeline/triggerPipelineAutomation";
import { getCompanyTimezone } from "../settings/getCompanyTimezone";
import { updateCommunicationAutomationTrigger } from "../automation/communication/triggerCommunicationAutomation";
import { updateTagAutomationTrigger } from "../automation/tag/triggerTagAutomation";

import { actionTypes } from "@/constants/lead.constant";

type TGetLeads = {
  columnId?: number;
  searchTerm?: string;
  take?: number;
  skip?: number;
};

type TGetLeadsWithCount = {
  columnId?: number;
  searchTerm?: string;
  take?: number;
  skip?: number;
  assignedTo?: string;
  source?: string;
  service?: string;
  status?: string;
  dateRange?: [Date | null, Date | null];
};

export const getLeads = async ({
  columnId,
  take,
  skip,
  searchTerm = "",
}: TGetLeads): Promise<LeadWithSalesUser[]> => {
  const companyId = await getCompanyId();
  const companyTimezone = await getCompanyTimezone();
  const timezone = companyTimezone?.timezone;

  try {
    const query: Prisma.LeadWhereInput = {
      companyId,
      ...(columnId && { columnId }),
      ...(searchTerm && {
        OR: [
          { clientName: { contains: searchTerm, mode: "insensitive" } },
          { vehicleInfo: { contains: searchTerm, mode: "insensitive" } },
          { services: { contains: searchTerm, mode: "insensitive" } },
          { source: { contains: searchTerm, mode: "insensitive" } },
        ],
      }),
    };

    const todayTimeString = moment()
      .tz(timezone ?? "")
      .startOf("day")
      .format("YYYY-MM-DDTHH:mm:ss");

    const now = moment().tz(timezone ?? "");

    const leadsData = await db.lead.findMany({
      where: query,
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
                  gte: `${todayTimeString}Z`,
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
            conversationsTrack: {
              select: {
                smsIsRead: true,
                emailIsRead: true,
              },
            },
          },
        },
      },
    });

    const vehicleIds = leadsData
      .map((lead) => lead.vehicleId)
      .filter((id): id is number => id !== null);

    const vehicles =
      vehicleIds.length > 0
        ? await db.vehicle.findMany({
            where: { id: { in: vehicleIds } },
          })
        : [];

    const vehicleMap = new Map(vehicles.map((v) => [v.id, v]));

    const leadsDataWithClient: LeadWithSalesUser[] = await Promise.all(
      leadsData.map(async (lead) => {
        let client = lead.Client.find(
          (client: any) =>
            client.companyId === companyId && client.leadId === lead.id
        );

        if (!client && lead.clientId) {
          client = (await db.client.findFirst({
            where: {
              companyId: companyId,
              id: lead.clientId,
            },
            include: {
              appointments: {
                where: {
                  date: {
                    gte: `${todayTimeString}Z`,
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
              conversationsTrack: {
                select: {
                  smsIsRead: true,
                  emailIsRead: true,
                },
              },
            },
          }))!;
        }

        const appointments = client?.appointments.filter((appointment: any) => {
          if (
            appointment.date &&
            appointment.endTime &&
            appointment.startTime
          ) {
            const end = moment.tz(
              `${moment(appointment.date).format("YYYY-MM-DD")}T${appointment.endTime}`,
              "YYYY-MM-DDTHH:mm",
              timezone ?? ""
            );

            // Show appointment only if endTime is same or after now
            return end.isSameOrAfter(now);
          }
          return false;
        });

        const vehicle = lead.vehicleId ? vehicleMap.get(lead.vehicleId) : null;

        const clientData = client
          ? {
              ...client,
              appointments,
              vehicle,
            }
          : null;

        const column = lead.isQualified
          ? lead.column
          : {
              id: Math.random(),
              title: "Unqualified",
              type: "sales",
              order: 0,
              textColor: null,
              bgColor: null,
              companyId: companyId,
            };

        const { Client, ...leadWithoutClient } = lead;

        const isShowConversationIndicator =
          client?.conversationsTrack &&
          (!client?.conversationsTrack?.smsIsRead ||
            !client?.conversationsTrack?.emailIsRead);

        return {
          ...leadWithoutClient,
          client: clientData,
          column,
          totalMessage: isShowConversationIndicator ? 1 : 0,
        };
      })
    );

    return leadsDataWithClient;
  } catch (error) {
    console.error("Error fetching leads for sales pipeline:", error);
    throw error;
  }
};
export const getLeadsWithCount = async ({
  columnId,
  take,
  skip,
  searchTerm = "",
  assignedTo,
  source,
  service,
  status,
  dateRange,
}: TGetLeadsWithCount): Promise<{
  leads: LeadWithSalesUser[];
  totalCount: number;
}> => {
  const companyId = await getCompanyId();
  const companyTimezone = await getCompanyTimezone();
  const timezone = companyTimezone?.timezone;
  try {
    const query: Prisma.LeadWhereInput = {
      companyId,
      ...(columnId && { columnId }),
      ...(searchTerm && {
        OR: [
          { clientName: { contains: searchTerm, mode: "insensitive" } },
          { vehicleInfo: { contains: searchTerm, mode: "insensitive" } },
          { services: { contains: searchTerm, mode: "insensitive" } },
          { source: { contains: searchTerm, mode: "insensitive" } },
        ],
      }),
      ...(assignedTo && { assignedSalesUserId: parseInt(assignedTo) }),
      ...(source && { source }),
      ...(service && { services: service }),
      ...(status && {
        column: {
          title: status,
        },
      }),
      ...(dateRange &&
        dateRange[0] &&
        dateRange[1] && {
          createdAt: {
            gte: new Date(dateRange[0]),
            lte: new Date(dateRange[1].getTime() + 24 * 60 * 60 * 1000 - 1), // End of day
          },
        }),
    };

    const todayTimeString = moment()
      .tz(timezone ?? "")
      .startOf("day")
      .format("YYYY-MM-DDTHH:mm:ss");

    const now = moment();
    const todayStart = moment(todayTimeString);

    const [totalCount, leadsData] = await Promise.all([
      db.lead.count({ where: query }),
      db.lead.findMany({
        where: query,
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
              conversationsTrack: {
                select: {
                  smsIsRead: true,
                  emailIsRead: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const vehicleIds = leadsData
      .map((lead) => lead.vehicleId)
      .filter((id): id is number => id !== null);

    const vehicles =
      vehicleIds.length > 0
        ? await db.vehicle.findMany({
            where: { id: { in: vehicleIds } },
          })
        : [];

    const vehicleMap = new Map(vehicles.map((v) => [v.id, v]));

    const leadsDataWithClient: LeadWithSalesUser[] = await Promise.all(
      leadsData.map(async (lead) => {
        let client = lead.Client.find(
          (client: any) =>
            client.companyId === companyId && client.leadId === lead.id
        );
        if (!client && lead.clientId) {
          client = (await db.client.findFirst({
            where: {
              companyId: companyId,
              id: lead.clientId,
            },
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
              conversationsTrack: {
                select: {
                  smsIsRead: true,
                  emailIsRead: true,
                },
              },
            },
          }))!;
        }
        const appointments = client?.appointments.filter((appointment: any) => {
          if (
            !appointment.date ||
            !moment(appointment.date).isSameOrAfter(todayStart)
          ) {
            return false;
          }

          if (
            moment(appointment.date).startOf("day").isSame(todayStart) &&
            appointment.endTime &&
            moment(appointment.endTime, "HH:mm").isBefore(now)
          ) {
            return false;
          }

          return true;
        });

        const vehicle = lead.vehicleId ? vehicleMap.get(lead.vehicleId) : null;

        const clientData = client
          ? {
              ...client,
              appointments,
              vehicle,
            }
          : null;

        const column = lead.isQualified
          ? lead.column
          : {
              id: Math.random(),
              title: "Unqualified",
              type: "sales",
              order: 0,
              textColor: null,
              bgColor: null,
              companyId: companyId,
            };

        const { Client, ...leadWithoutClient } = lead;

        const isShowConversationIndicator =
          client?.conversationsTrack &&
          (!client?.conversationsTrack?.smsIsRead ||
            !client?.conversationsTrack?.emailIsRead);

        return {
          ...leadWithoutClient,
          client: clientData,
          column,
          totalMessage: isShowConversationIndicator ? 1 : 0,
        };
      })
    );

    return { leads: await leadsDataWithClient, totalCount };
  } catch (error) {
    console.error("Error fetching leads for sales pipeline:", error);
    throw error;
  }
};

export const getLeadsWithCountOptimized = async ({
  columnId,
  take,
  skip,
  searchTerm = "",
  assignedTo,
  source,
  service,
  status,
  dateRange,
}: TGetLeadsWithCount): Promise<{
  leads: LeadWithSalesUser[];
  totalCount: number;
}> => {
  const companyId = await getCompanyId();
  const companyTimezone = await getCompanyTimezone();
  const timezone = companyTimezone?.timezone;

  try {
    const query: Prisma.LeadWhereInput = {
      companyId,
      ...(columnId && { columnId }),
      ...(searchTerm && {
        OR: [
          { clientName: { contains: searchTerm, mode: "insensitive" } },
          { vehicleInfo: { contains: searchTerm, mode: "insensitive" } },
          { services: { contains: searchTerm, mode: "insensitive" } },
          { source: { contains: searchTerm, mode: "insensitive" } },
        ],
      }),
      ...(assignedTo && { assignedSalesUserId: parseInt(assignedTo) }),
      ...(source && { source }),
      ...(service && { services: service }),
      ...(status && {
        column: {
          title: status,
        },
      }),
      ...(dateRange &&
        dateRange[0] &&
        dateRange[1] && {
          createdAt: {
            gte: new Date(dateRange[0]),
            lte: new Date(dateRange[1].getTime() + 24 * 60 * 60 * 1000 - 1),
          },
        }),
    };

    const todayTimeString = moment()
      .tz(timezone ?? "UTC")
      .startOf("day")
      .format("YYYY-MM-DDTHH:mm:ss");

    // Run count and data queries in parallel
    const [totalCount, leadsData] = await Promise.all([
      db.lead.count({ where: query }),
      db.lead.findMany({
        where: query,
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
          tasks: {
            take: 5, // Limit tasks to reduce payload
          },
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
                    gte: `${todayTimeString}Z`,
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
                take: 3, // Limit appointments
              },
              conversationsTrack: {
                select: {
                  smsIsRead: true,
                  emailIsRead: true,
                },
              },
            },
          },
        },
      }),
    ]);

    // Get all unique vehicle IDs in one query
    const vehicleIds = leadsData
      .map((lead) => lead.vehicleId)
      .filter((id): id is number => id !== null);

    const vehicles =
      vehicleIds.length > 0
        ? await db.vehicle.findMany({
            where: { id: { in: vehicleIds } },
          })
        : [];

    const vehicleMap = new Map(vehicles.map((v) => [v.id, v]));
    const now = moment().tz(timezone ?? "UTC");

    // Process leads more efficiently without additional database calls
    const leadsDataWithClient: LeadWithSalesUser[] = leadsData.map((lead) => {
      let client = lead.Client.find(
        (client: any) =>
          client.companyId === companyId && client.leadId === lead.id
      );

      const appointments = client?.appointments.filter((appointment: any) => {
        if (appointment.date && appointment.endTime && appointment.startTime) {
          const end = moment.tz(
            `${moment(appointment.date).format("YYYY-MM-DD")}T${appointment.endTime}`,
            "YYYY-MM-DDTHH:mm",
            timezone ?? ""
          );
          return end.isSameOrAfter(now);
        }
        return false;
      });

      const vehicle = lead.vehicleId ? vehicleMap.get(lead.vehicleId) : null;

      const clientData = client
        ? {
            ...client,
            appointments,
            vehicle,
          }
        : null;

      const column = lead.isQualified
        ? lead.column
        : {
            id: Math.random(),
            title: "Unqualified",
            type: "sales" as const,
            order: 0,
            textColor: null,
            bgColor: null,
            companyId: companyId,
          };

      const { Client, ...leadWithoutClient } = lead;

      const isShowConversationIndicator =
        client?.conversationsTrack &&
        (!client?.conversationsTrack?.smsIsRead ||
          !client?.conversationsTrack?.emailIsRead);

      return {
        ...leadWithoutClient,
        client: clientData,
        column,
        totalMessage: isShowConversationIndicator ? 1 : 0,
      } as LeadWithSalesUser;
    });

    return {
      leads: leadsDataWithClient,
      totalCount,
    };
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
      sendLeadStageChangeOrCloseNotification({
        companyId,
        description: `Lead "${updatedLead.clientName}" has been closed. Track it in your pipeline.`,
        title: "Lead Closed",
        notificationType: "LEADS_CLOSED",
      });
    }

    sendLeadStageChangeOrCloseNotification({
      companyId,
      description: `Lead "${updatedLead.clientName}" moved to "${updatedLead?.column?.title}". Track progress in Autoworx.`,
      title: "Lead Stage Changed",
      notificationType: "STAGE",
    });

    try {
      await updatePipelineAutomationTrigger({
        companyId: companyId,
        condition: "TIME_DELAY",
        leadId: leadId,
        columnId: newColumnId,
      });
    } catch (error) {
      console.log("updatePipelineAutomationTrigger error", error);
    }

    // communication automation trigger
    try {
      await updateCommunicationAutomationTrigger({
        companyId: companyId,
        leadId: leadId,
        columnId: newColumnId,
      });
    } catch (error) {
      console.log("updateCommunicationAutomationTrigger error", error);
    }

    const response = await updateTagAutomationTrigger({
      columnId: newColumnId,
      companyId: companyId,
      pipelineType: "SALES",
      leadId: leadId,
      conditionType: "post_tag",
    });

    // if (response?.success) {
    //   console.log("response", response?.data);
    //   dispatch({
    //     type: actionTypes.AUTOMATION_TRIGGER,
    //     payload: {
    //       columnId: newColumnId,
    //       leadId,
    //       tag: selectedTag,
    //     },
    //   });
    // }

    // revalidatePath("/dashboard/pipeline/sales/lead");
    // revalidatePath("/dashboard/pipeline/sales/pipeline");
    return updatedLead;
  } catch (error) {
    console.error("Error updating lead column:", error);
    throw error;
  }
}

// get leads count by column id
export async function getLeadsCountByColumnId(
  columnId: number,
  companyId: number,
  searchTerm?: string
) {
  try {
    const totalLeadCount = await db.lead.count({
      where: {
        columnId: columnId,
        companyId: companyId,
        ...(searchTerm && {
          OR: [
            { clientName: { contains: searchTerm, mode: "insensitive" } },
            { vehicleInfo: { contains: searchTerm, mode: "insensitive" } },
            { services: { contains: searchTerm, mode: "insensitive" } },
            { source: { contains: searchTerm, mode: "insensitive" } },
          ],
        }),
      },
    });
    return totalLeadCount;
  } catch (error) {
    console.error("Error fetching leads count by column id:", error);
    throw error;
  }
}
