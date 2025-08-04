"use server";
import { startOfMonth, endOfMonth } from "date-fns";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";

export const getSalespersonLeads = async (salespersonId: string) => {
  const companyId = await getCompanyId();
  try {
    const convertedColumn = await db.column.findFirst({
      where: {
        title: "Converted",
        companyId,
      },
    });

    if (!convertedColumn) {
      throw new Error("Converted column not found");
    }

    const startOfCurrentMonth = startOfMonth(new Date());
    const endOfCurrentMonth = endOfMonth(new Date());
    const startOfPreviousMonth = startOfMonth(new Date(new Date().setMonth(new Date().getMonth() - 1)));
    const endOfPreviousMonth = endOfMonth(new Date(new Date().setMonth(new Date().getMonth() - 1)));

    const currentTotalLeads = await db.lead.count({
      where: {
        companyId,
        assignedSalesUserId: Number(salespersonId),
        createdAt: {
          gte: startOfCurrentMonth,
          lte: endOfCurrentMonth,
        },
      },
    });

    const previousTotalLeads = await db.lead.count({
      where: {
        companyId,
        assignedSalesUserId: Number(salespersonId),
        createdAt: {
          gte: startOfPreviousMonth,
          lte: endOfPreviousMonth,
        },
      },
    });

    const currentConvertedLeads = await db.lead.count({
      where: {
        companyId,
        assignedSalesUserId: Number(salespersonId),
        columnId: convertedColumn.id,
        createdAt: {
          gte: startOfCurrentMonth,
          lte: endOfCurrentMonth,
        },
      },
    });

    const previousConvertedLeads = await db.lead.count({
      where: {
        companyId,
        assignedSalesUserId: Number(salespersonId),
        columnId: convertedColumn.id,
        createdAt: {
          gte: startOfPreviousMonth,
          lte: endOfPreviousMonth,
        },
      },
    });

    return {
      currentTotalLeads,
      previousTotalLeads,
      currentConvertedLeads,
      previousConvertedLeads,
    };
  } catch (error) {
    console.error("Error fetching salesperson leads:", error);
    throw error;
  }
};