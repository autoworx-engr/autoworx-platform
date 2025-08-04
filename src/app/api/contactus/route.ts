import { sendMail } from "@/lib/mailgun";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { to, subject, text } = await req.json();

  if (!to || !subject || !text) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    await sendMail({ to, subject, text });
    return NextResponse.json({ message: "Email sent successfully" });
  } catch (error) {
    console.error("Error sending email as request demo:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}