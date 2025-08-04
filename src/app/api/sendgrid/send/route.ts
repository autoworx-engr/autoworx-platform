import { updatePipelineAutomationTrigger } from "@/actions/automation/pipeline/triggerPipelineAutomation";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import sgMail from "@sendgrid/mail";
import { pipeline, Readable } from "stream";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { updateNewEmailChatTrack } from "@/actions/communication/client/chat-track";
const pump = promisify(pipeline);

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_KEY!);

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

    if (!recipient) {
      return NextResponse.json(
        { success: false, error: "Missing required form data" },
        { status: 400 }
      );
    }

    // Fetch company ID and email credentials
    const company = await db.company.findFirst({
      where: { id: client.companyId },
    });

    if (!company) throw new Error("No company found");
    if (!company?.email) throw new Error("No Company Email Provided");

    // Get last email for threading (if using custom email storage)
    const lastEmail = await db.mailgunEmail.findFirst({
      where: {
        clientId: parseInt(recipient),
        companyId: company.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Handle multiple files and prepare attachments
    const filePaths: string[] = [];
    const attachments = [];
    const uploadDir = path.join(__dirname, "public/uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    if (files && files.length > 0) {
      for (const file of files) {
        attachments.push(file);
        const nodeStream = webStreamToNodeStream(file.stream());
        const filePath = path.join(uploadDir, file.name);

        await pump(nodeStream, fs.createWriteStream(filePath));
        await new Promise((resolve) => setTimeout(resolve, 100)); // Ensure write completion

        filePaths.push(filePath);
      }
    }

    // Prepare SendGrid attachments
    const sendGridAttachments = [];
    for (let i = 0; i < filePaths.length; i++) {
      const filePath = filePaths[i];
      const file = files[i];
      const fileContent = fs.readFileSync(filePath);

      sendGridAttachments.push({
        content: fileContent.toString("base64"),
        filename: file.name,
        type: file.type || "application/octet-stream",
        disposition: "attachment",
      });
    }

    // Prepare email content with unsubscribe link
    const emailText = `${text}`;

    //     -------------------------
    // To unsubscribe, click here: ${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe?email=${encodeURIComponent(client.email!)}`

    // Prepare SendGrid email object
    const msg: sgMail.MailDataRequired = {
      to: client.email!,
      from: `mail@${process.env.MAILGUN_DOMAIN}`,
      subject: `${company.name}`,
      text: emailText,
      html: emailText.replace(/\n/g, "<br>"), // Convert newlines to HTML breaks
      replyTo: `${company.id}@${process.env.MAILGUN_DOMAIN}`,
      attachments:
        sendGridAttachments.length > 0 ? sendGridAttachments : undefined,
      // mailSettings: {
      //   sandboxMode: {
      //     enable: process.env.NODE_ENV === "development", // Enable sandbox mode in development
      //   },
      // },
      // trackingSettings: {
      //   clickTracking: {
      //     enable: true,
      //   },
      //   openTracking: {
      //     enable: true,
      //   },
      // },
      // asm: {
      //   groupId: parseInt(process.env.SENDGRID_UNSUBSCRIBE_GROUP_ID || "1"), // You'll need to create an unsubscribe group in SendGrid
      //   groupsToDisplay: [
      //     parseInt(process.env.SENDGRID_UNSUBSCRIBE_GROUP_ID || "1"),
      //   ],
      // },
    };

    // Add custom headers for email threading if previous email exists
    if (lastEmail?.messageId) {
      msg.headers = {
        "In-Reply-To": lastEmail.messageId,
        References: lastEmail.messageId,
      };
    }

    // Send the email via SendGrid API
    const response = await sgMail.send(msg);

    // SendGrid returns an array, get the first response
    const sendGridResponse = response[0];
    const messageId =
      sendGridResponse.headers["x-message-id"] ||
      `${Date.now()}-${Math.random()}`;

    let mailData;
    let MailData;

    if (
      sendGridResponse.statusCode >= 200 &&
      sendGridResponse.statusCode < 300
    ) {
      // Store email in database (update table name from mailgunEmail to sendgridEmail)
      mailData = await db.mailgunEmail.create({
        data: {
          subject: `New message from ${company.name}`,
          text: text || "",
          emailBy: "Company",
          companyId: company.id,
          clientId: parseInt(recipient),
          messageId: messageId,
        },
      });

      await updateNewEmailChatTrack({
        clientId: parseInt(recipient),
        emailLastMessage: text || "",
        lastMessageBy: "Company",
      });

      // Handle file attachments upload and storage
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
        }

        const json = await uploadRes.json();
        if (file && json?.data?.length > 0) {
          await db.mailgunEmailAttachment.create({
            data: {
              name: file.name,
              url: json.data[0],
              size: file.size,
              mailgunEmailId: mailData.id, // Updated field name
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

    // Clean up the files after sending
    for (const filePath of filePaths) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // trigger automation pipeline
    try {
      if (client?.Lead?.id && client?.Lead?.columnId) {
        await updatePipelineAutomationTrigger({
          companyId: client.companyId,
          condition: "MESSAGE_SENT_CLIENT",
          leadId: client?.Lead.id,
          columnId: client?.Lead?.columnId,
        });
      }
    } catch (error) {}

    return NextResponse.json({ success: true, data: MailData });
  } catch (error: unknown) {
    console.error("Error sending email:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: errorMessage });
  }
}
