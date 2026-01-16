import { NextRequest, NextResponse } from "next/server";
import { verifyMailgunDomain } from "@/actions/communication/client/mailgunActions";

/**
 * @swagger
 * /api/communication/client-hub/verify-mailgun-domain:
 *   post:
 *     summary: Verify Mailgun domain
 *     tags: [Communication Client]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               companyId:
 *                 type: number
 *     responses:
 *       200:
 *         description: Domain verification initiated successfully
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const data = await verifyMailgunDomain(body.companyId);

    if (!data.success) {
      return NextResponse.json(
        { success: false, message: "Failed to verify Mailgun domain" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 400 }
    );
  }
}
