"use server";
import { db } from "@/lib/db";

export async function getCompanyInfoForLeadForm({
  companyId,
}: {
  companyId: string;
}) {
  const company = await db.company.findUnique({
    where: { id: +companyId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      address: true,
      city: true,
      state: true,
      zip: true,
      image: true,
      website: true,
      timezone: true,
    },
  });
  return company;
}
