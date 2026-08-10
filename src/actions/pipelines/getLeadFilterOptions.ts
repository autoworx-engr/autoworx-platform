"use server";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";

export type LeadFilterOptions = {
  sources: string[];
  services: string[];
};

export const getLeadFilterOptions = async (): Promise<LeadFilterOptions> => {
  const companyId = await getCompanyId();

  const [sourceRows, serviceRows] = await Promise.all([
    db.lead.findMany({
      where: {
        companyId,
        source: { notIn: [""] },
      },
      distinct: ["source"],
      select: { source: true },
    }),
    db.lead.findMany({
      where: {
        companyId,
        services: { notIn: [""] },
      },
      distinct: ["services"],
      select: { services: true },
    }),
  ]);

  return {
    sources: sourceRows.map((r) => r.source!).filter(Boolean),
    services: serviceRows.map((r) => r.services!).filter(Boolean),
  };
};
