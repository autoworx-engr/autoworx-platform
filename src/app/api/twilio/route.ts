import { updateNewSMSChatTrack } from "@/actions/communication/client/chat-track";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { sendClientMessageNotification } from "@/lib/notification/communication-notify";
import { getPusherInstance } from "@/lib/pusher/server";
import { NextRequest, NextResponse } from "next/server";

const pusher = getPusherInstance();

export async function POST(req: NextRequest) {
  try {
    let body;

    // Check for Twilio's default content type
    const contentType = req.headers.get("content-type");
    if (contentType === "application/x-www-form-urlencoded") {
      const formData = await req.text();
      body = Object.fromEntries(new URLSearchParams(formData).entries());
    } else {
      throw new Error(
        "Unsupported content type: Twilio webhook expects form-encoded data"
      );
    }

    let companies = await db.twilioCredentials.findMany({
      where: {
        phoneNumber: {
          endsWith: body.To.replace("+", ""),
        },
      },
    });

    for (let i = 0; i < companies.length; i++) {
      let company = companies[i];

      let client = await db.client.findFirst({
        where: {
          mobile: {
            endsWith: body.From.replace("+", ""),
          },
          companyId: company.companyId,
        },
      });

      if (client) {
        await db.clientSMS.create({
          data: {
            from: body.From,
            to: body.To,
            message: body.Body,
            sentBy: "Client",
            clientId: client.id,
            companyId: client.companyId,
          },
        });
        const totalUnReadMessages = await db.clientSMS.count({
          where: {
            clientId: client.id,
            sentBy: "Client",
            isRead: false,
          },
        });

        await updateNewSMSChatTrack({
          clientId: client.id,
          smsLastMessage: body.Body,
          lastMessageBy: "Client",
        });

        sendClientMessageNotification({
          companyId: company.companyId,
          clientId: client.id,
          clientName: client.firstName + " " + client.lastName,
        });

        const channelName = `message-${client.id}`;
        pusher.trigger(channelName, "client", { count: totalUnReadMessages });
      }
    }

    // Send a success response
    return Response.json(
      { message: "Webhook subscription successful", data: body },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Subscription error:", error);
    return Response.json(
      { message: "Webhook subscription failed", error: error?.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  const companyId = await getCompanyId();

  const credentials = await db.twilioCredentials.findFirst({
    where: { companyId },
  });

  if (!credentials) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(credentials);
}
