import { getFromNumber } from "@/actions/communication/client/createTwilioCredentials";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const phoneNumber = await getFromNumber();

    if (!phoneNumber) {
      return NextResponse.json(
        { error: "Twilio phone number not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ phoneNumber });
  } catch (error) {
    console.error("Error fetching Twilio phone number:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
