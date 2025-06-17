"use server";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { sendLeadStageChangeOrCloseNotification } from "@/lib/notification/pipeline-notify";
import { LeadWithSalesUser } from "@/types/invoiceLead";
import { Client, Prisma, Vehicle } from "@prisma/client";
import moment from "moment-timezone";
import { updatePipelineAutomationTrigger } from "../automation/pipeline/triggerPipelineAutomation";
import { updateCommunicationAutomationTrigger } from "../automation/communication/triggerCommunicationAutomation";

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
    const query: Prisma.LeadWhereInput = {
      companyId,
      ...(columnId && { columnId }),
      ...(searchTerm && {
        clientName: {
          contains: searchTerm,
        },
      }),
    };

    const timezone = moment.tz.guess();
    const todayTimeString = moment()
      .tz(timezone)
      .startOf("day")
      .format("YYYY-MM-DDTHH:mm:ss");

    const now = moment();
    const todayStart = moment(todayTimeString);

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

    const leadsDataWithClient: LeadWithSalesUser[] = leadsData.map((lead) => {
      const client = lead.Client.find(
        (client: any) =>
          client.companyId === companyId && client.leadId === lead.id,
      );

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

      return {
        ...leadWithoutClient,
        client: clientData,
        column,
        totalMessage: client?._count?.ClientSMS ?? 0,
      };
    });

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

    try {
      await updatePipelineAutomationTrigger({
        companyId: companyId,
        condition: "TIME_DELAY",
        leadId: leadId,
        columnId: newColumnId,
      });
    } catch (error) {}

    // communication automation trigger
    try {
      await updateCommunicationAutomationTrigger({
        companyId: companyId,
        leadId: leadId,
        columnId: newColumnId,
      });
    } catch (error) {}

    // revalidatePath("/dashboard/pipeline/sales/lead");
    // revalidatePath("/dashboard/pipeline/sales/pipeline");
    return updatedLead;
  } catch (error) {
    console.error("Error updating lead column:", error);
    throw error;
  }
}
