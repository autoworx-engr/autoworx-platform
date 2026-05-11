// import { updateCommunicationAutomationTrigger } from "@/actions/automation/communication/triggerCommunicationAutomation";
import { updatePipelineAutomationTriggerWithToken } from "@/actions/automation/pipeline/triggerPipelineAutomation";
import { updateNewSMSChatTrack } from "@/actions/communication/client/chat-track";
import { db } from "@/lib/db";
import { getCompanyEntitlements } from "@/lib/platform-billing/entitlement-service";
import { sendClientMessageNotification } from "@/lib/notification/communication-notify";
import sendClientMailOrSMSNotify from "@/lib/pusher/client-conversation-notify";
import receiveTwiloMessage from "@/lib/pusher/receiveTwiloMessage";
import { getPusherInstance } from "@/lib/pusher/server";
import { sendSMSToAgent } from "@/service/ai-agent/api";
import { allCompanyFeaturePermissions } from "@/service/feature-permissions/api";
import {
  normalizePhoneForStorage,
  phoneLookupWhereClause,
} from "@/utils/normalizePhone";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

const pusher = getPusherInstance();

/**
 * @swagger
 * /api/twilio/sms-receive/{companyIds}:
 *   post:
 *     summary: Twilio SMS webhook for multiple companies
 *     tags: [Twilio]
 *     parameters:
 *       - in: path
 *         name: companyIds
 *         required: true
 *         schema:
 *           type: string
 *           description: Comma-separated company IDs
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
 *       400:
 *         description: Unsupported content type
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ companyIds: string }> },
) {
  try {
    const { params } = context;
    const companyIdsParam = (await params)?.companyIds;

    const companyIds = companyIdsParam.split(",").map((id) => parseInt(id, 10));

    let body;

    const contentType = req.headers.get("content-type");
    if (contentType === "application/x-www-form-urlencoded") {
      const formData = await req.text();
      body = Object.fromEntries(new URLSearchParams(formData).entries());
    } else {
      throw new Error(
        "Unsupported content type: Twilio webhook expects form-encoded data",
      );
    }

    // Respond to Twilio immediately to avoid 15s timeout, then process async
    processIncomingSMS(body, companyIds).catch((err) =>
      console.error("SMS processing error:", err),
    );

    return Response.json({ message: "Webhook received" }, { status: 200 });
  } catch (error: any) {
    console.error("Subscription error:", error);
    return Response.json(
      { message: "Webhook subscription failed", error: error?.message },
      { status: 500 },
    );
  }
}

async function processIncomingSMS(
  body: Record<string, string>,
  companyIds: number[],
) {
  const mediaUrls: string[] = [];
  const numMedia = parseInt(body.NumMedia, 10) || 0;

  for (let i = 0; i < numMedia; i++) {
    const mediaUrl = body[`MediaUrl${i}`];
    if (mediaUrl) mediaUrls.push(mediaUrl);
  }

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
      credential?.apiKeySecret || "",
    );
    formData.append("file", file);
  }

  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/upload`, {
    method: "POST",
    body: formData,
  });

  const imgs = await res.json();
  const images = imgs?.data ?? [];

  const normalizedFrom = normalizePhoneForStorage(body.From);
  const phoneLookup = phoneLookupWhereClause(body.From);

  // Batch entitlement lookups upfront to avoid N+1 inside the loop
  const entitlementsByCompany = new Map(
    await Promise.all(
      companyIds.map(
        async (id) => [id, await getCompanyEntitlements(id)] as const,
      ),
    ),
  );

  for (const companyId of companyIds) {
    const entitlements = entitlementsByCompany.get(companyId)!;
    if (!entitlements.canUseSms) {
      continue;
    }
    const company = await db.company.findUnique({
      where: { id: companyId },
    });

    let client = phoneLookup
      ? await db.client.findFirst({
          where: {
            OR: phoneLookup,
            companyId: +companyId,
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            companyId: true,
            Lead: true,
            isSalesAgent: true,
          },
        })
      : null;

    if (!client) {
      client = await db.client.create({
        data: {
          firstName: body.From,
          lastName: " ",
          mobile: normalizedFrom,
          companyId: companyId,
          isSalesAgent: true,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          companyId: true,
          Lead: true,
          isSalesAgent: true,
        },
      });
    }

    if (client) {
      const audioExts = [
        "ogg",
        "mp3",
        "m4a",
        "wav",
        "webm",
        "aac",
        "amr",
        "3gp",
        "opus",
        "oga",
        "flac",
      ];

      const { dbMessage, attachments } = await db.$transaction(async (tx) => {
        const dbMessage = await tx.clientSMS.create({
          data: {
            from: body.From,
            to: body.To,
            message: body.Body,
            sentBy: "Client",
            clientId: client!.id,
            companyId: client!.companyId,
          },
        });

        const attachments = [];
        for (const file of images) {
          const fileExtension = file.split(".").pop()?.split("?")[0] || "jpg";
          const isVoice = audioExts.includes(fileExtension.toLowerCase());
          const atc = await tx.clientSmsAttachments.create({
            data: {
              url: file,
              name: `${dbMessage.id}_${Date.now()}.${fileExtension}`,
              isVoiceNote: isVoice,
              clientSMSId: dbMessage.id,
            },
          });
          attachments.push(atc);
        }

        return { dbMessage, attachments };
      });

      // update client sms conversation track
      const clientConversationTrack = await updateNewSMSChatTrack({
        clientId: client.id,
        smsLastMessage: body.Body,
        lastMessageBy: "Client",
        attachments: attachments,
      });

      const currentClient = await db.client.findUnique({
        where: { id: client?.id },
      });

      const permissions = await allCompanyFeaturePermissions(companyId);

      const isSalesAgentEnabled = entitlements.awxSalesAgent;

      //sales agent
      const isCompanySalesAgent = company?.isSalesAgent === true;
      const isClientSalesAgent = currentClient?.isSalesAgent === true;

      console.log("twilio sms receive clientSMS", dbMessage);
      console.log("credential", credential);

      if (isCompanySalesAgent && isClientSalesAgent && isSalesAgentEnabled) {
        if (dbMessage && dbMessage.to === credential?.phoneNumber) {
          try {
            await sendSMSToAgent({
              company_id: client.companyId,
              message: dbMessage?.message,
              send_from: dbMessage?.from,
              send_to: dbMessage?.to,
              client_id: client?.id,
            });
          } catch (error) {
            return Response.json(
              { message: `Sales agent error: ${error}` },
              { status: 200 },
            );
          }
        }
      }

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

      sendClientMessageNotification({
        companyId: +companyId,
        clientId: client.id,
        clientName: client.firstName + " " + client.lastName,
        message: body.Body,
        hasMedia: Number(body.NumMedia) > 0,
      });

      const channelName = `message-${client.id}`;

      let updatedColumnId = client.Lead?.columnId;

      if (client.Lead?.id && client.Lead?.columnId) {
        const responseData = await updatePipelineAutomationTriggerWithToken({
          condition: "MESSAGE_RECEIVED_CLIENT",
          companyId: +companyId,
          leadId: client.Lead?.id,
          columnId: client.Lead?.columnId,
        });

        if (responseData?.data?.columnId) {
          updatedColumnId = responseData.data.columnId;
        }
      }

      pusher.trigger(channelName, "client", {
        count: totalUnReadMessages?.smsUnReadCount,
        updatedColumnId,
      });
    }
  }
  revalidatePath("/dashboard/communication/client");
}
// 🔹 Function to Fetch Twilio Media and Convert to File
async function fetchTwilioMedia(
  url: string,
  apiKeySid: string,
  apiKeySecret: string,
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
  const ext = mimeToExtension(blob.type);
  const filename = `twilio-mms-${Date.now()}.${ext}`;
  return new File([blob], filename, { type: blob.type });
}

function mimeToExtension(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "audio/ogg": "ogg",
    "audio/mpeg": "mp3",
    "audio/mp4": "m4a",
    "audio/wav": "wav",
    "audio/webm": "webm",
    "audio/amr": "amr",
    "audio/aac": "aac",
    "audio/3gpp": "3gp",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "video/3gpp": "3gp",
    "application/pdf": "pdf",
  };
  return map[mime.split(";")[0].trim()] || "bin";
}
