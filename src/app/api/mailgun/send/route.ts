import { updatePipelineAutomationTrigger } from "@/actions/automation/pipeline/triggerPipelineAutomation";
import { updateNewEmailChatTrack } from "@/actions/communication/client/chat-track";
import { db } from "@/lib/db";
import fs from "fs";
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { pipeline, Readable } from "stream";
import { promisify } from "util";
import os from "os";

const pump = promisify(pipeline);

/**
 * @swagger
 * /api/mailgun/send:
 *   post:
 *     summary: Send email via Mailgun
 *     tags: [Mailgun]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               recipient:
 *                 type: string
 *               text:
 *                 type: string
 *               files:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Email sent successfully
 *       400:
 *         description: Recipient not provided
 *       500:
 *         description: Server error
 */
// Helper function to convert Web Stream to Node.js Readable stream
function webStreamToNodeStream(
  webStream: ReadableStream<Uint8Array>,
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
        { status: 400 },
      );
    }

    // Fetch company ID and Mailgun credentials
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

    // Prepare form data for sending the email
    const form = new FormData();
    form.append(
      "from",
      `${company?.name} <${company?.id}@${process.env.MAILGUN_DOMAIN}>`,
    );
    form.append("to", client.email!);
    form.append("subject", `New message from ${company?.name}`);
    form.append(
      "text",
      `${text}

    -------------------------
    To unsubscribe, click here: ${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe?email=${encodeURIComponent(client.email!)}`,
    );
    form.append("h:Reply-To", `${company?.id}@${process.env.MAILGUN_DOMAIN}`);

    form.append(
      "h:List-Unsubscribe",
      `<mailto:unsubscribe@${process.env.MAILGUN_DOMAIN}?subject=unsubscribe>, <${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe>`,
    );

    // Add In-Reply-To and References headers if this is a reply
    if (lastEmail?.messageId) {
      form.append("h:In-Reply-To", lastEmail.messageId);
      form.append("h:References", lastEmail.messageId);
    }

    // Add DKIM and SPF indicators
    form.append("o:dkim", "yes");
    form.append("o:tag", "outbound");

    // Add tracking parameters
    form.append("o:tracking", "yes");
    form.append("o:tracking-clicks", "yes");
    form.append("o:tracking-opens", "yes");

    // Handle multiple files
    const filePaths: string[] = [];
    const attachments = [];
    // ✅ always use OS tmp dir for writable storage in serverless
    const uploadDir = path.join(os.tmpdir(), "uploads");

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
        // Read file as buffer and create Blob for FormData
        const fileBuffer = fs.readFileSync(filePath);
        const fileBlob = new Blob([fileBuffer]);
        form.append("attachment", fileBlob, file.name);
      }
    }

    // Send the email via Mailgun API
    const sendMail = await fetch(
      `https://api.mailgun.net/v3/${process.env.MAILGUN_DOMAIN}/messages`,
      {
        method: "POST",
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(
              `${process.env.MAILGUN_USERNAME}:${process.env.MAILGUN_API_KEY}`,
            ).toString("base64"),
        },
        body: form,
      },
    );

    const response: any = await sendMail.json();
    let mailData;
    let MailData;
    if (response?.id) {
      mailData = await db.mailgunEmail.create({
        data: {
          subject: company?.name || "Autoworx",
          text: text || "",
          emailBy: "Company",
          companyId: company.id,
          clientId: parseInt(recipient),
          messageId: response.id,
        },
      });
      await updateNewEmailChatTrack({
        clientId: parseInt(recipient),
        emailLastMessage: text || "",
        lastEmailBy: "Company",
      });
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
    // // trigger automation communication
    // try {
    //   if (client?.Lead?.id && client?.Lead?.columnId) {
    //     await updateCommunicationAutomationTrigger({
    //       companyId: client.companyId,
    //       leadId: client?.Lead.id,
    //       columnId: client?.Lead?.columnId,
    //     });
    //   }
    // } catch (error) {}

    return NextResponse.json({ success: true, data: MailData });
  } catch (error: unknown) {
    console.error("Error sending email:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: errorMessage });
  }
}
