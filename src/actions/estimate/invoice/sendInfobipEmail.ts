"use server";
import { updatePipelineAutomationTrigger } from "@/actions/automation/pipeline/triggerPipelineAutomation";
import { updateNewEmailChatTrack } from "@/actions/communication/client/chat-track";
import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";

// Infobip Email API configuration
const INFOBIP_BASE_URL = process.env.INFOBIP_BASE_URL;

const INFOBIP_API_KEY = process.env.INFOBIP_API_KEY!;

export interface InfobipEmailRequest {
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  messageId?: string;
  templateId?: number;
  templateData?: Record<string, any>;
  attachments?: Array<{
    name: string;
    content: string; // base64 encoded
    contentType: string;
  }>;
  trackClicks?: boolean;
  trackOpens?: boolean;
  replyTo?: string;
}

interface InfobipEmailResponse {
  bulkId: string;
  messages: Array<{
    to: string;
    status: {
      groupId: number;
      groupName: string;
      id: number;
      name: string;
      description: string;
    };
    messageId: string;
  }>;
}

export async function sendInfobipEmailAPI(
  emailData: InfobipEmailRequest,
): Promise<InfobipEmailResponse> {
  try {
    // Create FormData instead of JSON
    const formData = new FormData();
    formData.append("from", emailData.from);
    formData.append("to", emailData.to);
    formData.append("subject", emailData.subject);

    if (emailData.text) {
      formData.append("text", emailData.text);
    }

    if (emailData.html) {
      formData.append("html", emailData.html);
    }

    if (emailData.replyTo) {
      formData.append("replyTo", emailData.replyTo);
    }

    if (emailData.trackClicks) {
      formData.append("trackClicks", "true");
    }

    if (emailData.trackOpens) {
      formData.append("trackOpens", "true");
    }

    if (emailData.attachments) {
      emailData.attachments.forEach((attachment, index) => {
        formData.append(`attachment[${index}]`, attachment.content);
        formData.append(`attachmentName[${index}]`, attachment.name);
        formData.append(
          `attachmentContentType[${index}]`,
          attachment.contentType,
        );
      });
    }

    const response = await fetch(`https://${INFOBIP_BASE_URL}/email/3/send`, {
      method: "POST",
      headers: {
        Authorization: `App ${INFOBIP_API_KEY}`,
        // Don't set Content-Type - let browser set it with boundary for FormData
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Infobip API Error:", errorText);
      throw new Error(`Infobip API Error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("sendInfobipEmailAPI error:", error);
    throw error;
  }
}

export async function sendInfobipEmail({
  clientId,
  subject,
  text,
  html,
}: {
  clientId: number;
  subject: string;
  text: string;
  html?: string;
}) {
  try {
    const client = await db.client.findFirst({
      where: { id: clientId },
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
    if (!client?.email) {
      throw new Error("Client email not found");
    }

    // Fetch company ID and email credentials
    const company = await db.company.findFirst({
      where: { id: client.companyId },
    });

    if (!company) throw new Error("No company found");
    // if (!company?.email) throw new Error("No Company Email Found");

    // Prepare email content with unsubscribe link
    const emailText = `${text}`;

    const emailHtml = html || emailText.replace(/\n/g, "<br>");

    // Prepare Infobip email request
    const infobipEmailData: InfobipEmailRequest = {
      from: `${company.name} <mail@${process.env.INFOBIP_DOMAIN}>`,
      to: client.email,
      subject: subject,
      text: emailText,
      html: emailHtml,
      replyTo: `${company?.id}@ib79097.${process.env.INFOBIP_DOMAIN}`,
      trackClicks: true,
      trackOpens: true,
    };

    // Send the email via Infobip API
    const response = await sendInfobipEmailAPI(infobipEmailData);

    // Check if email was sent successfully
    if (!response.messages || response.messages.length === 0) {
      throw new Error("No messages in Infobip response");
    }

    const message = response.messages[0];
    if (message.status.groupId !== 1) {
      // Group 1 is typically "PENDING" or "ACCEPTED"
      throw new Error(
        `Email failed: ${message.status.name} - ${message.status.description}`,
      );
    }

    // Store email in database
    await db.mailgunEmail.create({
      data: {
        subject: subject,
        text: text,
        emailBy: "Company",
        companyId: company.id,
        clientId: clientId,
        messageId: message.messageId,
      },
    });

    await updateNewEmailChatTrack({
      clientId,
      emailLastMessage: text || "",
      lastEmailBy: "Company",
      attachments: [], // Estimate/invoice emails typically don't have attachments
    });

    // trigger automation pipeline
    try {
      if (client?.Lead?.id && client?.Lead?.columnId) {
        updatePipelineAutomationTrigger({
          companyId: client.companyId,
          condition: "MESSAGE_SENT_CLIENT",
          leadId: client?.Lead.id,
          columnId: client?.Lead?.columnId,
        });
      }
    } catch (error) {
      console.error("Pipeline automation error:", error);
    }

    return {
      success: true,
      id: message.messageId,
    };
  } catch (error: any) {
    console.error("Infobip email error:", error);
    return {
      success: false,
      message: error.message || "Failed to send email",
    };
  }
}

/**
 * Send email with attachments from S3 URLs
 * Downloads files from URLs and attaches them to the email
 */
export async function sendInfobipEmailWithAttachments({
  clientId,
  subject,
  text,
  attachmentUrls,
}: {
  clientId: number;
  subject: string;
  text: string;
  attachmentUrls: Array<{ url: string; name: string }>;
}) {
  try {
    const client = await db.client.findFirst({
      where: { id: clientId },
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
    if (!client?.email) {
      throw new Error("Client email not found");
    }

    // Fetch company
    const company = await db.company.findFirst({
      where: { id: client.companyId },
    });

    if (!company) throw new Error("No company found");

    // Get last email for threading
    const lastEmail = await db.mailgunEmail.findFirst({
      where: { clientId: clientId, companyId: company.id },
      orderBy: { createdAt: "desc" },
    });

    // Build FormData directly (like route.ts approach)
    const form = new FormData();
    form.append("from", `${company.name} <mail@${process.env.INFOBIP_DOMAIN}>`);
    form.append("to", client.email);
    form.append("subject", subject);
    form.append("text", text);
    form.append("html", text.replace(/\n/g, "<br>"));
    form.append(
      "replyTo",
      `${company?.id}@ib79097.${process.env.INFOBIP_DOMAIN}`,
    );

    // Add custom headers for threading
    const customHeaders: Record<string, string | string[]> = {
      "List-Unsubscribe": `<mailto:unsubscribe@ib79097.${process.env.INFOBIP_DOMAIN}?subject=unsubscribe>, <${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe>`,
    };
    if (lastEmail?.messageId) {
      customHeaders["In-Reply-To"] = lastEmail.messageId;
      customHeaders["References"] = lastEmail.messageId;
    }
    form.append("headers", JSON.stringify(customHeaders));

    // Download and attach files from S3 URLs
    const processedAttachments = [];
    for (const attachment of attachmentUrls) {
      try {
        // Fetch file from S3 URL
        const fileResponse = await fetch(attachment.url);
        if (!fileResponse.ok) {
          console.error(`Failed to fetch attachment: ${attachment.url}`);
          continue;
        }

        // Get file as blob
        const fileBlob = await fileResponse.blob();

        // Append to FormData (Infobip accepts files via "attachment" field)
        form.append("attachment", fileBlob, attachment.name);

        // Track for database
        processedAttachments.push({
          name: attachment.name,
          url: attachment.url,
          size: fileBlob.size,
        });
      } catch (error) {
        console.error(`Error processing attachment ${attachment.name}:`, error);
      }
    }

    // Send via Infobip
    const baseUrl = process.env.INFOBIP_BASE_URL;
    const apiKey = process.env.INFOBIP_API_KEY;
    if (!baseUrl || !apiKey)
      throw new Error("Infobip credentials not configured");

    const sendRes = await fetch(`https://${baseUrl}/email/3/send`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `App ${apiKey}`,
        // NOTE: DO NOT set Content-Type; FormData sets boundary automatically.
      },
      body: form,
    });

    const json: any = await sendRes.json();
    if (!sendRes.ok) {
      throw new Error(
        `Infobip send failed (${sendRes.status}): ${JSON.stringify(json)}`,
      );
    }

    // Infobip returns: { messages: [{ messageId, status, to, ... }] }
    const messageId: string | undefined = json?.messages?.[0]?.messageId;

    if (!messageId) {
      throw new Error("No messageId in Infobip response");
    }

    // Store email in database
    const mailData = await db.mailgunEmail.create({
      data: {
        subject: subject,
        text: text,
        emailBy: "Company",
        companyId: company.id,
        clientId: clientId,
        messageId: messageId,
      },
    });

    // Store attachments in database
    for (const attachment of processedAttachments) {
      await db.mailgunEmailAttachment.create({
        data: {
          name: attachment.name,
          url: attachment.url,
          size: attachment.size,
          mailgunEmailId: mailData.id,
        },
      });
    }

    // Update chat track
    await updateNewEmailChatTrack({
      clientId,
      emailLastMessage: text || "",
      lastEmailBy: "Company",
      attachments: processedAttachments,
    });

    // Trigger automation pipeline
    try {
      if (client?.Lead?.id && client?.Lead?.columnId) {
        updatePipelineAutomationTrigger({
          companyId: client.companyId,
          condition: "MESSAGE_SENT_CLIENT",
          leadId: client.Lead.id,
          columnId: client.Lead.columnId,
        });
      }
    } catch (error) {
      console.error("Pipeline automation error:", error);
    }

    return {
      success: true,
      id: messageId,
      attachments: processedAttachments,
    };
  } catch (error: any) {
    console.error("Infobip email with attachments error:", error);
    return {
      success: false,
      message: error.message || "Failed to send email with attachments",
    };
  }
}
