"use server";

import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { cache } from "react";
import moment from "moment-timezone";

// Cache only the deterministic part (DB lookup by ID)
const getCompanyById = cache(async (companyId: number) => {
  return db.company.findUnique({
    where: { id: companyId },
    select: { timezone: true },
  });
});

export async function getCompanyTimezone(currentCompanyId?: number) {
  const session = await getServerSession(authOptions);
  const companyId = currentCompanyId || session?.user.companyId;

  if (!session || !companyId) {
    return { timezone: moment.tz.guess() };
  }

  const company = await getCompanyById(companyId);

  return {
    timezone: company?.timezone || moment.tz.guess(),
  };
}
