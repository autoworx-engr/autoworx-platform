"use server";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { sendLeadStageChangeOrCloseNotification } from "@/lib/notification/pipeline-notify";
import { LeadWithSalesUser } from "@/types/invoiceLead";
import { Prisma } from "@prisma/client";
import moment from "moment-timezone";
import { revalidatePath } from "next/cache";
import { updateCommunicationAutomationTrigger } from "../automation/communication/triggerCommunicationAutomation";
import { updatePipelineAutomationTrigger } from "../automation/pipeline/triggerPipelineAutomation";
import { updateTagAutomationTrigger } from "../automation/tag/triggerTagAutomation";
import { getCompanyTimezone } from "../settings/getCompanyTimezone";
import {
  buildUpcomingAppointmentFilter,
  upcomingAppointmentOrderBy,
} from "./_upcomingAppointmentFilter";

type TGetLeads = {
  columnId?: number;
  orderBy?: "asc" | "desc";
  searchTerm?: string;
  take?: number;
  skip?: number;
  companyId?: number;
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
  orderBy?: "asc" | "desc";
  // YYYY-MM-DD strings so the action can parse them directly in the company
  // timezone — avoids off-by-one-day errors when browser tz ≠ company tz.
  dateRange?: [string | null, string | null];
  // Explicit company override for callers without a next-auth session (mobile /
  // external Bearer-token requests) where getCompanyId() would return undefined.
  companyId?: number;
  // Exclude leads removed from the pipeline (columnId === null) so paginated
  // totalCount/take match what mobile's list actually renders. Opt-in: the web
  // Sales Leads table still shows no-stage leads as "Unqualified".
  excludeNoStage?: boolean;
};

function makeLeadSearchCondition(searchTerm?: string) {
  if (!searchTerm?.trim()) return null;
  const words = searchTerm.trim().split(/\s+/);
  const makeWordCondition = (word: string) => {
    const ci = { contains: word, mode: "insensitive" as const };
    return {
      OR: [
        { clientName: ci },
        { vehicleInfo: ci },
        { services: ci },
        { source: ci },
        { Client: { some: { firstName: ci } } },
        { Client: { some: { lastName: ci } } },
      ],
    };
  };
  return words.length === 1
    ? makeWordCondition(words[0])
    : { AND: words.map(makeWordCondition) };
}

export const getLeads = async ({
  columnId,
  orderBy,
  take,
  skip,
  searchTerm = "",
  companyId: companyIdOverride,
}: TGetLeads): Promise<LeadWithSalesUser[]> => {
  const companyId = companyIdOverride ?? (await getCompanyId());
  const companyTimezone = await getCompanyTimezone();
  const timezone = companyTimezone?.timezone;

  try {
    const searchCond = makeLeadSearchCondition(searchTerm);
    const query: Prisma.LeadWhereInput = {
      companyId,
      ...(columnId && { columnId }),
      ...(searchCond ?? {}),
    };

    const upcomingApptFilter = buildUpcomingAppointmentFilter(timezone);
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
              where: upcomingApptFilter,
              orderBy: upcomingAppointmentOrderBy,
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
            Invoice: {
              where: { type: "Estimate" },
              select: { id: true },
              orderBy: { createdAt: "asc" },
              take: 1,
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
                where: upcomingApptFilter,
                orderBy: upcomingAppointmentOrderBy,
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
              Invoice: {
                where: { type: "Estimate" },
                select: { id: true },
                orderBy: { createdAt: "asc" },
                take: 1,
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
          invoiceId: client?.Invoice?.[0]?.id ?? null,
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
  orderBy,
  dateRange,
}: TGetLeadsWithCount): Promise<{
  leads: LeadWithSalesUser[];
  totalCount: number;
}> => {
  const companyId = await getCompanyId();
  const companyTimezone = await getCompanyTimezone();
  const timezone = companyTimezone?.timezone;
  try {
    const searchCond = makeLeadSearchCondition(searchTerm);
    const query: Prisma.LeadWhereInput = {
      companyId,
      ...(columnId && { columnId }),
      ...(searchCond ?? {}),
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
          // Converted leads use columnChangedAt to match the admin dashboard metric
          // (when the lead moved to Converted), not when it was created.
          ...(status === "Converted"
            ? {
                columnChangedAt: {
                  gte: moment
                    .tz(dateRange[0], "YYYY-MM-DD", timezone ?? "UTC")
                    .startOf("day")
                    .toDate(),
                  lte: moment
                    .tz(dateRange[1], "YYYY-MM-DD", timezone ?? "UTC")
                    .endOf("day")
                    .toDate(),
                },
              }
            : {
                createdAt: {
                  gte: moment
                    .tz(dateRange[0], "YYYY-MM-DD", timezone ?? "UTC")
                    .startOf("day")
                    .toDate(),
                  lte: moment
                    .tz(dateRange[1], "YYYY-MM-DD", timezone ?? "UTC")
                    .endOf("day")
                    .toDate(),
                },
              }),
        }),
    };

    const upcomingApptFilter = buildUpcomingAppointmentFilter(timezone);

    const [totalCount, leadsData] = await Promise.all([
      db.lead.count({ where: query }),
      db.lead.findMany({
        where: query,
        take,
        skip,
        orderBy: {
          createdAt: orderBy ?? "desc",
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
                where: upcomingApptFilter,
                orderBy: upcomingAppointmentOrderBy,
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
              Invoice: {
                where: { type: "Estimate" },
                select: { id: true },
                orderBy: { createdAt: "asc" },
                take: 1,
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
                where: upcomingApptFilter,
                orderBy: upcomingAppointmentOrderBy,
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
              Invoice: {
                where: { type: "Estimate" },
                select: { id: true },
                orderBy: { createdAt: "desc" },
                take: 1,
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
          invoiceId: client?.Invoice?.[0]?.id ?? null,
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
  orderBy,
  dateRange,
  companyId: companyIdOverride,
  excludeNoStage,
}: TGetLeadsWithCount): Promise<{
  leads: LeadWithSalesUser[];
  totalCount: number;
}> => {
  const companyId = companyIdOverride ?? (await getCompanyId());
  const companyTimezone = await getCompanyTimezone(companyId);
  const timezone = companyTimezone?.timezone;

  try {
    const searchCond = makeLeadSearchCondition(searchTerm);
    let columnIdFilter: Prisma.LeadWhereInput = {};
    if (columnId) {
      columnIdFilter = { columnId };
    } else if (excludeNoStage) {
      columnIdFilter = { columnId: { not: null } };
    }

    const query: Prisma.LeadWhereInput = {
      companyId,
      ...columnIdFilter,
      ...(searchCond ?? {}),
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
          // Converted leads use columnChangedAt to match the admin dashboard metric
          // (when the lead moved to Converted), not when it was created.
          ...(status === "Converted"
            ? {
                columnChangedAt: {
                  gte: moment
                    .tz(dateRange[0], "YYYY-MM-DD", timezone ?? "UTC")
                    .startOf("day")
                    .toDate(),
                  lte: moment
                    .tz(dateRange[1], "YYYY-MM-DD", timezone ?? "UTC")
                    .endOf("day")
                    .toDate(),
                },
              }
            : {
                createdAt: {
                  gte: moment
                    .tz(dateRange[0], "YYYY-MM-DD", timezone ?? "UTC")
                    .startOf("day")
                    .toDate(),
                  lte: moment
                    .tz(dateRange[1], "YYYY-MM-DD", timezone ?? "UTC")
                    .endOf("day")
                    .toDate(),
                },
              }),
        }),
    };

    const upcomingApptFilter = buildUpcomingAppointmentFilter(timezone);

    // Run count and data queries in parallel
    const [totalCount, leadsData] = await Promise.all([
      db.lead.count({ where: query }),
      db.lead.findMany({
        where: query,
        take,
        skip,
        orderBy: {
          createdAt: orderBy ?? "desc",
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
          _count: {
            select: { tasks: true },
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
                where: upcomingApptFilter,
                orderBy: upcomingAppointmentOrderBy,
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
              Invoice: {
                where: { type: "Estimate" },
                select: { id: true },
                orderBy: { createdAt: "asc" },
                take: 1,
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

    const matchesLead = (
      client: { companyId: number; leadId: number | null },
      leadId: number,
    ) => client.companyId === companyId && client.leadId === leadId;

    // The Client reverse relation only covers clients that point back at the
    // lead (client.leadId). A lead linked the other way round — lead.clientId
    // set, e.g. an existing client attached to the lead afterwards — misses it
    // and would come back client-less, so those ids are resolved here in one
    // batched query rather than per lead.
    const unlinkedClientIds = Array.from(
      new Set(
        leadsData
          .filter((lead) => !lead.Client.some((c) => matchesLead(c, lead.id)))
          .map((lead) => lead.clientId)
          .filter((id): id is number => id !== null),
      ),
    );

    const unlinkedClients =
      unlinkedClientIds.length > 0
        ? await db.client.findMany({
            where: { companyId, id: { in: unlinkedClientIds } },
            include: {
              appointments: {
                where: upcomingApptFilter,
                orderBy: upcomingAppointmentOrderBy,
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
              Invoice: {
                where: { type: "Estimate" },
                select: { id: true },
                orderBy: { createdAt: "asc" },
                take: 1,
              },
            },
          })
        : [];

    const unlinkedClientMap = new Map(unlinkedClients.map((c) => [c.id, c]));

    // Process leads without per-lead database calls
    const leadsDataWithClient: LeadWithSalesUser[] = leadsData.map((lead) => {
      const client =
        lead.Client.find((c) => matchesLead(c, lead.id)) ??
        (lead.clientId ? unlinkedClientMap.get(lead.clientId) : undefined);

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
        invoiceId: client?.Invoice?.[0]?.id ?? null,
        taskCount: lead._count?.tasks ?? 0,
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
      console.log("error", error);
      console.log("updateCommunicationAutomationTrigger error", error);
    }

    const response = await updateTagAutomationTrigger({
      columnId: newColumnId,
      companyId: companyId,
      pipelineType: "SALES",
      leadId: leadId,
      conditionType: "post_tag",
    });

    revalidatePath("/dashboard/pipeline/sales/pipeline");

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

// get leads count by column id
export async function getLeadsCountByColumnId(
  columnId: number,
  companyId: number,
  searchTerm?: string,
) {
  try {
    const searchCond = makeLeadSearchCondition(searchTerm);
    const totalLeadCount = await db.lead.count({
      where: {
        columnId: columnId,
        companyId: companyId,
        ...(searchCond ?? {}),
      },
    });
    return totalLeadCount;
  } catch (error) {
    console.error("Error fetching leads count by column id:", error);
    throw error;
  }
}
