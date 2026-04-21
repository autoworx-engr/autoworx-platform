import { NextRequest, NextResponse } from "next/server";
import { updateInfobipVoiceConfig } from "@/actions/communication/client/updateInfobipVoiceConfig";

/**
 * @swagger
 * /api/communication/client-hub/update-infobip-voice-config:
 *   put:
 *     summary: Update Infobip voice configuration
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
 *               - applicationId
 *               - callsConfigurationId
 *             properties:
 *               applicationId:
 *                 type: string
 *               callsConfigurationId:
 *                 type: string
 *               companyId:
 *                 type: number
 *     responses:
 *       200:
 *         description: Infobip voice config updated successfully
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();

    const data = await updateInfobipVoiceConfig({
      applicationId: body.applicationId,
      callsConfigurationId: body.callsConfigurationId,
      companyId: body.companyId,
    });

    if (!data.success) {
      return NextResponse.json(
        { success: false, message: "Failed to update Infobip voice config" },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true, data: data.data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 400 },
    );
  }
}
