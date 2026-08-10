import { db } from "@/lib/db";
import { generatePasswordResetEmailHtml } from "@/lib/emails-template/password-reset";
import { createRateLimiter, extractClientIp } from "@/lib/rateLimit";
import { generateOTP, hashOTP } from "@/utils/otp";
import { randomUUID } from "crypto";
import { addMinutes } from "date-fns";
import { NextRequest, NextResponse } from "next/server";

// 5 send attempts per IP per 15 minutes
const ipLimiter = createRateLimiter({ windowMs: 15 * 60_000, maxRequests: 5 });
// 3 send attempts per email per 15 minutes
const emailLimiter = createRateLimiter({
  windowMs: 15 * 60_000,
  maxRequests: 3,
});

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

export async function POST(req: NextRequest) {
  const ip = extractClientIp(
    req.headers.get("x-forwarded-for"),
    req.headers.get("x-real-ip"),
  );

  const ipCheck = ipLimiter.check(ip);
  if (!ipCheck.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(ipCheck.retryAfterMs / 1000)),
        },
      },
    );
  }

  const body = await req.json();
  const rawEmail = body.email;
  const email =
    typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";

  if (!email)
    return NextResponse.json({ error: "Email is required" }, { status: 400 });

  const emailCheck = emailLimiter.check(email);
  if (!emailCheck.allowed) {
    return NextResponse.json(
      { error: "Too many requests for this email. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(emailCheck.retryAfterMs / 1000)),
        },
      },
    );
  }
  // ──────────────────────────────────────────────────────────────────────────

  const user = await db.user.findUnique({ where: { email } });
  if (!user)
    return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Generate a cryptographically secure OTP and hash it before storing.
  const token = randomUUID();
  const otpPlain = generateOTP(); // replaces insecure Math.random()
  const otpHash = await hashOTP(otpPlain); // bcrypt hash — never store plain text
  const expiresAt = addMinutes(new Date(), 15); // OTP valid for 15 minutes

  // Atomically replace any existing token with the new one
  await db.$transaction([
    db.passwordResetToken.deleteMany({ where: { userId: user.id } }),
    db.passwordResetToken.create({
      data: { token, otp: otpHash, userId: user.id, expiresAt },
    }),
  ]);

  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;

  // Get user's company for email configuration
  const company = await db.company.findFirst({
    where: { id: user.companyId },
  });

  const companyName = company?.name ?? "AutoWorx";
  const fromEmail = `${companyName} <mail@${process.env.INFOBIP_DOMAIN}>`;
  // Pass the plain-text OTP to the email template so the user sees it.
  const htmlBody = generatePasswordResetEmailHtml(
    resetUrl,
    otpPlain,
    companyName,
  );

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
