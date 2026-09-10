"use server";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { getDateRanges } from "./lib";

export const getSalespersonLeads = async (
  salespersonId: string,
  currentCompanyId?: number,
  timezone?: string,
) => {
  let companyId = currentCompanyId;

  if (!companyId) {
    companyId = await getCompanyId();
  }

  const emptyResult = {
    currentTotalLeads: 0,
    previousTotalLeads: 0,
    currentConvertedLeads: 0,
    previousConvertedLeads: 0,
  };

  try {
    const {
      currentMonthStart,
      currentMonthEnd,
      previousMonthStart,
      previousMonthEnd,
    } = getDateRanges(
      timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    );

    const convertedColumn = await db.column.findFirst({
      where: {
        title: "Converted",
        companyId,
      },
    });

    if (!convertedColumn) {
      console.error("Converted column not found for company", companyId);
      return emptyResult;
    }

    const assignedTo = {
      companyId,
      assignedSalesUserId: Number(salespersonId),
    };

    const [
      currentTotalLeads,
      previousTotalLeads,
      currentConvertedLeads,
      previousConvertedLeads,
    ] = await Promise.all([
      db.lead.count({
        where: {
          ...assignedTo,
          createdAt: { gte: currentMonthStart, lte: currentMonthEnd },
        },
      }),
      db.lead.count({
        where: {
          ...assignedTo,
          createdAt: { gte: previousMonthStart, lte: previousMonthEnd },
        },
      }),
      // Converted leads are counted by columnChangedAt to match the admin
      // dashboard metric — a lead created earlier can convert this month.
      db.lead.count({
        where: {
          ...assignedTo,
          columnId: convertedColumn.id,
          columnChangedAt: { gte: currentMonthStart, lte: currentMonthEnd },
        },
      }),
      db.lead.count({
        where: {
          ...assignedTo,
          columnId: convertedColumn.id,
          columnChangedAt: { gte: previousMonthStart, lte: previousMonthEnd },
        },
      }),
    ]);

    return {
      currentTotalLeads,
      previousTotalLeads,
      currentConvertedLeads,
      previousConvertedLeads,
    };
  } catch (error) {
    console.error("Error fetching salesperson leads:", error);
    return emptyResult;
  }
};
