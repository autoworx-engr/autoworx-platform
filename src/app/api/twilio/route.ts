import { updateNewSMSChatTrack } from "@/actions/communication/client/chat-track";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { db } from "@/lib/db";
import { sendClientMessageNotification } from "@/lib/notification/communication-notify";
import { getPusherInstance } from "@/lib/pusher/server";
// import { verifyTwilioSignature } from "@/lib/twilio/verifyTwilioSignature"; // TEMP: signature verification disabled for debugging
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/twilio:
 *   post:
 *     summary: Twilio SMS webhook
 *     tags: [Twilio]
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             properties:
 *               From:
 *                 type: string
 *               To:
 *                 type: string
 *               Body:
 *                 type: string
 *     responses:
 *       200:
 *         description: SMS received and processed
 */
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.includes("application/x-www-form-urlencoded")) {
      return Response.json(
        { message: "Unsupported content type" },
        { status: 415 },
      );
    }

    const params = Object.fromEntries(
      new URLSearchParams(await req.text()).entries(),
    );

    // Twilio sends E.164 numbers (with leading "+"). The credentials column may
    // be stored with or without the "+", so match both variants exactly rather
    // than using `endsWith`, which collides when one number is a suffix of another.
    const toWithPlus = params.To.startsWith("+") ? params.To : `+${params.To}`;
    const toWithoutPlus = params.To.replace("+", "");

    const company = await db.twilioCredentials.findFirst({
      where: { phoneNumber: { in: [toWithPlus, toWithoutPlus] } },
    });

    if (!company) {
      return Response.json({ message: "Unknown destination" }, { status: 200 });
    }

    // TEMP: signature verification disabled for debugging
    // const verification = await verifyTwilioSignature(
    //   req,
    //   params,
    //   company.authToken,
    // );
    // if (!verification.ok) {
    //   return Response.json({ message: "Forbidden" }, { status: 403 });
    // }

    const fromWithPlus = params.From.startsWith("+")
      ? params.From
      : `+${params.From}`;
    const fromWithoutPlus = params.From.replace("+", "");

    const client = await db.client.findFirst({
      where: {
        mobile: { in: [fromWithPlus, fromWithoutPlus] },
        companyId: company.companyId,
      },
      select: {
        id: true,
        companyId: true,
        firstName: true,
        lastName: true,
      },
    });

    if (client) {
      await db.clientSMS.create({
        data: {
          from: params.From,
          to: params.To,
          message: params.Body,
          sentBy: "Client",
          clientId: client.id,
          companyId: client.companyId,
        },
      });
      const totalUnReadMessages = await db.clientSMS.count({
        where: { clientId: client.id, sentBy: "Client", isRead: false },
      });

      await updateNewSMSChatTrack({
        clientId: client.id,
        smsLastMessage: params.Body,
        lastMessageBy: "Client",
      });

      await sendClientMessageNotification({
        companyId: company.companyId,
        clientId: client.id,
        clientName: `${client.firstName ?? ""} ${client.lastName ?? ""}`.trim(),
        message: params.Body,
        hasMedia: Number(params.NumMedia) > 0,
      });

      const channelName = `message-${client.id}`;
      await getPusherInstance().trigger(channelName, "client", {
        count: totalUnReadMessages,
      });
    }

    return Response.json(
      { message: "Webhook subscription successful", data: params },
      { status: 200 },
    );
  } catch (error) {
    console.error("Twilio SMS webhook error:", error);
    return Response.json({ message: "Webhook failed" }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/twilio:
 *  get:
 *     summary: Get Twilio credentials for the authenticated company
 *     tags: [Twilio]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Twilio credentials retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Twilio credentials not found
 */
export async function GET(req: NextRequest) {
  const principal = await getAuthPrincipal(req);
  if (!principal) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const credentials = await db.twilioCredentials.findFirst({
    where: { companyId: principal.companyId },
  });

  if (!credentials) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(credentials);
}
