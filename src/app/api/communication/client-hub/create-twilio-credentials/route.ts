import { NextRequest, NextResponse } from "next/server";
import { createTwilioCredentials } from "@/actions/communication/client/createTwilioCredentials";

/**
 * @swagger
 * /api/communication/client-hub/create-twilio-credentials:
 *   post:
 *     summary: Create or update Twilio credentials
 *     tags: [Communication Client]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - companyId
 *               - accountSid
 *               - phoneNumber
 *               - apiKeySid
 *               - apiKeySecret
 *               - phoneNumberSid
 *             properties:
 *               companyId:
 *                 type: number
 *               accountSid:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               apiKeySid:
 *                 type: string
 *               apiKeySecret:
 *                 type: string
 *               phoneNumberSid:
 *                 type: string
 *     responses:
 *       200:
 *         description: Twilio credentials created successfully
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const data = await createTwilioCredentials({
      companyId: body.companyId,
      accountSid: body.accountSid,
      phoneNumber: body.phoneNumber,
      apiKeySid: body.apiKeySid,
      apiKeySecret: body.apiKeySecret,
      phoneNumberSid: body.phoneNumberSid,
    });

    if (!data.success) {
      return NextResponse.json(
        { success: false, message: "Failed to create Twilio credentials" },
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
