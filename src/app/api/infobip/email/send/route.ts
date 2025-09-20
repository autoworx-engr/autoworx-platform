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

// Helper: Web Stream -> Node Readable
function webStreamToNodeStream(
  webStream: ReadableStream<Uint8Array>
): Readable {
  const reader = webStream.getReader();
  return new Readable({
    async read() {
      const { done, value } = await reader.read();
      if (done) this.push(null);
      else this.push(Buffer.from(value));
    },
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Parse form
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    const recipient = formData.get("recipient") as string | null;
    const text = (formData.get("text") as string | null) ?? "";

    if (!recipient) throw new Error("Recipient not provided");

    // Get client + lead context
    const client = await db.client.findFirst({
      where: { id: parseInt(recipient) },
      include: { Lead: { select: { id: true, columnId: true } } },
    });
    if (!client) throw new Error("Client not found");

    // Company (sender) context
    const company = await db.company.findFirst({
      where: { id: client.companyId },
    });
    if (!company) throw new Error("No company found");
    if (!company.email) throw new Error("No Company Email Provided"); // must be a verified Infobip sender

    // Previous email (for threading headers)
    const lastEmail = await db.mailgunEmail.findFirst({
      where: { clientId: parseInt(recipient), companyId: company.id },
      orderBy: { createdAt: "desc" },
    });

    // Build Infobip multipart form
    const form = new FormData();
    // "from" should be a verified sender address in Infobip (display name allowed)
    form.append("from", `${company.name} <mail@${process.env.INFOBIP_DOMAIN}>`);
    form.append("to", client.email!);
    form.append("subject", `New message from ${company.name}`);
    // Plain-text body + your own unsubscribe footer (Infobip also supports built-in tracking/unsubscribe)
    form.append("text", `${text}`);

    // Prefer reply-to as the company email (or set your own routing address)
    form.append(
      "replyTo",
      `${company?.id}@ib79097.${process.env.INFOBIP_DOMAIN}`
    );

    // Add custom headers as JSON via "headers" (Infobip v3)
    const customHeaders: Record<string, string | string[]> = {
      "List-Unsubscribe": `<mailto:unsubscribe@ib79097.${process.env.INFOBIP_DOMAIN}?subject=unsubscribe>, <${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe>`,
    };
    if (lastEmail?.messageId) {
      customHeaders["In-Reply-To"] = lastEmail.messageId;
      customHeaders["References"] = lastEmail.messageId;
    }
    form.append("headers", JSON.stringify(customHeaders));

    // Handle file attachments (same as before)
    const filePaths: string[] = [];
    const attachments: File[] = [];

    // ✅ use OS tmp dir instead of process.cwd()
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
        await new Promise((r) => setTimeout(r, 100)); // ensure flush

        filePaths.push(filePath);
        // Read file as buffer and create Blob for FormData
        const fileBuffer = fs.readFileSync(filePath);
        const fileBlob = new Blob([fileBuffer]);
        form.append("attachment", fileBlob, file.name);
      }
    }

    // --- Send via Infobip Email API v3 ---
    const baseUrl = process.env.INFOBIP_BASE_URL; // e.g. "rr7w1k.api.infobip.com" or "<region>.api.infobip.com"
    const apiKey = process.env.INFOBIP_API_KEY; // API key with Email send scopes
    if (!baseUrl || !apiKey)
      throw new Error("Infobip credentials not configured");

    const sendRes = await fetch(`https://${baseUrl}/email/3/send`, {
      method: "POST",
      headers: {
        // Accept JSON explicitly when sending multipart/form-data
        Accept: "application/json",
        Authorization: `App ${apiKey}`,
        // NOTE: DO NOT set Content-Type; FormData sets boundary automatically.
      },
      body: form,
    });

    const json: any = await sendRes.json();
    if (!sendRes.ok) {
      throw new Error(
        `Infobip send failed (${sendRes.status}): ${JSON.stringify(json)}`
      );
    }

    // Infobip returns: { messages: [{ messageId, status, to, ... }] }
    const messageId: string | undefined = json?.messages?.[0]?.messageId;

    // Record in DB (reuse your existing tables for now)
    let mailData: any;
    let MailData: any;
    if (messageId) {
      mailData = await db.mailgunEmail.create({
        data: {
          subject: company.name || "Autoworx",
          text,
          emailBy: "Company",
          companyId: company.id,
          clientId: parseInt(recipient),
          messageId, // store Infobip's messageId
        },
      });

      // Upload & persist attachment URLs (same as before)
      const processedAttachments = [];
      for (const file of attachments) {
        console.log("🚀 ~ POST ~ file:", file);
        const fd2 = new FormData();
        fd2.append("file", file as any);
        const uploadRes = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL}/api/upload`,
          { method: "POST", body: fd2 }
        );
        if (!uploadRes.ok) {
          console.error("Failed to upload photos");
          continue;
        }
        const upJson = (await uploadRes.json()) as { data?: string[] };
        console.log("🚀 ~ POST ~ upJson:", upJson);
        if (file && upJson?.data?.length && upJson.data.length > 0) {
          const attachment = await db.mailgunEmailAttachment.create({
            data: {
              name: file.name,
              url: upJson.data[0],
              size: file.size,
              mailgunEmailId: mailData.id,
            },
          });
          processedAttachments.push({
            name: file.name,
            url: upJson.data[0],
            size: file.size,
          });
        }
      }

      await updateNewEmailChatTrack({
        clientId: parseInt(recipient),
        emailLastMessage: text,
        lastEmailBy: "Company",
        attachments: processedAttachments,
      });

      MailData = await db.mailgunEmail.findFirst({
        where: { id: mailData.id },
        include: { attachments: true },
      });
    }

    // Cleanup temp files
    for (const fp of filePaths) {
      try {
        if (fs.existsSync(fp)) fs.unlinkSync(fp);
      } catch {}
    }

    // Trigger pipeline automations
    try {
      if (client?.Lead?.id && client?.Lead?.columnId) {
        updatePipelineAutomationTrigger({
          companyId: client.companyId,
          condition: "MESSAGE_SENT_CLIENT",
          leadId: client.Lead.id,
          columnId: client.Lead.columnId,
        });
      }
    } catch {}

    return NextResponse.json({ success: true, data: MailData });
  } catch (error: unknown) {
    console.error("Error sending email:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
