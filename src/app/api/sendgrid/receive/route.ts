import receiveMail from "@/lib/pusher/receiveMail-pusher";
import { db } from "@/lib/db";
import { sendClientEmailNotification } from "@/lib/notification/communication-notify";
import { MailgunEmailAttachment } from "@prisma/client";
import { NextResponse } from "next/server";
import { updateNewEmailChatTrack } from "@/actions/communication/client/chat-track";
import sendClientMailOrSMSNotify from "@/lib/pusher/client-conversation-notify";
import { updatePipelineAutomationTrigger } from "@/actions/automation/pipeline/triggerPipelineAutomation";
import crypto from "crypto";

// Verify SendGrid webhook signature
function verifyWebhookSignature(
  payload: string,
  signature: string,
  timestamp: string,
  publicKey: string
): boolean {
  try {
    const timestampedPayload = timestamp + payload;
    const expectedSignature = crypto
      .createHmac("sha256", publicKey)
      .update(timestampedPayload)
      .digest("base64");

    return crypto.timingSafeEqual(
      Buffer.from(signature, "base64"),
      Buffer.from(expectedSignature, "base64")
    );
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";

    // For SendGrid Inbound Parse webhook, verify signature if enabled
    if (process.env.SENDGRID_WEBHOOK_VERIFY_SIGNATURE === "true") {
      const signature = request.headers.get(
        "x-twilio-email-event-webhook-signature"
      );
      const timestamp = request.headers.get(
        "x-twilio-email-event-webhook-timestamp"
      );
      const payload = await request.text();

      if (
        !signature ||
        !timestamp ||
        !process.env.SENDGRID_WEBHOOK_PUBLIC_KEY
      ) {
        throw new Error("Missing required webhook verification headers");
      }

      if (
        !verifyWebhookSignature(
          payload,
          signature,
          timestamp,
          process.env.SENDGRID_WEBHOOK_PUBLIC_KEY
        )
      ) {
        throw new Error("Invalid webhook signature");
      }

      // Re-create request with the consumed payload
      request = new Request(request.url, {
        method: request.method,
        headers: request.headers,
        body: payload,
      });
    }

    let emailData: any;
    const attachments = [];

    // Handle different content types
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();

      // Convert iterator to an array and log all fields
      Array.from(formData.entries()).forEach(([key, value]) => {});

      // SendGrid sends attachments differently than Mailgun
      let attachmentCount = 0;
      const attachmentKeys = Array.from(formData.keys()).filter((key) =>
        key.startsWith("attachment")
      );

      for (const key of attachmentKeys) {
        const file = formData.get(key) as File;
        if (file) {
          attachments.push(file);
          attachmentCount++;
        }
      }

      emailData = {
        // SendGrid Inbound Parse webhook field mapping
        recipient: formData.get("to")?.toString(), // SendGrid uses 'to' instead of 'recipient'
        sender: formData.get("from")?.toString(), // SendGrid uses 'from' instead of 'sender'
        subject: formData.get("subject")?.toString() || "No Subject",
        message: formData.get("text")?.toString() || "No message content", // SendGrid uses 'text' instead of 'body-plain'
        htmlBody: formData.get("html")?.toString() || null, // SendGrid uses 'html' instead of 'body-html'
        attachments: [], // SendGrid doesn't send attachment info in JSON format
        attachmentCount: attachmentCount,
      };

      // Extract message headers - SendGrid format
      const headers = formData.get("headers")?.toString();
      if (headers) {
        try {
          const parsedHeaders = JSON.parse(headers);

          // SendGrid headers are in object format, not array of arrays
          if (parsedHeaders["Message-ID"]) {
            emailData.messageId = parsedHeaders["Message-ID"];
          } else if (parsedHeaders["message-id"]) {
            emailData.messageId = parsedHeaders["message-id"];
          }
        } catch (e) {
          console.error("Error parsing headers:", e);
        }
      }

      // Alternative: SendGrid might send Message-ID directly
      const messageId =
        formData.get("headers[Message-ID]")?.toString() ||
        formData.get("Message-ID")?.toString();
      if (messageId) {
        emailData.messageId = messageId;
      }
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const body = await request.text();
      const params = new URLSearchParams(body);

      emailData = {
        recipient: params.get("to"), // SendGrid uses 'to'
        sender: params.get("from"), // SendGrid uses 'from'
        subject: params.get("subject") || "No Subject",
        message: params.get("text") || "No message content", // SendGrid uses 'text'
        htmlBody: params.get("html") || null, // SendGrid uses 'html'
        attachments: [],
      };

      // Extract message headers
      const headers = params.get("headers");
      if (headers) {
        try {
          const parsedHeaders = JSON.parse(headers);
          if (parsedHeaders["Message-ID"]) {
            emailData.messageId = parsedHeaders["Message-ID"];
          } else if (parsedHeaders["message-id"]) {
            emailData.messageId = parsedHeaders["message-id"];
          }
        } catch (e) {
          console.error("Error parsing headers:", e);
        }
      }
    } else if (contentType.includes("application/json")) {
      // SendGrid might also send JSON webhooks for events
      const jsonBody = await request.json();

      // Handle SendGrid event webhook format
      if (Array.isArray(jsonBody)) {
        // This is likely an event webhook, not inbound parse
        return NextResponse.json({
          success: true,
          message: "Event webhook received",
        });
      }

      emailData = jsonBody;
    } else {
      throw new Error("Unsupported Content-Type");
    }

    // Extract company ID from recipient email
    // SendGrid format might be different, adjust accordingly
    const recipientParts = emailData.recipient?.split("@");
    if (!recipientParts || recipientParts.length < 2) {
      throw new Error("Invalid recipient format");
    }

    const companyId = recipientParts[0];

    const company = await db.company.findFirst({
      where: {
        id: parseInt(companyId),
      },
    });

    if (!company) {
      console.error("No Company Found for:", emailData.recipient);
      throw new Error("Unauthorized: No Company Found");
    }

    const clientEmail = emailData.sender.split("<")[1].split(">")[0];

    // Fetch client from the sender's email address
    const client = await db.client.findFirst({
      where: { email: clientEmail, companyId: company?.id },
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

    // Store email data in the database (updated table name)
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
        }
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
            mailgunEmailId: email.id, // Updated field name
          },
        });
        attachmentsFromDB.push(attachment);
      }
    }

    // Update the client's conversation track
    const clientConversationTrack = await updateNewEmailChatTrack({
      clientId: client.id,
      emailLastMessage: extractActualMessage(emailData.message),
      lastMessageBy: "Client",
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

    // Additional logic (e.g., notify users, handle email routing, etc.)
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in POST handler:", error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
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
