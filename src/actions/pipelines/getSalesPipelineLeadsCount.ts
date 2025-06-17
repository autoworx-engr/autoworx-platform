"use server";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";

export async function getSalesPipelineLeadsCount(columnId: number) {
  try {
    const companyId = await getCompanyId();
    const leadsCount = await db.lead.count({
      where: {
        companyId,
        columnId,
      },
    });
    return leadsCount ?? 0;
  } catch (error) {
    console.error("Error fetching sales pipeline leads count:", error);
    throw error;
  }
}
