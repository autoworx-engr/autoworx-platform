import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * @swagger
 * /api/company-timezone:
 *   get:
 *     summary: Get company timezone
 *     tags: [Company]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Company timezone
 *       401:
 *         description: Unauthorized
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  const companyId = session?.user.companyId;
  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { timezone: true },
  });

  return NextResponse.json({
    timezone: company?.timezone || "UTC",
  });
}
