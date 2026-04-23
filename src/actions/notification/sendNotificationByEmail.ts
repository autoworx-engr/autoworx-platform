"use server";
import { db } from "@/lib/db";

type TSendNotificationByEmail = {
  userEmail: string;
  userName?: string;
  companyId: number;
  subject?: string;
  description: string;
};

// Add Infobip types and config
type InfobipEmailRequest = {
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
  trackClicks?: boolean;
  trackOpens?: boolean;
  attachments?: Array<{
    content: Blob | File;
    name: string;
    contentType: string;
  }>;
};

type InfobipEmailResponse = {
  messages: Array<{
    to: string;
    messageId: string;
    status: {
      groupId: number;
      groupName: string;
      id: number;
      name: string;
      description: string;
    };
  }>;
};

const INFOBIP_BASE_URL = process.env.INFOBIP_BASE_URL || "api.infobip.com";
const INFOBIP_API_KEY = process.env.INFOBIP_API_KEY;

async function sendInfobipEmailAPI(
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
    console.log("🚀 ~ sendInfobipEmailAPI ~ error:", error);
    console.error("sendInfobipEmailAPI error:", error);
    throw error;
  }
}

export default async function sendNotificationByEmail({
  userEmail,
  companyId,
  subject,
  description,
}: TSendNotificationByEmail) {
  try {
    const company = await db.company.findFirst({
      where: { id: companyId },
      select: {
        name: true,
        email: true,
      },
    });

    const { name, email } = company || {};

    if (!name || !email) {
      throw new Error("Company information not found");
    }

    const template = `📌 ${description}`;

    // Prepare email data for Infobip
    const emailData: InfobipEmailRequest = {
      from: `${name} <mail@${process.env.INFOBIP_DOMAIN}>`,
      to: userEmail,
      subject: subject || "Notification from Autoworx",
      text: template,
      replyTo: `${companyId}@${process.env.INFOBIP_DOMAIN || process.env.MAILGUN_DOMAIN}`, // fallback to MAILGUN_DOMAIN if INFOBIP_DOMAIN not set
      trackClicks: true,
      trackOpens: true,
    };

    // Send the email via Infobip API
    const response = await sendInfobipEmailAPI(emailData);

    // Check if email was sent successfully
    if (response.messages && response.messages.length > 0) {
      const message = response.messages[0];
      if (message.status.groupId === 1) {
        // Group 1 typically means success in Infobip
        return {
          success: true,
          id: message.messageId,
        };
      } else {
        throw new Error(
          `Email failed with status: ${message.status.description}`,
        );
      }
    } else {
      throw new Error("No response messages received from Infobip");
    }
  } catch (err) {
    console.log("🚀 ~ sendNotificationByEmail error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error occurred",
    };
  }
}
