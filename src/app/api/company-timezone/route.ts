import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const companyId = await getCompanyId();
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { timezone: true },
  });

  return NextResponse.json({ timezone: company?.timezone || "UTC" });
}
