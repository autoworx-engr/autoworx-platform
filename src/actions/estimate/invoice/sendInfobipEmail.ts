"use server";
import { updatePipelineAutomationTrigger } from "@/actions/automation/pipeline/triggerPipelineAutomation";
import { updateNewEmailChatTrack } from "@/actions/communication/client/chat-track";
import { db } from "@/lib/db";

// Infobip Email API configuration
const INFOBIP_BASE_URL = process.env.INFOBIP_BASE_URL;

const INFOBIP_API_KEY = process.env.INFOBIP_API_KEY!;

interface InfobipEmailRequest {
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

async function sendInfobipEmailAPI(
  emailData: InfobipEmailRequest
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
          attachment.contentType
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
}: {
  clientId: number;
  subject: string;
  text: string;
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

    const emailHtml = emailText.replace(/\n/g, "<br>");

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
        `Email failed: ${message.status.name} - ${message.status.description}`
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

    updateNewEmailChatTrack({
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
