import receiveMail from "@/lib/pusher/receiveMail-pusher";
import { db } from "@/lib/db";
import { sendClientEmailNotification } from "@/lib/notification/communication-notify";
import { MailgunEmailAttachment } from "@prisma/client"; // You might want to rename this to EmailAttachment
import { NextResponse } from "next/server";
import { updateNewEmailChatTrack } from "@/actions/communication/client/chat-track";
import sendClientMailOrSMSNotify from "@/lib/pusher/client-conversation-notify";
import { updatePipelineAutomationTrigger } from "@/actions/automation/pipeline/triggerPipelineAutomation";

/**
 * @swagger
 * /api/infobip/email/receive:
 *   post:
 *     summary: Infobip email webhook
 *     tags: [Infobip]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               messageId:
 *                 type: string
 *               to:
 *                 type: string
 *               from:
 *                 type: string
 *               subject:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email processed
 *       400:
 *         description: Invalid email data
 */
// Infobip webhook payload interface
interface InfobipEmailWebhook {
  messageId: string;
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    name: string;
    contentType: string;
    size: number;
    data: string; // base64 encoded
  }>;
  headers?: Record<string, string>;
  receivedAt: string;
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";

    let emailData: any;
    const attachments = [];

    // Handle Infobip webhook payload (typically JSON)
    if (contentType.includes("application/json")) {
      const infobipPayload: InfobipEmailWebhook = await request.json();

      emailData = {
        recipient: infobipPayload.to,
        sender: infobipPayload.from,
        subject: infobipPayload.subject || "No Subject",
        message: infobipPayload.text || "No message content",
        htmlBody: infobipPayload.html || null,
        messageId: infobipPayload.messageId,
        receivedAt: infobipPayload.receivedAt,
      };

      // Handle attachments if present
      if (infobipPayload.attachments && infobipPayload.attachments.length > 0) {
        for (const attachment of infobipPayload.attachments) {
          // Convert base64 to blob/file
          const buffer = Buffer.from(attachment.data, "base64");
          const blob = new Blob([buffer], { type: attachment.contentType });
          const file = new File([blob], attachment.name, {
            type: attachment.contentType,
          });
          attachments.push(file);
        }
      }
    }
    // Fallback: Handle form-data (if Infobip supports it)
    else if (contentType.includes("multipart/form-data")) {
      // Read the raw body as ArrayBuffer to preserve binary data
      const bodyArrayBuffer = await request.arrayBuffer();
      const bodyText = new TextDecoder("latin1").decode(bodyArrayBuffer);

      // Extract boundary from content-type
      const boundaryMatch = contentType.match(/boundary=([^;]+)/);
      const boundary = boundaryMatch
        ? boundaryMatch[1].replace(/"/g, "")
        : null;

      if (!boundary) {
        throw new Error(
          `Failed to extract boundary from content-type: ${contentType}`,
        );
      }

      // Parse the multipart data manually
      const parts = bodyText.split(`--${boundary}`);
      const parsedData: Record<string, string> = {};
      const attachmentParts: Record<
        string,
        { data: string; contentType: string; filename: string }
      > = {};

      for (const part of parts) {
        if (part.trim() === "" || part.trim() === "--") continue;

        // Split headers from body
        const headerBodySplit = part.indexOf("\r\n\r\n");
        if (headerBodySplit === -1) continue;

        const headers = part.substring(0, headerBodySplit);
        const body = part.substring(headerBodySplit + 4);

        // Clean up the body - remove trailing boundary markers
        let cleanBody = body;
        const boundaryIndex = cleanBody.lastIndexOf(`\r\n--${boundary}`);
        if (boundaryIndex !== -1) {
          cleanBody = cleanBody.substring(0, boundaryIndex);
        }
        cleanBody = cleanBody.replace(/\r\n--$/, "").trim();

        if (!cleanBody) continue;

        // Extract the name from content-disposition header
        const nameMatch = headers.match(/name="([^"]+)"/);
        const contentTypeMatch = headers.match(/Content-Type:\s*([^;\r\n]+)/i);
        const filenameMatch = headers.match(/filename="([^"]+)"/);

        if (nameMatch) {
          const fieldName = nameMatch[1];
          const contentType = contentTypeMatch
            ? contentTypeMatch[1].trim()
            : "";
          const filename = filenameMatch ? filenameMatch[1] : "";

          // Check if this is an attachment (has Content-Type that's not text/plain and has filename)
          if (contentType && !contentType.startsWith("text/") && filename) {
            attachmentParts[fieldName] = {
              data: cleanBody,
              contentType,
              filename,
            };
          } else {
            parsedData[fieldName] = cleanBody;
          }
        }
      }

      // Handle attachments from direct multipart parsing
      for (const [fieldName, attachment] of Object.entries(attachmentParts)) {
        try {
          // Convert latin1 string back to binary ArrayBuffer
          const binaryData = new Uint8Array(attachment.data.length);
          for (let i = 0; i < attachment.data.length; i++) {
            binaryData[i] = attachment.data.charCodeAt(i) & 0xff;
          }

          const blob = new Blob([binaryData], { type: attachment.contentType });
          const file = new File([blob], attachment.filename, {
            type: attachment.contentType,
          });

          attachments.push(file);

          // Debug: Check first few bytes
          const firstBytes = Array.from(binaryData.slice(0, 10))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join(" ");
        } catch (attachmentError) {
          console.error(
            `Failed to process direct attachment ${attachment.filename}:`,
            attachmentError,
          );
        }
      }

      // Fallback: Handle attachments from Infobip attachmentInfo format
      if (parsedData.attachmentInfo && attachments.length === 0) {
        try {
          const attachmentInfo = JSON.parse(parsedData.attachmentInfo);

          if (Array.isArray(attachmentInfo)) {
            for (const attachment of attachmentInfo) {
              const attachmentKey = attachment.name; // e.g., "attachment1"
              const attachmentData = parsedData[attachmentKey];

              if (attachmentData) {
                try {
                  // Try different encoding approaches for binary data
                  let buffer: Buffer;

                  // First, try treating it as already binary (most likely for images)
                  if (attachment.contentType.startsWith("image/")) {
                    // For images, convert string to Uint8Array then to Buffer
                    const uint8Array = new Uint8Array(attachmentData.length);
                    for (let i = 0; i < attachmentData.length; i++) {
                      uint8Array[i] = attachmentData.charCodeAt(i);
                    }
                    buffer = Buffer.from(uint8Array);
                  } else {
                    // For other files, try binary encoding first
                    buffer = Buffer.from(attachmentData, "binary");
                  }
                  // @ts-ignore
                  const blob = new Blob([buffer], {
                    type: attachment.contentType,
                  });
                  const file = new File([blob], attachment.filename, {
                    type: attachment.contentType,
                  });

                  attachments.push(file);
                } catch (attachmentError) {
                  console.error(
                    `Failed to process fallback attachment ${attachment.filename}:`,
                    attachmentError,
                  );
                }
              }
            }
          }
        } catch (error) {
          console.error("Failed to parse attachmentInfo:", error);
        }
      }

      emailData = {
        recipient: parsedData.to || parsedData.recipient,
        sender: parsedData.from || parsedData.sender,
        subject: parsedData.subject || "No Subject",
        message:
          parsedData.text || parsedData["body-plain"] || "No message content",
        htmlBody: parsedData.html || parsedData["body-html"] || null,
        messageId:
          parsedData.messageId || parsedData["message-id"] || parsedData.id,
        receivedAt: parsedData.receivedAt || parsedData.timestamp,
      };
    }
    // Handle URL-encoded (less likely for Infobip)
    else if (contentType.includes("application/x-www-form-urlencoded")) {
      const body = await request.text();
      const params = new URLSearchParams(body);

      emailData = {
        recipient: params.get("to"),
        sender: params.get("from"),
        subject: params.get("subject") || "No Subject",
        message: params.get("text") || "No message content",
        htmlBody: params.get("html") || null,
        messageId: params.get("messageId"),
        receivedAt: params.get("receivedAt"),
      };
    } else {
      // If we can't determine the content type, try to read as text and see what we get
      const bodyText = await request.text();

      // Try to parse as JSON if it looks like JSON
      if (bodyText.trim().startsWith("{")) {
        try {
          const jsonData = JSON.parse(bodyText);

          emailData = {
            recipient: jsonData.to || jsonData.recipient,
            sender: jsonData.from || jsonData.sender,
            subject: jsonData.subject || "No Subject",
            message: jsonData.text || jsonData.message || "No message content",
            htmlBody: jsonData.html || jsonData.htmlBody || null,
            messageId: jsonData.messageId,
            receivedAt: jsonData.receivedAt,
          };
        } catch (jsonError) {
          console.error("JSON parsing error:", jsonError);
          throw new Error(
            "Unsupported Content-Type and failed to parse as JSON",
          );
        }
      } else {
        throw new Error(`Unsupported Content-Type: ${contentType}`);
      }
    }

    // Extract company ID from recipient email
    // Handle formats like '[1@ib79097.mail.autoworx.link]' or '1@ib79097.mail.autoworx.link'
    let recipientEmail = emailData.recipient?.trim();

    // Remove brackets if present
    if (recipientEmail?.startsWith("[") && recipientEmail?.endsWith("]")) {
      recipientEmail = recipientEmail.slice(1, -1);
    }

    let companyIdStr = recipientEmail?.split("@")[0];
    const companyId = parseInt(companyIdStr);

    if (isNaN(companyId) || !companyId) {
      console.error(
        "Invalid company ID extracted from recipient:",
        emailData.recipient,
      );
      throw new Error("Invalid recipient format: Unable to extract company ID");
    }

    const company = await db.company.findFirst({
      where: {
        id: companyId,
      },
    });

    if (!company) {
      console.error(
        "No Company Found for:",
        emailData.recipient,
        "Company ID:",
        companyId,
      );
      throw new Error("Unauthorized: No Company Found");
    }

    // Extract email from sender (handle formats like "Name <email@domain.com>" or just "email@domain.com")
    let senderEmail = emailData.sender?.trim();
    const emailMatch = senderEmail?.match(/<([^>]+)>/);
    if (emailMatch) {
      senderEmail = emailMatch[1]; // Extract email from "Name <email@domain.com>" format
    }

    // Fetch client from the sender's email address
    const client = await db.client.findFirst({
      where: { email: senderEmail, companyId: company?.id },
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
      console.error("No Client Found for sender:", senderEmail);
      throw new Error("Unauthorized: No Client Found");
    }

    // Store email data in the database (you might want to rename the table)
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

    // Process attachments
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
        console.error("Failed to upload attachment");
        continue; // Continue with other attachments instead of returning error
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
      attachments: attachmentsFromDB,
    });

    // Send mail realtime by pusher
    receiveMail({ ...email, attachments: attachmentsFromDB });

    if (clientConversationTrack) {
      // Send a notification to the client for updated message
      sendClientMailOrSMSNotify(company.id, clientConversationTrack);
    }

    // Send email notification to the admin, manager or sales users
    sendClientEmailNotification({
      clientId: client.id,
      companyId: company.id,
      sendAt: Date.now(),
      clientName: client.firstName,
    });

    // Pipeline automation trigger
    try {
      if (client?.Lead?.id && client?.Lead?.columnId) {
        updatePipelineAutomationTrigger({
          companyId: client.companyId,
          condition: "MESSAGE_RECEIVED_CLIENT",
          leadId: client?.Lead.id,
          columnId: client?.Lead?.columnId,
        });
      }
    } catch (error) {
      console.error("Pipeline automation trigger error:", error);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in Infobip webhook handler:", error.message);
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
