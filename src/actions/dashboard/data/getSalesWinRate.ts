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
    currentAssignedLeads: 0,
    previousAssignedLeads: 0,
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

    // Win/loss is measured over the leads assigned to this salesperson in the
    // month: the converted counts are the same cohort narrowed to the
    // Converted column, so the rate can never exceed 100%.
    const [
      currentAssignedLeads,
      previousAssignedLeads,
      currentConvertedLeads,
      previousConvertedLeads,
    ] = await Promise.all([
      db.lead.count({
        where: {
          ...assignedTo,
          assignedDate: { gte: currentMonthStart, lte: currentMonthEnd },
        },
      }),
      db.lead.count({
        where: {
          ...assignedTo,
          assignedDate: { gte: previousMonthStart, lte: previousMonthEnd },
        },
      }),
      db.lead.count({
        where: {
          ...assignedTo,
          columnId: convertedColumn.id,
          assignedDate: { gte: currentMonthStart, lte: currentMonthEnd },
        },
      }),
      db.lead.count({
        where: {
          ...assignedTo,
          columnId: convertedColumn.id,
          assignedDate: { gte: previousMonthStart, lte: previousMonthEnd },
        },
      }),
    ]);

    return {
      currentAssignedLeads,
      previousAssignedLeads,
      currentConvertedLeads,
      previousConvertedLeads,
    };
  } catch (error) {
    console.error("Error fetching salesperson leads:", error);
    return emptyResult;
  }
};
