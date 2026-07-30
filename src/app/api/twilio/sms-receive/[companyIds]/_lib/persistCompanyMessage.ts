import { updatePipelineAutomationTriggerWithToken } from "@/actions/automation/pipeline/triggerPipelineAutomation";
import { updateNewSMSChatTrack } from "@/actions/communication/client/chat-track";
import { db } from "@/lib/db";
import { sendClientMessageNotification } from "@/lib/notification/communication-notify";
import sendClientMailOrSMSNotify from "@/lib/pusher/client-conversation-notify";
import receiveTwiloMessage from "@/lib/pusher/receiveTwiloMessage";
import { getPusherInstance } from "@/lib/pusher/server";
import { debounceSmsAgent } from "@/lib/salesAgent/debounceSmsAgent";
import {
  normalizePhoneForStorage,
  phoneLookupWhereClause,
} from "@/utils/normalizePhone";
import type { Prisma, TwilioCredentials } from "@prisma/client";

const AUDIO_EXTENSIONS = new Set([
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
]);

type Entitlements = { canUseSms: boolean; awxSalesAgent: boolean };

type ClientWithLead = Prisma.ClientGetPayload<{
  select: {
    id: true;
    firstName: true;
    lastName: true;
    companyId: true;
    Lead: true;
    isSalesAgent: true;
  };
}>;

const CLIENT_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  companyId: true,
  Lead: true,
  isSalesAgent: true,
} as const;

async function findOrCreateClient(
  body: Record<string, string>,
  companyId: number,
): Promise<ClientWithLead> {
  const phoneLookup = phoneLookupWhereClause(body.From);

  const existing = phoneLookup
    ? await db.client.findFirst({
        where: { OR: phoneLookup, companyId },
        select: CLIENT_SELECT,
      })
    : null;

  if (existing) return existing;

  return db.client.create({
    data: {
      firstName: body.From,
      lastName: " ",
      mobile: normalizePhoneForStorage(body.From),
      companyId,
      isSalesAgent: true,
    },
    select: CLIENT_SELECT,
  });
}

async function persistMessageWithAttachments(
  body: Record<string, string>,
  client: ClientWithLead,
  images: string[],
) {
  return db.$transaction(async (tx) => {
    const dbMessage = await tx.clientSMS.create({
      data: {
        from: body.From,
        to: body.To,
        message: body.Body,
        sentBy: "Client",
        clientId: client.id,
        companyId: client.companyId,
      },
    });

    const attachments = [];
    for (const file of images) {
      const fileExtension = file.split(".").pop()?.split("?")[0] || "jpg";
      const isVoice = AUDIO_EXTENSIONS.has(fileExtension.toLowerCase());
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
}

export async function persistCompanyMessage({
  body,
  companyId,
  entitlements,
  credential,
  images,
}: {
  body: Record<string, string>;
  companyId: number;
  entitlements: Entitlements;
  credential: TwilioCredentials | null;
  images: string[];
}) {
  const pusher = getPusherInstance();

  const company = await db.company.findUnique({ where: { id: companyId } });
  const client = await findOrCreateClient(body, companyId);

  const { dbMessage, attachments } = await persistMessageWithAttachments(
    body,
    client,
    images,
  );

  const clientConversationTrack = await updateNewSMSChatTrack({
    clientId: client.id,
    smsLastMessage: body.Body,
    lastMessageBy: "Client",
    attachments,
  });

  // Sales-agent dispatch (only if all toggles enabled and the inbound number
  // matches this company's Twilio credential).
  const isCompanySalesAgent = company?.isSalesAgent === true;
  const isClientSalesAgent = client.isSalesAgent === true;
  const isSalesAgentEnabled = entitlements.awxSalesAgent;
  const phoneMatch = dbMessage.to === credential?.phoneNumber;

  console.log("[Twilio] Sales-agent gate check", {
    companyId,
    clientId: client.id,
    isCompanySalesAgent,
    isClientSalesAgent,
    isSalesAgentEnabled,
    dbMessageTo: dbMessage.to,
    credentialPhone: credential?.phoneNumber,
    phoneMatch,
  });

  if (isCompanySalesAgent && isClientSalesAgent && isSalesAgentEnabled) {
    if (phoneMatch) {
      console.log(
        "[Twilio] All gates passed — calling debounceSmsAgent for clientId",
        client.id,
      );

      debounceSmsAgent({
        clientId: client.id,
        companyId: client.companyId,
        sendFrom: dbMessage.from,
        sendTo: dbMessage.to,
        windowStart: dbMessage.createdAt.toISOString(),
      }).catch((err) =>
        console.error("[Twilio] debounceSmsAgent enqueue error:", err),
      );
    } else {
      console.log("[Twilio] Phone mismatch — skipping debounce", {
        dbMessageTo: dbMessage.to,
        credentialPhone: credential?.phoneNumber,
      });
    }
  } else {
    console.log("[Twilio] Sales-agent gate FAILED — skipping debounce", {
      isCompanySalesAgent,
      isClientSalesAgent,
      isSalesAgentEnabled,
    });
  }

  receiveTwiloMessage({ ...dbMessage, attachments });

  if (clientConversationTrack) {
    sendClientMailOrSMSNotify(companyId, clientConversationTrack);
  }

  const totalUnReadMessages = await db.clientConversationTrack.findFirst({
    where: { clientId: client.id },
    select: { smsUnReadCount: true },
  });

  sendClientMessageNotification({
    companyId,
    clientId: client.id,
    clientName: `${client.firstName} ${client.lastName}`,
    message: body.Body,
    hasMedia: Number(body.NumMedia) > 0,
  });

  let updatedColumnId = client.Lead?.columnId;
  if (client.Lead?.id && client.Lead?.columnId) {
    const responseData = await updatePipelineAutomationTriggerWithToken({
      condition: "MESSAGE_RECEIVED_CLIENT",
      companyId,
      leadId: client.Lead.id,
      columnId: client.Lead.columnId,
    });
    if (responseData?.data?.columnId) {
      updatedColumnId = responseData.data.columnId;
    }
  }

  pusher.trigger(`message-${client.id}`, "client", {
    count: totalUnReadMessages?.smsUnReadCount,
    updatedColumnId,
  });
}
