import { updateNewSMSChatTrack } from "@/actions/communication/client/chat-track";
import { updatePipelineAutomationTriggerWithToken } from "@/actions/automation/pipeline/triggerPipelineAutomation";
import { db } from "@/lib/db";
import { sendClientMessageNotification } from "@/lib/notification/communication-notify";
import sendClientMailOrSMSNotify from "@/lib/pusher/client-conversation-notify";
import receiveTwiloMessage from "@/lib/pusher/receiveTwiloMessage";
import { getPusherInstance } from "@/lib/pusher/server";
import { NextRequest, NextResponse } from "next/server";
import { sendSMSToAgent } from "@/service/ai-agent/api";
import { revalidatePath } from "next/cache";

const pusher = getPusherInstance();

/**
 * @swagger
 * /api/infobip/sms/receive:
 *   post:
 *     summary: Infobip SMS webhook
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
 *         description: Message processed
 *       400:
 *         description: No results in payload
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("Infobip webhook received:", JSON.stringify(body, null, 2));

    // Extract relevant fields from Infobip webhook payload
    const { results = [] } = body;

    if (!results || results.length === 0) {
      console.log("No results in webhook payload");
      return NextResponse.json(
        { error: "No results in webhook payload" },
        { status: 400 },
      );
    }

    // Process each message in the results array
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
        // For MMS - update to use correct field name from webhook
        message: mediaMessages = [],
      } = messageData;

      console.log(
        `Processing message: from=${from}, to=${to}, text="${message || cleanText}"`,
      );

      if (!from || !to) {
        console.log("Missing required fields: from or to");
        continue;
      }

      const messageText = message || cleanText || "";

      // Handle cross-platform MMS: Extract Twilio media URLs if present
      const twilioMediaUrls = [];
      const twilioUrlRegex = /https:\/\/p\.twil\.io\/[a-zA-Z0-9]+/g;
      const foundUrls = messageText.match(twilioUrlRegex) || [];

      // Clean message text and collect media URLs
      let cleanedMessageText = messageText;
      if (foundUrls.length > 0) {
        cleanedMessageText = messageText.replace(twilioUrlRegex, "").trim();
        twilioMediaUrls.push(...foundUrls);
        console.log(
          `Found ${twilioMediaUrls.length} Twilio media URLs:`,
          twilioMediaUrls,
        );
      }

      // Find Infobip configurations that match the "to" phone number
      // The "to" field should match our Infobip phone number
      const infobipConfigs = await db.infobipConfig.findMany({
        where: {
          phoneNumber: {
            endsWith: to.replace("+", ""),
          },
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
        console.log(`Processing for company ${infobipConfig.companyId}`);
        const company = await db.company.findUnique({
          where: { id: infobipConfig?.companyId },
        });
        // Find client by the "from" phone number (client's phone)
        let client = await db.client.findFirst({
          where: {
            mobile: {
              endsWith: from.replace("+", ""),
            },
            companyId: infobipConfig.companyId,
          },
        });

        if (!client) {
          client = await db.client.create({
            data: {
              firstName: from,
              lastName: " ",
              mobile: from,
              companyId: infobipConfig.companyId,
            },
          });
        }
        console.log(`Client found: ${client ? client.id : "none"}`);

        if (client) {
          // Create SMS record in database
          const clientSMS = await db.clientSMS.create({
            data: {
              from,
              to,
              message: cleanedMessageText,
              sentBy: "Client",
              clientId: client.id,
              companyId: client.companyId,
            },
          });

          console.log(`Created SMS record with ID: ${clientSMS.id}`);

          // Download and re-upload Infobip media files to our storage
          const processedAttachments = [];

          if (mediaMessages && mediaMessages.length > 0) {
            console.log(
              `Processing ${mediaMessages.length} Infobip media attachments`,
            );

            const formData = new FormData();

            // Download each media file and add to FormData
            for (const mediaItem of mediaMessages) {
              try {
                const file = await fetchInfobipMedia(
                  mediaItem.url,
                  mediaItem.contentType,
                );
                formData.append("file", file);
              } catch (error) {
                console.error(
                  `Failed to fetch media from ${mediaItem.url}:`,
                  error,
                );
              }
            }

            // Upload to our storage system
            if (formData.has("file")) {
              try {
                const res = await fetch(
                  `${process.env.NEXT_PUBLIC_APP_URL}/api/upload`,
                  {
                    method: "POST",
                    body: formData,
                  },
                );

                const uploadResult = await res.json();
                const uploadedUrls = uploadResult?.data ?? [];

                // Store the uploaded URLs in database
                for (let i = 0; i < uploadedUrls.length; i++) {
                  const attachment = await db.clientSmsAttachments.create({
                    data: {
                      name: `infobip_media_${Date.now()}_${i}`,
                      url: uploadedUrls[i],
                      clientSMSId: clientSMS.id,
                    },
                  });
                  processedAttachments.push(attachment);
                }

                console.log(
                  `Successfully uploaded and stored ${uploadedUrls.length} media files`,
                );
              } catch (error) {
                console.error("Failed to upload media files:", error);
              }
            }
          }

          // Process Twilio media URLs as attachments (cross-platform support)
          if (twilioMediaUrls.length > 0) {
            console.log(
              `Processing ${twilioMediaUrls.length} Twilio media URLs as attachments`,
            );
            for (let i = 0; i < twilioMediaUrls.length; i++) {
              const attachment = await db.clientSmsAttachments.create({
                data: {
                  name: `twilio_media_${i + 1}`,
                  url: twilioMediaUrls[i],
                  clientSMSId: clientSMS.id,
                },
              });
              processedAttachments.push(attachment);
            }
          }

          //sales agent

          if (company && company.isSalesAgent && client.isSalesAgent) {
            if (clientSMS && clientSMS?.to === infobipConfig.phoneNumber) {
              await sendSMSToAgent({
                company_id: client.companyId,
                message: clientSMS?.message,
                send_from: clientSMS?.from,
                send_to: clientSMS?.to,
                client_id: client.id,
              });
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
          updateNewSMSChatTrack({
            clientId: client.id,
            smsLastMessage: cleanedMessageText,
            lastMessageBy: "Client",
            attachments: processedAttachments,
          });

          // Send notifications
          sendClientMessageNotification({
            companyId: infobipConfig.companyId,
            clientId: client.id,
            clientName: client.firstName + " " + client.lastName,
          });

          // Trigger Pusher notification
          const channelName = `message-${client.id}`;
          pusher.trigger(channelName, "client", { count: totalUnReadMessages });

          // Send Pusher message for real-time updates
          try {
            receiveTwiloMessage({
              ...clientSMS,
              attachments: processedAttachments,
            });
          } catch (pusherError) {
            console.error("Pusher receiveTwiloMessage error:", pusherError);
            // Continue processing even if pusher fails
          }

          // Send client mail or SMS notification
          try {
            sendClientMailOrSMSNotify(client.id);
          } catch (pusherError) {
            console.error(
              "Pusher sendClientMailOrSMSNotify error:",
              pusherError,
            );
            // Continue processing even if pusher fails
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
              updatePipelineAutomationTriggerWithToken({
                companyId: client.companyId,
                condition: "MESSAGE_RECEIVED_CLIENT",
                leadId: clientWithLead.Lead.id,
                columnId: clientWithLead.Lead.columnId,
              });
            }
          } catch (automationError) {
            console.error("Pipeline automation error:", automationError);
          }

          console.log(`Successfully processed message for client ${client.id}`);
        } else {
          console.log(
            `No client found for phone number ${from} in company ${infobipConfig.companyId}`,
          );
        }
      }
    }
    revalidatePath("/dashboard/communication/client");
    return NextResponse.json(
      {
        message: "Webhook processed successfully",
        processedCount: results.length,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Infobip webhook error:", error);
    return NextResponse.json(
      { message: "Webhook processing failed", error: error?.message },
      { status: 500 },
    );
  }
}

// Function to fetch Infobip media and convert to File
async function fetchInfobipMedia(url: string, contentType: string) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch Infobip media: ${response.statusText}`);
  }

  const blob = await response.blob();

  // Extract file extension from content type
  const extension = contentType.split("/")[1] || "bin";
  const fileName = `infobip-media-${Date.now()}.${extension}`;

  return new File([blob], fileName, { type: contentType });
}

// Optional: Add GET endpoint for testing webhook URL
export async function GET() {
  return NextResponse.json(
    { message: "Infobip SMS receive webhook is active" },
    { status: 200 },
  );
}
