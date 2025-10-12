import { getInfobipCredentials } from "@/actions/communication/client/sendInfobipMessage";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { identity, companyId } = await request.json();

  try {
    const infobipCredentials = await getInfobipCredentials({ companyId });

    if (!infobipCredentials?.data) {
      return NextResponse.json(
        { error: "Infobip credentials not found" },
        { status: 400 }
      );
    }

    const infobipApiKey = process.env.INFOBIP_API_KEY;
    const infobipBaseUrl = process.env.INFOBIP_BASE_URL;
    const infobipApplicationId =
      infobipCredentials.data.applicationId || process.env.INFOBIP_APP_ID;

    if (!infobipApiKey || !infobipBaseUrl || !infobipApplicationId) {
      return NextResponse.json(
        { error: "Infobip configuration not found" },
        { status: 500 }
      );
    }

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
          displayName: identity,
          capabilities: {
            recording: "ALWAYS",
          },
          timeToLive: 3600, // Token valid for 1 hour
        }),
      }
    );
    console.log("🚀 ~ POST ~ tokenResponse:", tokenResponse);

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error("Infobip token error:", errorData);
      return NextResponse.json(
        { error: `Failed to generate token: ${JSON.stringify(errorData)}` },
        { status: tokenResponse.status }
      );
    }

    const tokenData = await tokenResponse.json();

    return NextResponse.json({
      token: tokenData.token,
      expirationTime: tokenData.expirationTime,
      applicationId: infobipApplicationId,
    });
  } catch (error: any) {
    console.error("Token generation error:", error);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
