import receiveMail from "@/lib/pusher/receiveMail-pusher";
import { db } from "@/lib/db";
import { sendClientEmailNotification } from "@/lib/notification/communication-notify";
import { MailgunEmailAttachment } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { updateNewEmailChatTrack } from "@/actions/communication/client/chat-track";
import sendClientMailOrSMSNotify from "@/lib/pusher/client-conversation-notify";
import { updatePipelineAutomationTrigger } from "@/actions/automation/pipeline/triggerPipelineAutomation";
import {
  S3Client,
  GetObjectCommand as S3GetObjectCommand,
} from "@aws-sdk/client-s3";
import { simpleParser } from "mailparser";
import { Readable } from "stream";

// Initialize AWS clients
const s3Client = new S3Client({
  region: process.env.AWS_BUCKET_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY!,
    secretAccessKey: process.env.AWS_SECRET_KEY!,
  },
});

// Helper function to extract company ID from email address
function extractCompanyId(email: string): string | null {
  const match = email.match(/^(\d+)@/);
  return match ? match[1] : null;
}

// Helper function to process attachments
async function processAttachments(
  attachments: any[],
  emailId: number
): Promise<MailgunEmailAttachment[]> {
  const attachmentsFromDB: MailgunEmailAttachment[] = [];

  for (const attachment of attachments) {
    if (attachment.content && attachment.filename) {
      // Create a blob from the attachment content
      const blob = new Blob([attachment.content], {
        type: attachment.contentType || "application/octet-stream",
      });

      // Create a File object
      const file = new File([blob], attachment.filename, {
        type: attachment.contentType || "application/octet-stream",
      });

      // Upload to your file storage
      const formData = new FormData();
      formData.append("file", file);

      try {
        const uploadRes = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL}/api/upload`,
          {
            method: "POST",
            body: formData,
          }
        );

        if (uploadRes.ok) {
          const json = await uploadRes.json();
          if (json?.data?.length > 0) {
            const dbAttachment = await db.mailgunEmailAttachment.create({
              data: {
                name: attachment.filename,
                url: json.data[0],
                size: attachment.size || 0,
                mailgunEmailId: emailId,
              },
            });
            attachmentsFromDB.push(dbAttachment);
          }
        }
      } catch (error) {
        console.error("Failed to upload attachment:", error);
      }
    }
  }

  return attachmentsFromDB;
}

// Helper function to extract actual message content
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

// Helper function to convert stream to string
async function streamToString(stream: Readable): Promise<string> {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on("error", (err) => reject(err));
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.text();
    let notification;

    try {
      notification = JSON.parse(body);
    } catch (error) {
      console.error("Invalid JSON in webhook:", error);
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // Check if this is an SNS notification (wrapped)
    if (notification.Type === "SubscriptionConfirmation") {
      console.log("SNS Subscription confirmation:", notification.SubscribeURL);

      // Automatically confirm subscription
      try {
        await fetch(notification.SubscribeURL);
        console.log("SNS subscription confirmed");
      } catch (error) {
        console.error("Failed to confirm SNS subscription:", error);
      }

      return NextResponse.json({ message: "Subscription confirmed" });
    }

    // Handle SNS notification (wrapped SES message)
    if (notification.Type === "Notification") {
      const message = JSON.parse(notification.Message);

      // Process the unwrapped message
      return await processSESMessage(message);
    }

    // Handle direct SES notification (not wrapped in SNS)
    if (notification.notificationType === "Received") {
      return await processSESMessage(notification);
    }

    return NextResponse.json({ message: "Webhook processed" });
  } catch (error: unknown) {
    console.error("Error in POST handler:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

// Extracted function to process SES message (both direct and SNS-wrapped)
async function processSESMessage(message: any): Promise<NextResponse> {
  // Check if this is an email receipt
  if (
    message.notificationType === "Received" ||
    message.eventType === "receipt"
  ) {
    console.log("Processing email receipt");

    const mail = message.mail;

    // Extract recipient email to find company ID
    const recipientEmail = mail.commonHeaders?.to?.[0] || mail.destination?.[0];

    if (!recipientEmail) {
      console.error("No recipient email found");
      return NextResponse.json(
        { error: "No recipient email" },
        { status: 400 }
      );
    }

    const companyId = extractCompanyId(recipientEmail);

    if (!companyId) {
      console.error("Could not extract company ID from email:", recipientEmail);
      return NextResponse.json(
        { error: "Invalid recipient format" },
        { status: 400 }
      );
    }

    // Find the company
    const company = await db.company.findFirst({
      where: { id: parseInt(companyId) },
    });

    if (!company) {
      console.error("Company not found:", companyId);
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Get the email content
    let emailContent: string = "";
    let parsedEmail: any = {};

    // Check if email content is in the message directly (base64 encoded)
    if (message.content) {
      try {
        // Decode base64 content
        emailContent = Buffer.from(message.content, "base64").toString("utf8");
      } catch (error) {
        console.error("Error decoding base64 content:", error);
        emailContent = message.content; // fallback to raw content
      }
    } else if (
      message.receipt?.action?.type === "S3" &&
      message.receipt?.action?.bucketName
    ) {
      // Email is stored in S3
      const s3Params = {
        Bucket: message.receipt.action.bucketName,
        Key: message.receipt.action.objectKey,
      };

      try {
        const s3Response = await s3Client.send(
          new S3GetObjectCommand(s3Params)
        );
        if (s3Response.Body) {
          emailContent = await streamToString(s3Response.Body as Readable);
        }
      } catch (error) {
        console.error("Error fetching email from S3:", error);
      }
    }

    // Parse the email
    if (emailContent) {
      try {
        parsedEmail = await simpleParser(emailContent);
      } catch (error) {
        console.error("Error parsing email:", error);
        parsedEmail = {
          subject: mail.commonHeaders?.subject || "No Subject",
          text: "Could not parse email content",
          from: mail.commonHeaders?.from?.[0] || "Unknown Sender",
          html: "",
          attachments: [],
        };
      }
    }

    // Find the client based on sender email
    const senderEmail =
      parsedEmail.from?.value?.[0]?.address ||
      parsedEmail.from?.text ||
      mail.commonHeaders?.from?.[0];

    if (!senderEmail) {
      console.error("No sender email found");
      return NextResponse.json(
        { error: "No sender email found" },
        { status: 400 }
      );
    }

    // Fetch client from the sender's email address
    const client = await db.client.findFirst({
      where: { email: senderEmail, companyId: company.id },
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
      return NextResponse.json(
        { error: "Unauthorized: No Client Found" },
        { status: 401 }
      );
    }

    const emailText = extractActualMessage(
      parsedEmail.text || parsedEmail.html || "No message content"
    );

    // Store email data in the database
    const email = await db.mailgunEmail.create({
      data: {
        subject:
          parsedEmail.subject || mail.commonHeaders?.subject || "No Subject",
        text: emailText,
        emailBy: "Client",
        clientId: client.id,
        companyId: company.id,
        messageId: mail.messageId,
      },
    });

    // Process attachments if any
    let attachmentsFromDB: MailgunEmailAttachment[] = [];
    if (parsedEmail.attachments && parsedEmail.attachments.length > 0) {
      attachmentsFromDB = await processAttachments(
        parsedEmail.attachments,
        email.id
      );
    }

    // Update the client's conversation track
    const clientConversationTrack = await updateNewEmailChatTrack({
      clientId: client.id,
      emailLastMessage: emailText,
      lastMessageBy: "Client",
    });

    // Send mail realtime by pusher
    await receiveMail({ ...email, attachments: attachmentsFromDB });

    if (clientConversationTrack) {
      // Send a notification to the client for updated message
      await sendClientMailOrSMSNotify(company.id, clientConversationTrack);
    }

    // Send email notification to the admin, manager or sales users
    sendClientEmailNotification({
      clientId: client.id,
      companyId: company.id,
      sendAt: Date.now(),
      clientName: client.firstName,
    });

    // Trigger automation pipeline
    try {
      if (client?.Lead?.id && client?.Lead?.columnId) {
        await updatePipelineAutomationTrigger({
          companyId: client.companyId,
          condition: "MESSAGE_RECEIVED_CLIENT",
          leadId: client.Lead.id,
          columnId: client.Lead.columnId,
        });
      }
    } catch (error) {
      console.error("Pipeline automation trigger failed:", error);
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ message: "Unknown message type" });
}

// Also handle GET requests for webhook verification
export async function GET(req: NextRequest): Promise<NextResponse> {
  return NextResponse.json({ message: "SES webhook endpoint is active" });
}
