import { db } from "@/lib/db";
import { randomUUID } from "crypto";
import { addMinutes } from "date-fns";
import { NextResponse } from "next/server";

// Infobip Email API configuration
const INFOBIP_BASE_URL = process.env.INFOBIP_BASE_URL;
const INFOBIP_API_KEY = process.env.INFOBIP_API_KEY!;

interface InfobipEmailRequest {
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
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
  emailData: InfobipEmailRequest,
): Promise<InfobipEmailResponse> {
  try {
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

    const response = await fetch(`https://${INFOBIP_BASE_URL}/email/3/send`, {
      method: "POST",
      headers: {
        Authorization: `App ${INFOBIP_API_KEY}`,
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

function generatePasswordResetEmailHtml(
  resetUrl: string,
  otp: string,
  companyName: string,
): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const logoUrl = `${appUrl}/icons/autoworx-logo.png`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset Your Password</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f7fb;font-family:'Figtree',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7fb;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(90deg,#26AADF 0%,#03A7A2 100%);padding:36px 40px;text-align:center;">
              <img src="${logoUrl}" alt="${companyName}" height="40" style="display:inline-block;vertical-align:middle;" />
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:48px 40px 32px;">
              <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#1a2235;letter-spacing:-0.3px;">Reset your password</h1>
              <p style="margin:0 0 28px;font-size:15px;color:#66738c;line-height:1.6;">
                We received a request to reset the password for your <strong>${companyName}</strong> account.
                Click the button below or use the one-time code to proceed.
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td style="border-radius:8px;background:linear-gradient(90deg,#26AADF 0%,#03A7A2 100%);">
                    <a href="${resetUrl}" target="_blank"
                      style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;letter-spacing:0.2px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="border-top:1px solid #eef0f5;"></td>
                  <td style="padding:0 16px;white-space:nowrap;font-size:13px;color:#a0aab8;">or use one-time code</td>
                  <td style="border-top:1px solid #eef0f5;"></td>
                </tr>
              </table>

              <!-- OTP Block -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td align="center" style="background:#f4f7fb;border-radius:12px;padding:24px;">
                    <p style="margin:0 0 8px;font-size:13px;color:#66738c;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Your OTP Code</p>
                    <p style="margin:0;font-size:36px;font-weight:700;color:#1a2235;letter-spacing:8px;">${otp}</p>
                    <p style="margin:8px 0 0;font-size:12px;color:#a0aab8;">Valid for 15 minutes</p>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;color:#a0aab8;line-height:1.6;">
                If you didn&rsquo;t request a password reset, you can safely ignore this email.
                Your password will remain unchanged.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #eef0f5;padding:24px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#a0aab8;line-height:1.6;">
                &copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.<br/>
                This email was sent to you because a password reset was requested for your account.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request a password reset via email or OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: Password reset instructions sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Password reset instructions sent
 *       400:
 *         description: Bad Request - Missing email
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Email is required
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: User not found
 *       500:
 *         description: Failed to send password reset email
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Failed to send password reset email
 */

export async function POST(req: Request) {
  const { email } = await req.json();
  if (!email)
    return NextResponse.json({ error: "Email is required" }, { status: 400 });

  const user = await db.user.findUnique({ where: { email } });
  if (!user)
    return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Generate new token and OTP
  const token = randomUUID();
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = addMinutes(new Date(), 15); // OTP valid for 15 minutes

  // Atomically replace any existing token with the new one
  await db.$transaction([
    db.passwordResetToken.deleteMany({ where: { userId: user.id } }),
    db.passwordResetToken.create({
      data: { token, otp, userId: user.id, expiresAt },
    }),
  ]);

  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;

  // Get user's company for email configuration
  const company = await db.company.findFirst({
    where: { id: user.companyId },
  });

  const companyName = company?.name ?? "AutoWorx";
  const fromEmail = `${companyName} <mail@${process.env.INFOBIP_DOMAIN}>`;
  const htmlBody = generatePasswordResetEmailHtml(resetUrl, otp, companyName);

  // Send the email with the reset instructions using Infobip
  try {
    const infobipEmailData: InfobipEmailRequest = {
      from: fromEmail,
      to: user.email,
      subject: "Reset your password",
      html: htmlBody,
      trackClicks: true,
      trackOpens: true,
    };

    const response = await sendInfobipEmailAPI(infobipEmailData);

    // Check if email was sent successfully
    if (!response.messages || response.messages.length === 0) {
      throw new Error("No messages in Infobip response");
    }

    const message = response.messages[0];
    if (message.status.groupId !== 1) {
      throw new Error(
        `Email failed: ${message.status.name} - ${message.status.description}`,
      );
    }
  } catch (error) {
    console.error("Failed to send password reset email:", error);
    return NextResponse.json(
      { error: "Failed to send password reset email" },
      { status: 500 },
    );
  }

  return NextResponse.json({ message: "Password reset instructions sent" });
}
