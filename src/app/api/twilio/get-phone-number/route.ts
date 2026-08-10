import { getFromNumber } from "@/actions/communication/client/createTwilioCredentials";
import { NextResponse } from "next/server";

/**
 * @swagger
 * /api/twilio/get-phone-number:
 *   get:
 *     summary: Get Twilio phone number
 *     tags: [Twilio]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Twilio phone number
 *       404:
 *         description: Phone number not found
 *       500:
 *         description: Server error
 */
export async function GET() {
  try {
    const phoneNumber = await getFromNumber();

    if (!phoneNumber) {
      return NextResponse.json(
        { error: "Twilio phone number not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ phoneNumber });
  } catch (error) {
    console.error("Error fetching Twilio phone number:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
