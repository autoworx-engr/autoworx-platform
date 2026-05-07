import { db } from "@/lib/db";
import { generatePasswordResetEmailHtml } from "@/lib/emails-template/password-reset";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

const INFOBIP_BASE_URL = process.env.INFOBIP_BASE_URL;
const INFOBIP_API_KEY = process.env.INFOBIP_API_KEY;

async function sendViaInfobip(params: {
  from: string;
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const formData = new FormData();
  formData.append("from", params.from);
  formData.append("to", params.to);
  formData.append("subject", params.subject);
  formData.append("html", params.html);
  formData.append("trackClicks", "true");
  formData.append("trackOpens", "true");

  const response = await fetch(`https://${INFOBIP_BASE_URL}/email/3/send`, {
    method: "POST",
    headers: { Authorization: `App ${INFOBIP_API_KEY}` },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Infobip error ${response.status}: ${errorText}`);
  }

  const result = (await response.json()) as {
    messages?: Array<{ status: { groupId: number; name: string; description: string } }>;
  };

  const message = result.messages?.[0];
  if (!message || message.status.groupId !== 1) {
    throw new Error(
      message
        ? `Email failed: ${message.status.name}`
        : "No messages in Infobip response",
    );
  }
}

export async function POST(req: Request) {
  const { email } = await req.json();
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const token = randomUUID();
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await db.$transaction([
    db.passwordResetToken.deleteMany({ where: { userId: user.id } }),
    db.passwordResetToken.create({
      data: { token, otp, userId: user.id, expiresAt },
    }),
  ]);

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "";
  const resetUrl = `${baseUrl.replace(/\/$/, "")}/reset-password?token=${token}`;

  const company = await db.company.findFirst({
    where: { id: user.companyId },
  });
  const companyName = company?.name ?? "CRM";
  const htmlBody = generatePasswordResetEmailHtml(resetUrl, otp, companyName);

  const infobipConfigured = Boolean(INFOBIP_BASE_URL && INFOBIP_API_KEY);
  if (infobipConfigured) {
    try {
      const domain = process.env.INFOBIP_DOMAIN || "example.com";
      await sendViaInfobip({
        from: `${companyName} <noreply@${domain}>`,
        to: user.email,
        subject: "Reset your password",
        html: htmlBody,
      });
    } catch (error) {
      console.error("Password reset email failed:", error);
      return NextResponse.json(
        { error: "Failed to send password reset email" },
        { status: 500 },
      );
    }
  } else {
    console.warn(
      "[auth] Infobip not configured. Reset link (dev):",
      resetUrl,
      "OTP:",
      otp,
    );
  }

  return NextResponse.json({
    message: infobipConfigured
      ? "Password reset instructions sent"
      : "If email is configured, instructions were sent; otherwise check server logs for the reset link (development).",
  });
}
