"use server";

import { Source } from "@prisma/client";
import { db } from "@/lib/db";
import { getCompanyId } from "@/lib/companyId";

export async function getSources() {
  const companyId = await getCompanyId();
  return db.source.findMany({ where: { companyId } });
}
