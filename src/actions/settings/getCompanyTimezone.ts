"use server";

import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";

export async function getCompanyTimezone() {
  const companyId = await getCompanyId();
  const company = await db.company.findUnique({
    where: {
      id: companyId,
    },
    select: {
      timezone: true,
    },
  });
  return JSON.parse(JSON.stringify(company));
}
