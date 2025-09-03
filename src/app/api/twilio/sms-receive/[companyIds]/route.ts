// import { updateCommunicationAutomationTrigger } from "@/actions/automation/communication/triggerCommunicationAutomation";
import { updatePipelineAutomationTriggerWithToken } from "@/actions/automation/pipeline/triggerPipelineAutomation";
import { updateNewSMSChatTrack } from "@/actions/communication/client/chat-track";
import { db } from "@/lib/db";
import { sendClientMessageNotification } from "@/lib/notification/communication-notify";
import sendClientMailOrSMSNotify from "@/lib/pusher/client-conversation-notify";
import receiveTwiloMessage from "@/lib/pusher/receiveTwiloMessage";
import { getPusherInstance } from "@/lib/pusher/server";
import { NextRequest } from "next/server";

const pusher = getPusherInstance();

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ companyIds: string }> }
) {
  try {
    const { params } = context;
    const companyIdsParam = (await params)?.companyIds;

    // Parse list of company IDs
    const companyIds = companyIdsParam.split(",").map((id) => parseInt(id, 10));

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

    // Extract Media URLs (Twilio sends them as MediaUrl0, MediaUrl1, ...)
    const mediaUrls: string[] = [];
    const numMedia = parseInt(body.NumMedia, 10) || 0; // Number of media items

    for (let i = 0; i < numMedia; i++) {
      const mediaUrl = body[`MediaUrl${i}`];
      if (mediaUrl) mediaUrls.push(mediaUrl);
    }

    // Get Twilio credentials for one of the companies to access auth details
    const credential = await db.twilioCredentials.findFirst({
      where: {
        companyId: {
          in: companyIds,
        },
        phoneNumber: {
          contains: body.To.replace("+", ""),
        },
      },
    });

    const formData = new FormData();

    for (const url of mediaUrls) {
      const file = await fetchTwilioMedia(
        url,
        credential?.apiKeySid || "",
        credential?.apiKeySecret || ""
      );
      formData.append("file", file);
    }

    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/upload`, {
      method: "POST",
      body: formData,
    });

    const imgs = await res.json();
    const images = imgs?.data ?? [];

    for (const companyId of companyIds) {
      let client = await db.client.findFirst({
        where: {
          mobile: {
            endsWith: body.From.replace("+", ""),
          },
          companyId: +companyId,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          companyId: true,
          Lead: true,
        },
      });

      if (client) {
        const dbMessage = await db.clientSMS.create({
          data: {
            from: body.From,
            to: body.To,
            message: body.Body,
            sentBy: "Client",
            clientId: client.id,
            companyId: client.companyId,
          },
        });
        let attachments = [];
        for (const file of images) {
          let atc = await db.clientSmsAttachments.create({
            data: {
              url: file,
              name: `${dbMessage.id}_${Date.now()}`,
              clientSMSId: dbMessage.id,
            },
          });
          attachments.push(atc);
        }

        // update client sms conversation track
        const clientConversationTrack = await updateNewSMSChatTrack({
          clientId: client.id,
          smsLastMessage: body.Body,
          lastMessageBy: "Client",
          attachments: attachments,
        });

        // pusher trigger to send message to company admin real time

        receiveTwiloMessage({ ...dbMessage, attachments });

        if (clientConversationTrack) {
          // send a notification to the client for updated message
          sendClientMailOrSMSNotify(+companyId, clientConversationTrack);
        }

        const totalUnReadMessages = await db.clientConversationTrack.findFirst({
          where: {
            clientId: client.id,
          },
          select: {
            smsUnReadCount: true,
          },
        });

        const channelName = `message-${client.id}`;

        pusher.trigger(channelName, "client", {
          count: totalUnReadMessages?.smsUnReadCount,
          updatedColumnId: client.Lead?.columnId,
        });

        sendClientMessageNotification({
          companyId: +companyId,
          clientId: client.id,
          clientName: client.firstName + " " + client.lastName,
        });

        if (client.Lead?.id && client.Lead?.columnId) {
          const responseData = await updatePipelineAutomationTriggerWithToken({
            condition: "MESSAGE_RECEIVED_CLIENT",
            companyId: +companyId,
            leadId: client.Lead?.id,
            columnId: client.Lead?.columnId,
          });

          if (
            responseData?.data &&
            responseData?.data?.columnId !== client?.Lead?.columnId
          ) {
            pusher.trigger(channelName, "client", {
              count: totalUnReadMessages?.smsUnReadCount,
              updatedColumnId: responseData.data?.columnId,
            });
          }

          // await updateCommunicationAutomationTrigger({
          //   companyId: +companyId,
          //   leadId: client.Lead?.id,
          //   columnId: client.Lead?.columnId,
          // });
        }
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
// 🔹 Function to Fetch Twilio Media and Convert to File
async function fetchTwilioMedia(
  url: string,
  apiKeySid: string,
  apiKeySecret: string
) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Basic ${btoa(`${apiKeySid}:${apiKeySecret}`)}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Twilio media: ${response.statusText}`);
  }

  const blob = await response.blob();
  return new File([blob], "twilio-mms.jpg", { type: blob.type });
}
