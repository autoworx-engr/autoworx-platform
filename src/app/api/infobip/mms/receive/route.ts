import { updateNewSMSChatTrack } from "@/actions/communication/client/chat-track";
import { updatePipelineAutomationTriggerWithToken } from "@/actions/automation/pipeline/triggerPipelineAutomation";
import { db } from "@/lib/db";
import { sendClientMessageNotification } from "@/lib/notification/communication-notify";
import sendClientMailOrSMSNotify from "@/lib/pusher/client-conversation-notify";
import receiveTwiloMessage from "@/lib/pusher/receiveTwiloMessage";
import { getPusherInstance } from "@/lib/pusher/server";
import { NextRequest, NextResponse } from "next/server";

const pusher = getPusherInstance();

/**
 * @swagger
 * /api/infobip/mms/receive:
 *   post:
 *     summary: Infobip MMS webhook
 *     tags: [Infobip]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               results:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: MMS processed
 *       400:
 *         description: No results in payload
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("Infobip MMS webhook received:", JSON.stringify(body, null, 2));

    // Extract relevant fields from Infobip MMS webhook payload
    const { results = [] } = body;

    if (!results || results.length === 0) {
      console.log("No results in MMS webhook payload");
      return NextResponse.json(
        { error: "No results in MMS webhook payload" },
        { status: 400 },
      );
    }

    // Process each MMS message in the results array
    for (const messageData of results) {
      const {
        from,
        to,
        text: message,
        cleanText,
        messageId,
        receivedAt,
        keyword,
        entityId,
        applicationId,
        // MMS specific fields
        media = [],
        subject,
      } = messageData;

      console.log(
        `Processing MMS message: from=${from}, to=${to}, text="${message || cleanText}", media count=${media.length}`,
      );

      if (!from || !to) {
        console.log("Missing required fields: from or to");
        continue;
      }

      const normalizedFrom = normalizePhoneNumber(from);
      const normalizedTo = normalizePhoneNumber(to);

      const messageText = message || cleanText || "";

      // Find Infobip configurations that match the "to" phone number
      const infobipConfigs = await db.infobipConfig.findMany({
        where: {
          OR: normalizedTo.lookupValues.map((lookupValue) => ({
            phoneNumber: {
              endsWith: lookupValue,
            },
          })),
        },
      });

      console.log(
        `Found ${infobipConfigs.length} Infobip configs for phone number ${to}`,
      );

      if (infobipConfigs.length === 0) {
        console.log(`No Infobip configuration found for phone number ${to}`);
        continue;
      }

      // Process for each matching company
      for (const infobipConfig of infobipConfigs) {
        console.log(`Processing MMS for company ${infobipConfig.companyId}`);

        // Find client by the "from" phone number (client's phone)
        let client = await db.client.findFirst({
          where: {
            OR: normalizedFrom.lookupValues.map((lookupValue) => ({
              mobile: {
                endsWith: lookupValue,
              },
            })),
            companyId: infobipConfig.companyId,
          },
        });

        if (!client) {
          client = await db.client.create({
            data: {
              firstName: from,
              lastName: " ",
              mobile: normalizedFrom.storeValue,
              companyId: infobipConfig.companyId,
              isSalesAgent: true,
            },
          });
        }

        console.log(`Client found: ${client ? client.id : "none"}`);

        if (client) {
          // Create SMS record in database (MMS messages are stored in clientSMS table)
          const clientSMS = await db.clientSMS.create({
            data: {
              from,
              to,
              message: messageText,
              sentBy: "Client",
              clientId: client.id,
              companyId: client.companyId,
            },
          });

          console.log(`Created MMS record with ID: ${clientSMS.id}`);

          // Process MMS attachments
          if (media && media.length > 0) {
            console.log(`Processing ${media.length} MMS attachments`);
            for (const mediaItem of media) {
              const ext = infobipMimeToExt(mediaItem.contentType || "");
              const baseName =
                mediaItem.caption ||
                mediaItem.name ||
                `mms_media_${Date.now()}`;
              // Ensure the name has an extension so the frontend can detect type
              const name = baseName.includes(".")
                ? baseName
                : `${baseName}.${ext}`;
              const isVoice = (mediaItem.contentType || "")
                .split(";")[0]
                .trim()
                .startsWith("audio/");
              const attachment = await db.clientSmsAttachments.create({
                data: {
                  name,
                  url: mediaItem.url,
                  isVoiceNote: isVoice,
                  clientSMSId: clientSMS.id,
                },
              });
              console.log(
                `Created attachment: ${attachment.name} - ${attachment.url}`,
              );
            }
          }

          // Count unread messages
          const totalUnReadMessages = await db.clientSMS.count({
            where: {
              clientId: client.id,
              sentBy: "Client",
              isRead: false,
            },
          });

          // Update chat track
          await updateNewSMSChatTrack({
            clientId: client.id,
            smsLastMessage: messageText,
            lastMessageBy: "Client",
          });

          // Send notifications
          sendClientMessageNotification({
            companyId: infobipConfig.companyId,
            clientId: client.id,
            clientName: client.firstName + " " + client.lastName,
            message: messageText,
            hasMedia: media.length > 0,
          });

          // Trigger Pusher notification
          const channelName = `message-${client.id}`;
          pusher.trigger(channelName, "client", { count: totalUnReadMessages });

          // Send Pusher message for real-time updates
          try {
            await receiveTwiloMessage(clientSMS);
          } catch (pusherError) {
            console.error("Pusher receiveTwiloMessage error:", pusherError);
          }

          // Send client mail or SMS notification
          try {
            await sendClientMailOrSMSNotify(client.id);
          } catch (pusherError) {
            console.error(
              "Pusher sendClientMailOrSMSNotify error:",
              pusherError,
            );
          }

          // Trigger pipeline automation if applicable
          try {
            const clientWithLead = await db.client.findFirst({
              where: { id: client.id },
              include: {
                Lead: {
                  select: {
                    id: true,
                    columnId: true,
                  },
                },
              },
            });

            if (clientWithLead?.Lead?.id && clientWithLead?.Lead?.columnId) {
              await updatePipelineAutomationTriggerWithToken({
                companyId: client.companyId,
                condition: "MESSAGE_RECEIVED_CLIENT",
                leadId: clientWithLead.Lead.id,
                columnId: clientWithLead.Lead.columnId,
              });
            }
          } catch (automationError) {
            console.error("Pipeline automation error:", automationError);
          }

          console.log(`Successfully processed MMS for client ${client.id}`);
        } else {
          console.log(
            `No client found for phone number ${from} in company ${infobipConfig.companyId}`,
          );
        }
      }
    }

    return NextResponse.json(
      {
        message: "MMS webhook processed successfully",
        processedCount: results.length,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Infobip MMS webhook error:", error);
    return NextResponse.json(
      { message: "MMS webhook processing failed", error: error?.message },
      { status: 500 },
    );
  }
}

// GET endpoint for testing MMS webhook URL
export async function GET() {
  return NextResponse.json(
    { message: "Infobip MMS receive webhook is active" },
    { status: 200 },
  );
}

function infobipMimeToExt(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "audio/ogg": "ogg",
    "audio/mpeg": "mp3",
    "audio/mp4": "m4a",
    "audio/wav": "wav",
    "audio/webm": "webm",
    "audio/amr": "amr",
    "audio/aac": "aac",
    "audio/3gpp": "3gp",
    "video/mp4": "mp4",
    "video/3gpp": "3gp",
    "application/pdf": "pdf",
  };
  return map[mime.split(";")[0].trim()] || "bin";
}

function normalizePhoneNumber(phone: string) {
  const digits = (phone || "").replace(/\D/g, "");
  const last10Digits = digits.length >= 10 ? digits.slice(-10) : digits;

  const lookupValues = Array.from(
    new Set([digits, last10Digits].filter((value) => value.length > 0)),
  );

  const storeValue =
    digits.length === 11 && digits.startsWith("1")
      ? last10Digits
      : digits || phone;

  return {
    lookupValues,
    storeValue,
  };
}
