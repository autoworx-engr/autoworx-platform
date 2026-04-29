import {
  InfobipEmailRequest,
  sendInfobipEmailAPI,
} from "../estimate/invoice/sendInfobipEmail";
import {
  getEmailVerificationTemplate,
  getOTPEmailTemplate,
} from "@/lib/emails-template/two-factor";

type TSendMailProps = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export async function sendMail({ to, subject, text, html }: TSendMailProps) {
  try {
    // Prepare Infobip email request
    const infobipEmailData: InfobipEmailRequest = {
      from: `AutoWorx <mail@${process.env.INFOBIP_DOMAIN}>`,
      to: to,
      subject: subject,
      text: text,
      html: html,
      trackClicks: true,
      trackOpens: true,
    };

    // Send the email via Infobip API
    await sendInfobipEmailAPI(infobipEmailData);

    return {
      success: true,
      message: "Verification Mail Sent Successfully",
    };
  } catch (error: any) {
    console.error("Infobip email error:", error);
    return {
      success: false,
      message: error.message || "Failed to send email",
    };
  }
}

interface SendOTPEmailParams {
  to: string;
  code: string;
  userName?: string;
}
export async function sendOTPEmail({
  to,
  code,
  userName = "User",
}: SendOTPEmailParams): Promise<boolean> {
  try {
    const mailOptions = {
      to,
      subject: "Your Two-Factor Authentication Code",
      html: getOTPEmailTemplate(code, userName),
      text: `Your verification code is: ${code}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this code, please ignore this email.`,
    };

    await sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error("Failed to send OTP email:", error);
    return false;
  }
}

export async function sendVerificationMail(to: string, url: string) {
  try {
    const mailOptions = {
      to,
      subject: "Verify your email",
      html: getEmailVerificationTemplate(url),
      text: `Verify Your Email Address\nThank you for registering with our service. Please click the link below to verify your email address:\n${url}\nThis link will expire in 1 hour.\nIf you did not create this account, please ignore this email.`,
    };

    await sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error("Failed to send email verification mail:", error);
    return false;
  }
}
