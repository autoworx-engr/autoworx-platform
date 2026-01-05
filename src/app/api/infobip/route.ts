import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

/**
 * @swagger
 * /api/infobip:
 *   get:
 *     summary: Get Infobip configuration
 *     tags: [Infobip]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Infobip configuration
 *       404:
 *         description: Configuration not found
 *       500:
 *         description: Server error
 *   post:
 *     summary: Infobip placeholder
 *     tags: [Infobip]
 *     responses:
 *       200:
 *         description: Use /api/infobip/sms/send for sending messages
 */
export async function GET() {
  try {
    const companyId = await getCompanyId();

    const infobipConfig = await db.infobipConfig.findFirst({
      where: { companyId },
    });

    if (!infobipConfig) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(infobipConfig);
  } catch (error: any) {
    console.error("Get Infobip config error:", error);
    return NextResponse.json(
      { error: "Failed to get Infobip configuration" },
      { status: 500 }
    );
  }
}

export async function POST() {
  return NextResponse.json(
    { message: "Use /api/infobip/sms/send for sending messages" },
    { status: 200 }
  );
}
