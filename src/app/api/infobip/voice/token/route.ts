import { getInfobipCredentials } from "@/actions/communication/client/sendInfobipMessage";
import { getCompanyEntitlements } from "@/lib/platform-billing/entitlement-service";
import {
  assertCompanyAccess,
  requireBillingSession,
} from "@/lib/platform-billing/guards";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/infobip/voice/token:
 *   post:
 *     summary: Get Infobip WebRTC token
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
 *               identity:
 *                 type: string
 *               companyId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: WebRTC token generated
 *       400:
 *         description: Credentials not found
 *       500:
 *         description: Server error
 */
export async function POST(request: NextRequest) {
  const { identity, companyId: rawCompanyId } = await request.json();
  const companyId = Number(rawCompanyId);

  const entitlements = await getCompanyEntitlements(companyId);
  if (!entitlements.canUseVoice) {
    return NextResponse.json(
      { error: "Voice calling is not enabled for this plan." },
      { status: 403 },
    );
  }

  try {
    const infobipCredentials = await getInfobipCredentials({
      companyId,
    });

    if (!infobipCredentials?.data) {
      return NextResponse.json(
        { error: "Infobip credentials not found" },
        { status: 400 },
      );
    }

    const infobipApiKey = process.env.INFOBIP_API_KEY;
    const infobipBaseUrl = process.env.INFOBIP_BASE_URL;
    const infobipApplicationId =
      infobipCredentials.data.applicationId || process.env.INFOBIP_APP_ID;
    const callsConfigurationId = infobipCredentials.data.callsConfigurationId;

    if (!infobipApiKey || !infobipBaseUrl || !infobipApplicationId) {
      return NextResponse.json(
        { error: "Infobip configuration not found" },
        { status: 500 },
      );
    }

    console.log("📋 [Infobip Token] Configuration:", {
      applicationId: infobipApplicationId,
      callsConfigurationId: callsConfigurationId,
      identity: identity,
    });

    // Generate Infobip WebRTC token using their API
    const tokenResponse = await fetch(
      `https://${infobipBaseUrl}/webrtc/1/token`,
      {
        method: "POST",
        headers: {
          Authorization: `App ${infobipApiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          identity: identity,
          applicationId: infobipApplicationId,
          callsConfigurationId: callsConfigurationId, // <-- THIS IS THE FIX
          displayName: identity,
          capabilities: {
            recording: "ALWAYS",
          },
          timeToLive: 3600, // Token valid for 1 hour
        }),
      },
    );
    console.log("🚀 ~ POST ~ tokenResponse:", tokenResponse);

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error("Infobip token error:", errorData);
      return NextResponse.json(
        { error: `Failed to generate token: ${JSON.stringify(errorData)}` },
        { status: tokenResponse.status },
      );
    }

    const tokenData = await tokenResponse.json();

    // Debug: log the tokenData returned by Infobip so we can inspect its structure
    try {
      console.log("📋 [Infobip Token] tokenData:", tokenData);
      if (tokenData?.token && typeof tokenData.token === "string") {
        // Try to decode JWT payload if token looks like a JWT
        const parts = tokenData.token.split(".");
        if (parts.length === 3) {
          const payload = Buffer.from(parts[1], "base64").toString("utf8");
          console.log("📋 [Infobip Token] decoded token payload:", payload);
        }
      }
    } catch (err) {
      console.warn("Unable to decode tokenData for inspection", err);
    }

    return NextResponse.json({
      token: tokenData.token,
      expirationTime: tokenData.expirationTime,
      applicationId: infobipApplicationId,
      callsConfigurationId: callsConfigurationId,
    });
  } catch (error: any) {
    console.error("Token generation error:", error);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
