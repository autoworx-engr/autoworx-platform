import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createTwilioCredentials } from "@/actions/communication/client/createTwilioCredentials";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";

const createTwilioCredentialsSchema = z.object({
  companyId: z.number().int().positive(),
  accountSid: z.string().min(1),
  phoneNumber: z.string().min(1),
  apiKeySid: z.string().min(1),
  apiKeySecret: z.string().min(1),
  phoneNumberSid: z.string().min(1),
  fcmPushCredentialSid: z.string().optional(),
  apnPushCredentialSid: z.string().optional(),
});

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
 *               fcmPushCredentialSid:
 *                 type: string
 *               apnPushCredentialSid:
 *                 type: string
 *     responses:
 *       200:
 *         description: Twilio credentials created successfully
 */
export async function POST(req: NextRequest) {
  try {
    const principal = await getAuthPrincipal(req);
    if (!principal) {
      return NextResponse.json(
        { success: false, message: "Unauthorized access" },
        { status: 401 },
      );
    }
    const { companyId } = principal;

    const parsed = createTwilioCredentialsSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid request body",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    // Lock the credentials to the caller's company; ignore any spoofed companyId in the body.
    if (parsed.data.companyId !== companyId) {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 },
      );
    }

    const data = await createTwilioCredentials(parsed.data);

    if (!data.success) {
      return NextResponse.json(
        { success: false, message: "Failed to create Twilio credentials" },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 400 },
    );
  }
}
