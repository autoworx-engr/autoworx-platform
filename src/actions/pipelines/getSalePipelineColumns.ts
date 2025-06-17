"use server";

import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { getLeads } from "./getLeads";
import { defaultSkip, defaultTake } from "@/constants/lead.constant";

// Fetch all columns by type
export const getSalePipelineColumns = async (
  type: string,
  searchTerm?: string,
) => {
  const companyId = await getCompanyId();
  let columns = await db.column.findMany({
    where: { type, companyId: companyId },
    orderBy: { order: "asc" },
  });

  const fetchColumnsWithLeads = await Promise.all(
    columns.map(async (column) => {
      const leads = await getLeads({
        searchTerm: searchTerm,
        columnId: column.id,
        take: defaultTake,
        skip: defaultSkip,
      });
      return {
        ...column,
        leads: leads,
      };
    }),
  );

  return fetchColumnsWithLeads;
};
