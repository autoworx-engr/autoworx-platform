import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * @swagger
 * /api/company-timezone:
 *   get:
 *     summary: Get company timezone with company tax and service Fee
 *     tags: [Company]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Company settings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 timezone:
 *                   type: string
 *                   example: America/New_York
 *                 tax:
 *                   type: number
 *                   example: 8.5
 *                 serviceFee:
 *                   type: number
 *                   example: 5
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Unauthorized
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  let companyId = session?.user.companyId;

  if (!companyId) {
    companyId = (await getAuthPrincipal(req))?.companyId;
  }

  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { timezone: true, tax: true, serviceFee: true },
  });

  return NextResponse.json({
    timezone: company?.timezone || "UTC",
    tax: company?.tax ?? 0,
    serviceFee: company?.serviceFee ?? 0,
  });
}
