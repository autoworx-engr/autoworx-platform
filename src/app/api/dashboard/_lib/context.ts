import { db } from "@/lib/db";
import { Company, User } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export type DashboardContext = {
  companyId: number;
  userId: number;
  user: User;
  company: Company;
  timezone: string;
};

const badRequest = (message: string) =>
  NextResponse.json({ success: false, message }, { status: 400 });

/**
 * Validates the companyId/userId query pair every dashboard analytics route
 * takes, loads the user and company, and resolves the timezone all downstream
 * metrics are bucketed in.
 */
export async function resolveDashboardContext(
  req: NextRequest,
): Promise<{ error: NextResponse } | { context: DashboardContext }> {
  const { searchParams } = new URL(req.url);
  const companyId = parseInt(searchParams.get("companyId") || "0");
  const userId = parseInt(searchParams.get("userId") || "0");

  if (!companyId) {
    return { error: badRequest("Company Id is required") };
  }

  if (!userId) {
    return { error: badRequest("User Id is required") };
  }

  const [user, company] = await Promise.all([
    db.user.findUnique({ where: { id: userId } }),
    db.company.findUnique({ where: { id: companyId } }),
  ]);

  if (!user) {
    return { error: badRequest("The user does not exist!") };
  }

  if (!company) {
    return { error: badRequest("The company does not exist!") };
  }

  return {
    context: {
      companyId,
      userId,
      user,
      company,
      timezone:
        company.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  };
}
