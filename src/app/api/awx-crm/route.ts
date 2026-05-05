import { db } from "@/lib/db";
import { NextResponse } from "next/server";

/**
 * @swagger
 * /api/awx-crm:
 *   get:
 *     summary: Get AutoWorx CRM token
 *     tags: [CRM]
 *     responses:
 *       200:
 *         description: CRM token for enabled company
 *       404:
 *         description: No CRM-enabled company found
 *       500:
 *         description: Server error
 */
export async function GET() {
  try {
    const awxcrmcompany = await db.company.findFirst({
      where: {
        isCRMEnabled: true,
      },
      select: {
        zapierToken: true,
      },
    });
    if (!awxcrmcompany) {
      return NextResponse.json(
        { error: "No CRM-enabled company found" },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { token: awxcrmcompany.zapierToken },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching data:", error);
    return NextResponse.json(
      { error: "Failed to fetch data" },
      { status: 500 },
    );
  }
}
