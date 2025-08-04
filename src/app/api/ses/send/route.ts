import { updatePipelineAutomationTrigger } from "@/actions/automation/pipeline/triggerPipelineAutomation";
import { updateNewEmailChatTrack } from "@/actions/communication/client/chat-track";
import { db } from "@/lib/db";
import { SESClient, SendRawEmailCommand } from "@aws-sdk/client-ses";
import fs from "fs";
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { Readable, pipeline } from "stream";
import { promisify } from "util";

const pump = promisify(pipeline);

// Initialize AWS SES client
const sesClient = new SESClient({
  region: process.env.AWS_BUCKET_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY!,
    secretAccessKey: process.env.AWS_SECRET_KEY!,
  },
});

// Helper function to convert Web Stream to Node.js Readable stream
function webStreamToNodeStream(
  webStream: ReadableStream<Uint8Array>
): Readable {
  const reader = webStream.getReader();

  return new Readable({
    async read() {
      const { done, value } = await reader.read();
      if (done) {
        this.push(null); // End of stream
      } else {
        this.push(Buffer.from(value));
      }
    },
  });
}

// Helper function to create raw email with attachments
function createRawEmail(
  from: string,
  to: string,
  subject: string,
  text: string,
  attachments: Array<{ name: string; content: Buffer; mimeType: string }> = [],
  replyTo?: string,
  messageId?: string,
  references?: string
): string {
  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const attachmentBoundary = `----=_Attachment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  let rawEmail = `From: ${from}\r\n`;
  rawEmail += `To: ${to}\r\n`;
  rawEmail += `Subject: ${subject}\r\n`;

  if (replyTo) {
    rawEmail += `Reply-To: ${replyTo}\r\n`;
  }

  // Add thread headers for replies
  if (messageId) {
    rawEmail += `In-Reply-To: ${messageId}\r\n`;
  }
  if (references) {
    rawEmail += `References: ${references}\r\n`;
  }

  // Add unsubscribe headers
  rawEmail += `List-Unsubscribe: <mailto:unsubscribe@${process.env.SES_DOMAIN}?subject=unsubscribe>, <${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe>\r\n`;
  rawEmail += `List-Unsubscribe-Post: List-Unsubscribe=One-Click\r\n`;

  rawEmail += `MIME-Version: 1.0\r\n`;

  if (attachments.length > 0) {
    rawEmail += `Content-Type: multipart/mixed; boundary="${attachmentBoundary}"\r\n\r\n`;
    rawEmail += `--${attachmentBoundary}\r\n`;
  }

  rawEmail += `Content-Type: multipart/alternative; boundary="${boundary}"\r\n\r\n`;

  // Text part
  rawEmail += `--${boundary}\r\n`;
  rawEmail += `Content-Type: text/plain; charset=UTF-8\r\n`;
  rawEmail += `Content-Transfer-Encoding: 8bit\r\n\r\n`;
  rawEmail += `${text}\r\n\r\n`;
  rawEmail += `-------------------------\r\n`;
  rawEmail += `To unsubscribe, click here: ${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe?email=${encodeURIComponent(to)}\r\n`;
  rawEmail += `--${boundary}--\r\n`;

  // Add attachments
  if (attachments.length > 0) {
    for (const attachment of attachments) {
      rawEmail += `--${attachmentBoundary}\r\n`;
      rawEmail += `Content-Type: ${attachment.mimeType}; name="${attachment.name}"\r\n`;
      rawEmail += `Content-Transfer-Encoding: base64\r\n`;
      rawEmail += `Content-Disposition: attachment; filename="${attachment.name}"\r\n\r\n`;
      rawEmail += attachment.content.toString("base64") + "\r\n";
    }
    rawEmail += `--${attachmentBoundary}--\r\n`;
  }

  return rawEmail;
}

// Helper function to get MIME type based on file extension
function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes: { [key: string]: string } = {
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx":
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx":
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".txt": "text/plain",
    ".csv": "text/csv",
    ".zip": "application/zip",
  };

  return mimeTypes[ext] || "application/octet-stream";
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Parse the incoming form data
    const formData = await req.formData();
    const files = formData.getAll("files") as File[]; // Get all files
    const recipient = formData.get("recipient") as string | null;
    const text = formData.get("text") as string | null;

    if (!recipient) throw new Error("Recipient not provided");

    const client = await db.client.findFirst({
      where: { id: parseInt(recipient) },
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
      throw new Error("Client not found");
    }

    // Fetch company ID and domain info
    const company = await db.company.findFirst({
      where: { id: client.companyId },
    });

    if (!company) throw new Error("No company found");
    if (!company?.email) throw new Error("No Company Email Provided");

    const lastEmail = await db.mailgunEmail.findFirst({
      where: {
        clientId: parseInt(recipient),
        companyId: company.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Process attachments
    const attachments: Array<{
      name: string;
      content: Buffer;
      mimeType: string;
    }> = [];
    const filePaths: string[] = [];
    const uploadDir = path.join(process.cwd(), "temp/uploads");

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    if (files && files.length > 0) {
      for (const file of files) {
        const nodeStream = webStreamToNodeStream(file.stream());
        const filePath = path.join(uploadDir, file.name);

        await pump(nodeStream, fs.createWriteStream(filePath));
        await new Promise((resolve) => setTimeout(resolve, 100)); // Ensure write completion

        filePaths.push(filePath);

        // Read file content for attachment
        const fileContent = fs.readFileSync(filePath);
        attachments.push({
          name: file.name,
          content: fileContent,
          mimeType: getMimeType(file.name),
        });
      }
    }

    // Create the raw email
    const fromAddress = `communication@${process.env.MAILGUN_DOMAIN}`;

    const replyToAddress = `${company?.id}@${process.env.MAILGUN_DOMAIN}`;
    const subject = `New message from ${company?.name}`;

    const rawEmail = createRawEmail(
      fromAddress,
      client.email!,
      subject,
      text || "",
      attachments,
      replyToAddress,
      lastEmail?.messageId ?? "",
      lastEmail?.messageId ?? ""
    );

    // Send email using AWS SES
    const sendEmailCommand = new SendRawEmailCommand({
      Source: fromAddress,
      Destinations: [client?.email!],
      RawMessage: {
        Data: Buffer.from(rawEmail),
      },
    });

    const sesResponse = await sesClient.send(sendEmailCommand);

    let mailData;
    let MailData;

    if (sesResponse.MessageId) {
      // Save email to database
      mailData = await db.mailgunEmail.create({
        data: {
          subject: subject,
          text: text || "",
          emailBy: "Company",
          companyId: company.id,
          clientId: parseInt(recipient),
          messageId: sesResponse.MessageId,
        },
      });

      await updateNewEmailChatTrack({
        clientId: parseInt(recipient),
        emailLastMessage: text || "",
        lastMessageBy: "Company",
      });

      // Process and save attachments
      for (const file of files) {
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
          continue;
        }

        const json = await uploadRes.json();
        if (file && json?.data?.length > 0) {
          await db.mailgunEmailAttachment.create({
            data: {
              name: file.name,
              url: json.data[0],
              size: file.size,
              mailgunEmailId: mailData.id,
            },
          });
        }
      }

      MailData = await db.mailgunEmail.findFirst({
        where: {
          id: mailData.id,
        },
        include: {
          attachments: true,
        },
      });
    }

    // Clean up temporary files
    for (const filePath of filePaths) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Trigger automation pipeline
    try {
      if (client?.Lead?.id && client?.Lead?.columnId) {
        await updatePipelineAutomationTrigger({
          companyId: client.companyId,
          condition: "MESSAGE_SENT_CLIENT",
          leadId: client?.Lead.id,
          columnId: client?.Lead?.columnId,
        });
      }
    } catch (error) {
      console.error("Pipeline automation trigger failed:", error);
    }

    return NextResponse.json({ success: true, data: MailData });
  } catch (error: unknown) {
    console.error("Error sending email:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: errorMessage });
  }
}
