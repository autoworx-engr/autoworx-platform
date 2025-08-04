import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  const companyId = session?.user.companyId;
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { timezone: true },
  });

  return NextResponse.json({
    timezone: company?.timezone || "UTC",
  });
}
