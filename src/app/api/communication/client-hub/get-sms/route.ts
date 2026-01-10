import { NextRequest, NextResponse } from "next/server";
import getSms from "@/actions/communication/client/getSms";

/**
 * @swagger
 * /api/communication/client-hub/get-sms:
 *   get:
 *     summary: Get SMS messages for a client
 *     tags: [Communication Client]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: clientId
 *         required: true
 *         schema:
 *           type: number
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: SMS messages fetched successfully
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clientId = parseInt(searchParams.get("clientId") || "0");
    const companyId = searchParams.get("companyId")
      ? parseInt(searchParams.get("companyId")!)
      : undefined;

    if (!clientId) {
      return NextResponse.json(
        { success: false, message: "clientId is required" },
        { status: 400 }
      );
    }

    const data = await getSms(clientId, companyId);

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 400 }
    );
  }
}
