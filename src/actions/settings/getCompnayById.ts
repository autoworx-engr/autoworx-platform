"use server";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";

export async function getCompanyById({ companyId }: { companyId: string }) {
  const sessionCompanyId = await getCompanyId();
  if (sessionCompanyId !== +companyId) {
    throw new Error("Unauthorized");
  }
  const company = await db.company.findUnique({
    where: { id: sessionCompanyId },
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
