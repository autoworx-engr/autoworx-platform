"use server";

import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { getLeads, getLeadsCountByColumnId } from "./getLeads";
import { defaultSkip, defaultTake } from "@/constants/lead.constant";

// Fetch all columns by type with initial 10 leads per column for fast loading
export const getSalePipelineColumns = async (
  type: string,
  searchTerm?: string,
  initialLoad: boolean = true,
  orderBy?: "asc" | "desc",
  companyIdOverride?: number,
) => {
  const companyId = companyIdOverride ?? (await getCompanyId());
  let columns = await db.column.findMany({
    where: { type, companyId: companyId },
    orderBy: { order: "asc" },
  });

  const fetchColumnsWithLeads = await Promise.all(
    columns.map(async (column) => {
      const leadsPromise = getLeads({
        searchTerm: searchTerm,
        orderBy: orderBy,
        columnId: column.id,
        companyId,
        // For initial load, fetch only 10 leads per column for faster perceived performance
        ...(initialLoad && { take: defaultTake, skip: defaultSkip }),
        // For subsequent loads, fetch all leads (no pagination)
      });

      // Get total count with same search criteria for accurate pagination
      const totalLeadsPromise = getLeadsCountByColumnId(
        column.id,
        companyId,
        searchTerm,
      );
      const [leads, totalLeads] = await Promise.all([
        leadsPromise,
        totalLeadsPromise,
      ]);
      return {
        ...column,
        leads: leads,
        totalLeads,
        hasMoreLeads: initialLoad && totalLeads > defaultTake,
      };
    }),
  );

  return fetchColumnsWithLeads;
};

// Function to fetch remaining leads for a specific column
export const getColumnRemainingLeads = async (
  columnId: number,
  searchTerm?: string,
  skip: number = defaultTake,
  orderBy?: "asc" | "desc",
) => {
  const leads = await getLeads({
    searchTerm: searchTerm,
    columnId: columnId,
    skip: skip,
    orderBy: orderBy,
    // No take limit to fetch all remaining leads
  });

  return leads;
};
