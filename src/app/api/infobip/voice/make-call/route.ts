import { getInfobipCredentials } from "@/actions/communication/client/sendInfobipMessage";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

/**
 * @swagger
 * /api/infobip/voice/make-call:
 *   post:
 *     summary: Make outgoing call via Infobip
 *     tags: [Infobip]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               to:
 *                 type: string
 *               companyId:
 *                 type: integer
 *               clientId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Call initiated
 *       400:
 *         description: Missing parameters or config not found
 *       500:
 *         description: Server error
 */
export async function POST(request: NextRequest) {
  try {
    const { to, companyId, clientId } = await request.json();

    if (!to || !companyId) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 },
      );
    }

    const infobipCredentials = await getInfobipCredentials({ companyId });

    if (!infobipCredentials?.data) {
      return NextResponse.json(
        { error: "Infobip credentials not found" },
        { status: 400 },
      );
    }

    const infobipApiKey = process.env.INFOBIP_API_KEY;
    const infobipBaseUrl = process.env.INFOBIP_BASE_URL;

    if (!infobipApiKey || !infobipBaseUrl) {
      return NextResponse.json(
        { error: "Infobip configuration not found" },
        { status: 500 },
      );
    }

    const callId = uuidv4();

    // Create ClientCall record for outgoing call
    await db.clientCall.create({
      data: {
        callSid: callId,
        from: infobipCredentials.data.phoneNumber,
        to,
        status: "initiated",
        direction: "outbound",
        sentBy: "Company",
        companyId,
        clientId,
      },
    });

    // Make the call using Infobip Voice API
    const response = await fetch(`https://${infobipBaseUrl}/calls/1/calls`, {
      method: "POST",
      headers: {
        Authorization: `App ${infobipApiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        endpoint: {
          type: "PHONE",
          phoneNumber: to,
        },
        from: infobipCredentials.data.phoneNumber,
        callsConfigurationId: infobipCredentials.data.callsConfigurationId, // You'll need to configure this
        recording: {
          recordingType: "AUDIO",
        },
        applicationId: process.env.INFOBIP_APP_ID, // You'll need to configure this
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Infobip call error:", errorData);

      // Update call status to failed
      await db.clientCall.update({
        where: { callSid: callId },
        data: { status: "failed" },
      });

      return NextResponse.json(
        { error: `Infobip call failed: ${JSON.stringify(errorData)}` },
        { status: response.status },
      );
    }

    const callData = await response.json();

    // Update call status
    await db.clientCall.update({
      where: { callSid: callId },
      data: { status: "ringing" },
    });

    return NextResponse.json({
      success: true,
      callId: callData.id || callId,
      externalCallId: callData.id,
    });
  } catch (error: any) {
    console.error("Error making Infobip call:", error);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
