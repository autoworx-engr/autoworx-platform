"use server";
import { db } from "@/lib/db";

export async function getCompanyById({ companyId }: { companyId: string }) {
  const company = await db.company.findUnique({
    where: {
      id: +companyId,
    },
  });
  return company;
}
