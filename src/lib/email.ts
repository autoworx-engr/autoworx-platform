import { google } from "googleapis";
import "server-only";
import { getCompanyId } from "./companyId";
import { db } from "./db";

interface EmailProps {
  to: string;
  subject: string;
  text: string;
  html?: string;
  companyId?: number;
}

export async function sendEmail({ to, subject, text, html }: EmailProps) {
  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      throw new Error("No company ID found");
    }

    // Load OAuth2 credentials and token
    const oAuth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/communication/client/auth`,
    );

    const company = await db.company.findFirst({
      where: { id: companyId },
    });
    const refreshToken = company?.googleRefreshToken;
    if (!refreshToken) {
      throw new Error("Company not connected to Google");
    }

    // Set credentials (this assumes you already have a valid token)
    oAuth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    const gmail = google.gmail({ version: "v1", auth: oAuth2Client });

    // Create the email content
    const rawMessage = makeEmail({
      to,
      subject,
      text,
      html,
    });

    // Send the email using Gmail API
    const result = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: rawMessage,
      },
    });

    return { success: true, message: "Email sent successfully" };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
export async function sendEmailReminder({
  to,
  subject,
  text,
  html,
  companyId,
}: EmailProps) {
  try {
    if (!companyId) {
      throw new Error("No company ID found");
    }

    // Load OAuth2 credentials and token
    const oAuth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/communication/client/auth`,
    );

    const company = await db.company.findFirst({
      where: { id: companyId },
    });
    const refreshToken = company?.googleRefreshToken;
    if (!refreshToken) {
      throw new Error("Company not connected to Google");
    }

    // Set credentials (this assumes you already have a valid token)
    oAuth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    const gmail = google.gmail({ version: "v1", auth: oAuth2Client });

    // Create the email content
    const rawMessage = makeEmail({
      to,
      subject,
      text,
      html,
    });

    // Send the email using Gmail API
    const result = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: rawMessage,
      },
    });

    return { success: true, message: "Email sent successfully" };
  } catch (error: any) {
    console.log("Error sending email:", error);

    return { success: false, message: error.message };
  }
}

// Helper function to create the email content (with attachment if needed)
function makeEmail({ to, subject, text, html }: EmailProps) {
  let message = [
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    'Content-Type: multipart/mixed; boundary="boundary"',
    "",
    "--boundary",
    'Content-Type: text/plain; charset="UTF-8"',
    "",
    text,
  ];

  if (html) {
    message.push(
      "--boundary",
      'Content-Type: text/html; charset="UTF-8"',
      "",
      html,
    );
  }

  message.push("--boundary--");

  return Buffer.from(message.join("\n"))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
