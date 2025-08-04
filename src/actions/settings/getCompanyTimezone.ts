"use server";

import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { cache } from "react";
import moment from "moment-timezone";

export const getCompanyTimezone = cache(async function () {
  const session = await getServerSession(authOptions);
  const companyId = session?.user.companyId;

  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { timezone: true },
  });

  return {
    timezone: company?.timezone || moment.tz.guess(),
  };
});
