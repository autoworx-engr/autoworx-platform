import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

/**
 * @swagger
 * /api/company/sms-gateway:
 *   get:
 *     summary: Get company SMS gateway setting
 *     tags: [Company]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: SMS gateway setting (TWILIO or INFOBIP)
 *       404:
 *         description: Company not found
 *       500:
 *         description: Server error
 */
export async function GET() {
  try {
    const companyId = await getCompanyId();

    const company = await db.company.findFirst({
      where: { id: companyId },
      select: { smsGateway: true },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    return NextResponse.json({ smsGateway: company.smsGateway || "TWILIO" });
  } catch (error: any) {
    console.error("Get SMS gateway error:", error);
    return NextResponse.json(
      { error: "Failed to get SMS gateway" },
      { status: 500 },
    );
  }
}
