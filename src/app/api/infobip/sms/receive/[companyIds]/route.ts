import { updatePipelineAutomationTriggerWithToken } from "@/actions/automation/pipeline/triggerPipelineAutomation";
import { updateNewSMSChatTrack } from "@/actions/communication/client/chat-track";
import { db } from "@/lib/db";
import { getCompanyEntitlements } from "@/lib/platform-billing/entitlement-service";
import { sendClientMessageNotification } from "@/lib/notification/communication-notify";
import sendClientMailOrSMSNotify from "@/lib/pusher/client-conversation-notify";
import receiveTwiloMessage from "@/lib/pusher/receiveTwiloMessage";
import { getPusherInstance } from "@/lib/pusher/server";
import { NextRequest, NextResponse } from "next/server";

const pusher = getPusherInstance();

/**
 * @swagger
 * /api/infobip/sms/receive/{companyIds}:
 *   post:
 *     summary: Infobip SMS webhook for multiple companies
 *     tags: [Infobip]
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
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               results:
 *                 type: array
 *               from:
 *                 type: string
 *               to:
 *                 type: string
 *     responses:
 *       200:
 *         description: Message processed
 *       400:
 *         description: Missing required fields
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ companyIds: string }> },
) {
  try {
    const { params } = context;
    const companyIdsParam = (await params)?.companyIds;

    // Parse list of company IDs
    const companyIds = companyIdsParam.split(",").map((id) => parseInt(id, 10));

    const body = await req.json();

    // Extract relevant fields from Infobip webhook payload
    // Handle both delivery reports and incoming messages
    const {
      results = [],
      from,
      to,
      text: message,
      messageId,
      receivedAt,
      keyword,
      cleanText,
      // For MMS
      media = [],
    } = body;

    // If this is a delivery report, process it
    if (results && results.length > 0) {
      console.log("Infobip delivery report received:", results);
      return NextResponse.json(
        { message: "Delivery report processed" },
        { status: 200 },
      );
    }

    if (!from || !to) {
      return NextResponse.json(
        { error: "Missing required fields: from or to" },
        { status: 400 },
      );
    }

    const messageText = message || cleanText || "";

    // Get Infobip configurations for the specified companies
    const infobipConfigs = await db.infobipConfig.findMany({
      where: {
        companyId: {
          in: companyIds,
        },
        phoneNumber: {
          endsWith: to.replace("+", ""),
        },
      },
    });

    if (infobipConfigs.length === 0) {
      return NextResponse.json(
        {
          error:
            "No Infobip configuration found for the specified companies and phone number",
        },
        { status: 404 },
      );
    }

    // Process for each matching company configuration
    for (const infobipConfig of infobipConfigs) {
      const entitlements = await getCompanyEntitlements(
        infobipConfig.companyId,
      );
      if (!entitlements.canUseSms) {
        continue;
      }

      let client = await db.client.findFirst({
        where: {
          mobile: {
            endsWith: from.replace("+", ""),
          },
          companyId: infobipConfig.companyId,
        },
        include: {
          Lead: {
            select: {
              id: true,
              columnId: true,
            },
          },
        },
      });

      if (!client) {
        client = await db.client.create({
          data: {
            firstName: from,
            lastName: " ",
            mobile: from,
            companyId: infobipConfig.companyId,
            isSalesAgent: true,
          },
          include: {
            Lead: {
              select: {
                id: true,
                columnId: true,
              },
            },
          },
        });
      }

      if (client) {
        // Create SMS record in database
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

        // Process MMS attachments if any
        if (media && media.length > 0) {
          for (const mediaItem of media) {
            await db.clientSmsAttachments.create({
              data: {
                name: mediaItem.caption || `media_${Date.now()}`,
                url: mediaItem.url,
                clientSMSId: clientSMS.id,
              },
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
          smsLastMessage: messageText,
          lastMessageBy: "Client",
        });

        // Send notifications
        sendClientMessageNotification({
          companyId: infobipConfig.companyId,
          clientId: client.id,
          clientName: client.firstName + " " + client.lastName,
          message: messageText,
        });

        // Trigger Pusher notification
        const channelName = `message-${client.id}`;
        pusher.trigger(channelName, "client", { count: totalUnReadMessages });

        // Send Pusher message for real-time updates
        receiveTwiloMessage(clientSMS);

        // Send client mail or SMS notification
        sendClientMailOrSMSNotify(client.id);

        // Trigger pipeline automation if applicable
        try {
          if (client.Lead?.id && client.Lead?.columnId) {
            updatePipelineAutomationTriggerWithToken({
              companyId: client.companyId,
              condition: "MESSAGE_RECEIVED_CLIENT",
              leadId: client.Lead.id,
              columnId: client.Lead.columnId,
            });
          }
        } catch (automationError) {
          console.error("Pipeline automation error:", automationError);
        }
      } else {
        console.log(
          `No client found for phone number ${from} in company ${infobipConfig.companyId}`,
        );
      }
    }

    return NextResponse.json(
      { message: "Webhook processed successfully", data: body },
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

// Optional: Add GET endpoint for testing webhook URL
export async function GET() {
  return NextResponse.json(
    { message: "Infobip SMS receive webhook is active" },
    { status: 200 },
  );
}
