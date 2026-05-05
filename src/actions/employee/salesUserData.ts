"use server";

import { db } from "@/lib/db";
import {
  differenceInHours,
  eachMonthOfInterval,
  endOfMonth,
  startOfMonth,
} from "date-fns";

import { getCompanyId } from "@/lib/companyId";
import { getDateRanges, growthRate } from "../dashboard/data/lib";

export async function salesUserData(timezone: string, salesUserId: number) {
  const convertedLeadsPerMonth = await getConvertedLeadsPerMonth(salesUserId);
  const { currentMonthStart, currentMonthEnd } = getDateRanges(timezone);
  const averageConversionTime = await getAverageConversionTime(
    salesUserId,
    currentMonthStart,
    currentMonthEnd,
  );
  const leadToOpportunityRatio = await getLeadToOpportunityRatio(
    salesUserId,
    currentMonthStart,
    currentMonthEnd,
  );
  const avgResponseTime = await getAverageTimeToContact(
    salesUserId,
    currentMonthStart,
    currentMonthEnd,
  );
  const averageDealSize = await getAverageDealSize(
    timezone,
    salesUserId,
    currentMonthStart,
    currentMonthEnd,
  );
  const totalEngaged = await getTotalEngaged(
    salesUserId,
    currentMonthStart,
    currentMonthEnd,
  );
  const growthRates = await getGrowthRates(timezone, salesUserId);

  return {
    convertedLeadsPerMonth,
    averageConversionTime,
    leadToOpportunityRatio,
    avgResponseTime,
    growthRates,
    averageDealSize,
    totalEngaged,
  };
}

export async function getAverageDealSize(
  timezone: string,
  salesUserId: number,
  startDate?: Date,
  endDate?: Date,
): Promise<number> {
  const companyId = await getCompanyId();
  const { currentMonthStart, currentMonthEnd } = getDateRanges(timezone);
  // Get all the leads for this month and this company
  const leads = await db.lead.findMany({
    where: {
      assignedSalesUserId: salesUserId,
      companyId,
      column: {
        title: "Converted",
      },
      assignedDate: {
        gte: startDate ?? currentMonthStart,
        lte: endDate ?? currentMonthEnd,
      },
    },
  });

  const clients = await Promise.all(
    leads.map(async (lead) => {
      const client = await db.client.findFirst({
        where: {
          companyId,
          leadId: lead.id,
        },
        include: {
          Invoice: {
            select: {
              grandTotal: true,
            },
          },
        },
      });
      return client;
    }),
  );

  const allInvoiceGrandTotal = clients
    .map((client) => {
      if (client && client.Invoice.length > 0) {
        return client.Invoice.reduce(
          (sum, invoice) => sum + (Number(invoice?.grandTotal) || 0),
          0,
        );
      }
      return null;
    })
    .reduce((acc: number, curr) => acc + (curr ? Number(curr) : 0), 0);

  const overallInvoice = clients.reduce((count, client) => {
    return count + (client?.Invoice?.length || 0);
  }, 0);

  // Extract the invoices
  // const invoiceGrandTotals = leads.flatMap(lead =>
  //     lead.Client.flatMap(client =>
  //         client.Invoice.map(invoice => invoice.grandTotal)
  //     )
  // );

  // Calculate and return only the average
  return overallInvoice === 0 ? 0 : allInvoiceGrandTotal / overallInvoice;
}

export const getConvertedLeadsPerMonth = async (
  salesUserId: number,
): Promise<{ month: string; converted: number }[]> => {
  const currentYear = new Date().getFullYear();
  const months = eachMonthOfInterval({
    start: new Date(currentYear, 0, 1),
    end: new Date(currentYear, 11, 31),
  });

  const convertedLeadsData = await Promise.all(
    months.map(async (month) => {
      const startOfMonthDate = startOfMonth(month);
      const endOfMonthDate = endOfMonth(month);

      const convertedLeads = await db.lead.count({
        where: {
          assignedSalesUserId: salesUserId,
          column: {
            title: "Converted",
          },
          assignedDate: {
            gte: startOfMonthDate,
            lte: endOfMonthDate,
          },
        },
      });

      return {
        month: month.toLocaleString("default", { month: "short" }),
        converted: convertedLeads,
      };
    }),
  );

  return convertedLeadsData;
};

export const getAverageConversionTime = async (
  salesUserId: number,
  startDate?: Date,
  endDate?: Date,
): Promise<number> => {
  const convertedColumn = await db.column.findFirst({
    where: {
      title: "Converted",
    },
    select: {
      id: true,
    },
  });

  const leads = await db.lead.findMany({
    where: {
      assignedSalesUserId: salesUserId,
      columnId: convertedColumn?.id,
      columnChangedAt: {
        not: null,
      },
      assignedDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      createdAt: true,
      columnChangedAt: true,
    },
  });

  if (leads.length === 0) return 0;

  const totalHours = leads.reduce((sum, lead) => {
    return (
      sum +
      differenceInHours(
        new Date(lead.columnChangedAt ?? new Date()),
        new Date(lead.createdAt),
      )
    );
  }, 0);

  return parseFloat((totalHours / leads.length).toFixed(2));
};

export const getLeadToOpportunityRatio = async (
  salesUserId: number,
  startDate?: Date,
  endDate?: Date,
): Promise<number> => {
  const companyId = await getCompanyId();

  const totalAssignedLeads = await db.lead.findMany({
    where: {
      companyId,
      assignedSalesUserId: salesUserId,
      assignedDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      clientId: true,
    },
  });

  const totalSalesUserAppointmentCreate = await db.appointment.findMany({
    where: {
      companyId,
      userId: salesUserId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      clientId: true,
    },
  });

  const totalLeadAppointmentCreate = totalAssignedLeads.filter((lead) => {
    return totalSalesUserAppointmentCreate.some(
      (appointment) => appointment.clientId === lead.clientId,
    );
  });

  if (totalAssignedLeads?.length === 0) return 0;
  const leadToOpportunityRatio = parseFloat(
    (
      (totalLeadAppointmentCreate?.length / totalAssignedLeads?.length) *
      100
    ).toFixed(2),
  );
  return leadToOpportunityRatio;
};

export const getAverageTimeToContact = async (
  salesUserId: number,
  startDate?: Date,
  endDate?: Date,
): Promise<number> => {
  const ongoingColumn = await db.column.findFirst({
    where: {
      title: "Ongoing",
    },
    select: {
      id: true,
    },
  });

  const leads = await db.lead.findMany({
    where: {
      assignedSalesUserId: salesUserId,
      columnId: ongoingColumn?.id,
      columnChangedAt: {
        not: null,
      },
      assignedDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      createdAt: true,
      columnChangedAt: true,
    },
  });

  if (leads.length === 0) return 0;

  const totalHours = leads.reduce((sum, lead) => {
    return (
      sum +
      differenceInHours(
        new Date(lead.columnChangedAt ?? new Date()),
        new Date(lead.createdAt),
      )
    );
  }, 0);

  return totalHours / leads.length;
};

//total engaged
export const getTotalEngaged = async (
  salesUserId: number,
  startDate?: Date,
  endDate?: Date,
): Promise<number> => {
  const totalLeads = await db.lead.count({
    where: {
      assignedSalesUserId: salesUserId,
      assignedDate: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  return totalLeads;
};

export const getGrowthRates = async (timezone: string, salesUserId: number) => {
  const {
    currentMonthStart,
    currentMonthEnd,
    previousMonthStart,
    previousMonthEnd,
  } = getDateRanges(timezone);
  const previousAverageConversionTime = await getAverageConversionTime(
    salesUserId,
    previousMonthStart,
    previousMonthEnd,
  );
  const currentAverageConversionTime = await getAverageConversionTime(
    salesUserId,
    currentMonthStart,
    currentMonthEnd,
  );

  const previousLeadToOpportunityRatio = await getLeadToOpportunityRatio(
    salesUserId,
    previousMonthStart,
    previousMonthEnd,
  );
  const currentLeadToOpportunityRatio = await getLeadToOpportunityRatio(
    salesUserId,
    currentMonthStart,
    currentMonthEnd,
  );

  const previousAvgResponseTime = await getAverageTimeToContact(
    salesUserId,
    previousMonthStart,
    previousMonthEnd,
  );
  const currentAvgResponseTime = await getAverageTimeToContact(
    salesUserId,
    currentMonthStart,
    currentMonthEnd,
  );
  const currentAvagDealsize = await getAverageDealSize(
    timezone,
    salesUserId,
    currentMonthStart,
    currentMonthEnd,
  );
  const previousAvagDealsize = await getAverageDealSize(
    timezone,
    salesUserId,
    previousMonthStart,
    previousMonthEnd,
  );
  const currentMonthEngaged = await getTotalEngaged(
    salesUserId,
    currentMonthStart,
    currentMonthEnd,
  );
  const previousMonthEngaged = await getTotalEngaged(
    salesUserId,
    previousMonthStart,
    previousMonthEnd,
  );

  return {
    averageConversionTimeGR: growthRate(
      currentAverageConversionTime,
      previousAverageConversionTime,
    ),
    leadToOpportunityRatioGR: growthRate(
      currentLeadToOpportunityRatio,
      previousLeadToOpportunityRatio,
    ),
    avgResponseTimeGR: growthRate(
      currentAvgResponseTime,
      previousAvgResponseTime,
    ),
    averageDealSizeGR: growthRate(currentAvagDealsize, previousAvagDealsize),
    totalEngagedGR: growthRate(currentMonthEngaged, previousMonthEngaged),
  };
};
