import { NextRequest, NextResponse } from "next/server";
import { getDnsRecords } from "@/actions/communication/client/mailgunActions";

/**
 * @swagger
 * /api/communication/client-hub/get-mailgun-dns-records:
 *   get:
 *     summary: Get Mailgun DNS records
 *     tags: [Communication Client]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: DNS records fetched successfully
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get("companyId")
      ? parseInt(searchParams.get("companyId")!)
      : undefined;

    const data = await getDnsRecords(companyId);

    if (!data.success) {
      return NextResponse.json(
        { success: false, message: "Failed to fetch DNS records" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, data: data.data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 400 }
    );
  }
}
