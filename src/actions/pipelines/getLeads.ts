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
import { revalidatePath } from "next/cache";

import { actionTypes } from "@/constants/lead.constant";

type TGetLeads = {
  columnId?: number;
  orderBy?: "asc" | "desc";
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
  orderBy,
  take,
  skip,
  searchTerm = "",
}: TGetLeads): Promise<LeadWithSalesUser[]> => {
  const companyId = await getCompanyId();
  const companyTimezone = await getCompanyTimezone();
  const timezone = companyTimezone?.timezone;
  console.log("orderBy from getLeads", orderBy);

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
    // console.log({ orderBy });

    const leadsData = await db.lead.findMany({
      where: query,
      take,
      skip,
      orderBy: {
        createdAt: orderBy,
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
                date: { gte: moment(todayTimeString) as any },
              },
              orderBy: {
                date: "asc",
              },
              take: 1,
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
            client.companyId === companyId && client.leadId === lead.id,
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
                  date: { gte: moment(todayTimeString) as any },
                },
                orderBy: {
                  date: "asc",
                },
                take: 1,
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

        const appointments = client?.appointments ?? [];

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
      }),
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
            gte: moment
              .tz(dateRange[0], timezone ?? "UTC")
              .startOf("day")
              .toDate(),
            lte: moment
              .tz(dateRange[1], timezone ?? "UTC")
              .endOf("day")
              .toDate(),
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
                  date: { gte: moment(todayTimeString) as any },
                },
                orderBy: {
                  date: "asc",
                },
                take: 1,
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
            client.companyId === companyId && client.leadId === lead.id,
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
                  date: { gte: moment(todayTimeString) as any },
                },
                orderBy: {
                  date: "asc",
                },
                take: 1,
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
        const appointments = client?.appointments ?? [];

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
        };
      }),
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
            gte: moment
              .tz(dateRange[0], timezone ?? "UTC")
              .startOf("day")
              .toDate(),
            lte: moment
              .tz(dateRange[1], timezone ?? "UTC")
              .endOf("day")
              .toDate(),
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
                  date: { gte: moment(todayTimeString) as any },
                },
                orderBy: {
                  date: "asc",
                },
                take: 1,
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

    // Process leads more efficiently without additional database calls
    const leadsDataWithClient: LeadWithSalesUser[] = leadsData.map((lead) => {
      let client = lead.Client.find(
        (client: any) =>
          client.companyId === companyId && client.leadId === lead.id,
      );

      const appointments = client?.appointments ?? [];

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
    revalidatePath("/dashboard/pipeline/sales/pipeline");

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

    return updatedLead;
  } catch (error) {
    console.error("Error updating lead column:", error);
    throw error;
  }
}

type TLeadFilterOptions = {
  services: string[];
  sources: string[];
  statuses: string[];
  salesUsers: { id: number; firstName: string; lastName: string | null }[];
};

export const getLeadFilterOptions = async (): Promise<TLeadFilterOptions> => {
  const companyId = await getCompanyId();

  const [servicesData, sourcesData, columnGroupData, salesUsersData] =
    await Promise.all([
      db.lead.findMany({
        where: { companyId, services: { not: null } },
        select: { services: true },
        distinct: ["services"],
      }),
      db.lead.findMany({
        where: { companyId, source: { not: null } },
        select: { source: true },
        distinct: ["source"],
      }),
      db.lead.groupBy({
        by: ["columnId"],
        where: { companyId, columnId: { not: null } },
      }),
      db.lead.findMany({
        where: { companyId, assignedSalesUserId: { not: null } },
        select: {
          assignedSalesUserId: true,
          salesUser: { select: { id: true, firstName: true, lastName: true } },
        },
        distinct: ["assignedSalesUserId"],
      }),
    ]);

  const columnIds = columnGroupData
    .map((g) => g.columnId)
    .filter((id): id is number => id !== null);

  const columnsData =
    columnIds.length > 0
      ? await db.column.findMany({
          where: { id: { in: columnIds } },
          select: { title: true },
        })
      : [];

  return {
    services: servicesData.map((l) => l.services).filter(Boolean) as string[],
    sources: sourcesData.map((l) => l.source).filter(Boolean) as string[],
    statuses: [...new Set(columnsData.map((c) => c.title))],
    salesUsers: salesUsersData.map((l) => l.salesUser).filter(Boolean) as {
      id: number;
      firstName: string;
      lastName: string | null;
    }[],
  };
};

// get leads count by column id
export async function getLeadsCountByColumnId(
  columnId: number,
  companyId: number,
  searchTerm?: string,
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
