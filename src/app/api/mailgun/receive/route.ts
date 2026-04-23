import receiveMail from "@/lib/pusher/receiveMail-pusher";
import { db } from "@/lib/db";
import { sendClientEmailNotification } from "@/lib/notification/communication-notify";
import { MailgunEmailAttachment } from "@prisma/client";
import { NextResponse } from "next/server";
import { updateNewEmailChatTrack } from "@/actions/communication/client/chat-track";
import sendClientMailOrSMSNotify from "@/lib/pusher/client-conversation-notify";
import { updatePipelineAutomationTrigger } from "@/actions/automation/pipeline/triggerPipelineAutomation";

/**
 * @swagger
 * /api/mailgun/receive:
 *   post:
 *     summary: Mailgun email webhook
 *     tags: [Mailgun]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               recipient:
 *                 type: string
 *               sender:
 *                 type: string
 *               subject:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email received and processed
 *       400:
 *         description: Invalid email data
 */
export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";

    let emailData: any;
    const attachments = [];

    // Handle different content types
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();

      // Convert iterator to an array and log all fields
      Array.from(formData.entries()).forEach(([key, value]) => {});
      let ct = (formData.get("attachment-count") as any) || 0;
      for (let i = 0; i < ct; i++) {
        let file = formData.get(`attachment-${i + 1}`) as File;
        attachments.push(file);
      }

      emailData = {
        recipient: formData.get("recipient")?.toString(),
        sender: formData.get("sender")?.toString(),
        subject: formData.get("subject")?.toString() || "No Subject",
        message: formData.get("body-plain")?.toString() || "No message content",
        htmlBody: formData.get("body-html")?.toString() || null,
        attachments: JSON.parse(
          formData.get("attachments")?.toString() || "[]",
        ),
      };

      // Extract and parse message headers
      const messageHeaders = formData.get("message-headers")?.toString();
      if (messageHeaders) {
        const headers = JSON.parse(messageHeaders) as [string, string];

        // Find the Message-ID header
        const messageIdHeader = headers.find(
          (header) => header[0]?.toLowerCase() === "message-id",
        );

        if (messageIdHeader) {
          emailData.messageId = messageIdHeader[1];
        }
      }
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const body = await request.text();
      const params = new URLSearchParams(body);
      emailData = {
        recipient: params.get("recipient"),
        sender: params.get("sender"),
        subject: params.get("subject") || "No Subject",
        message: params.get("body-plain") || "No message content",
        htmlBody: params.get("body-html") || null,
        attachments: JSON.parse(params.get("attachments") || "[]"),
      };

      // Extract and parse message headers
      const messageHeaders = params.get("message-headers");
      if (messageHeaders) {
        const headers = JSON.parse(messageHeaders) as [string, string];

        // Find the Message-ID header
        const messageIdHeader = headers.find(
          (header) => header[0]?.toLowerCase() === "message-id",
        );

        if (messageIdHeader) {
          emailData.messageId = messageIdHeader[1];
        }
      }
    } else {
      throw new Error("Unsupported Content-Type");
    }

    const company = await db.company.findFirst({
      where: {
        id: parseInt(emailData.recipient?.split("@")[0]),
      },
    });

    if (!company) {
      console.error("No Company Found for:", emailData.recipient);
      throw new Error("Unauthorized: No Company Found");
    }

    // Fetch client from the sender's email address
    const client = await db.client.findFirst({
      where: { email: emailData.sender, companyId: company?.id },
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
      console.error("No Client Found for sender:", emailData.sender);
      throw new Error("Unauthorized: No Client Found");
    }

    // Store email data in the database
    const email = await db.mailgunEmail.create({
      data: {
        subject: emailData.subject || "",
        text: extractActualMessage(emailData.message) || "",
        emailBy: "Client",
        clientId: client.id,
        companyId: company.id,
        messageId: emailData?.messageId,
      },
    });

    let attachmentsFromDB: MailgunEmailAttachment[] = [];

    for (const file of attachments) {
      const formData2 = new FormData();
      formData2.append("file", file!);

      const uploadRes = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/upload`,
        {
          method: "POST",
          body: formData2,
        },
      );

      if (!uploadRes.ok) {
        console.error("Failed to upload photos");
        return uploadRes.json();
      }

      const json = await uploadRes.json();

      if (file && json?.data?.length > 0) {
        const attachment = await db.mailgunEmailAttachment.create({
          data: {
            name: file.name,
            url: json.data[0],
            size: file.size,
            mailgunEmailId: email.id,
          },
        });
        attachmentsFromDB.push(attachment);
      }
    }

    // Update the client's conversation track
    const clientConversationTrack = await updateNewEmailChatTrack({
      clientId: client.id,
      emailLastMessage: extractActualMessage(emailData.message),
      lastEmailBy: "Client",
    });

    // send mail realtime by pusher
    await receiveMail({ ...email, attachments: attachmentsFromDB });

    if (clientConversationTrack) {
      // send a notification to the client for updated message
      await sendClientMailOrSMSNotify(company.id, clientConversationTrack);
    }

    // Send email notification to the admin, manager or sales users
    sendClientEmailNotification({
      clientId: client.id,
      companyId: company.id,
      sendAt: Date.now(),
      clientName: client.firstName,
    });

    try {
      if (client?.Lead?.id && client?.Lead?.columnId) {
        await updatePipelineAutomationTrigger({
          companyId: client.companyId,
          condition: "MESSAGE_RECEIVED_CLIENT",
          leadId: client?.Lead.id,
          columnId: client?.Lead?.columnId,
        });
      }
    } catch (error) {}
    // // communication automation trigger
    // try {
    //   if (client?.Lead?.id && client?.Lead?.columnId) {
    //     await updateCommunicationAutomationTrigger({
    //       companyId: client.companyId,
    //       leadId: client?.Lead.id,
    //       columnId: client?.Lead?.columnId,
    //     });
    //   }
    // } catch (error) {}

    // Additional logic (e.g., notify users, handle email routing, etc.)
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in POST handler:", error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

function extractActualMessage(emailText: string) {
  // If the email is empty or null, return empty string
  if (!emailText) return "";

  // Split the email into lines
  const lines = emailText.split("\n");

  // Array to hold the main text
  const mainText = [];

  // Flag to track if we're in quoted content
  let inQuote = false;

  // Process each line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines
    if (!line) continue;

    // Check if line starts a quoted section (e.g., "On Tue, Feb 25, 2025...")
    if (
      line.startsWith("On ") &&
      (line.includes("wrote:") ||
        (i + 1 < lines.length && lines[i + 1].includes("wrote:")))
    ) {
      inQuote = true;
      continue;
    }

    // Check for quoted lines that start with '>'
    if (line.startsWith(">")) {
      inQuote = true;
      continue;
    }

    // If we're not in a quoted section, add the line to main text
    if (!inQuote) {
      mainText.push(line);
    }
  }

  // Join the main text lines and return
  return mainText.join("\n").trim();
}
