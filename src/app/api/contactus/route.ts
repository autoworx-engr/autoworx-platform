import { sendMail } from "@/lib/mailgun";
import { NextResponse } from "next/server";

/**
 * @swagger
 * /api/contactus:
 *   post:
 *     summary: Send contact email
 *     tags: [Contact]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               to:
 *                 type: string
 *               subject:
 *                 type: string
 *               text:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email sent successfully
 *       400:
 *         description: Missing required fields
 *       500:
 *         description: Failed to send email
 */
export async function POST(req: Request) {
  const { to, subject, text } = await req.json();

  if (!to || !subject || !text) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  try {
    await sendMail({ to, subject, text });
    return NextResponse.json({ message: "Email sent successfully" });
  } catch (error) {
    console.error("Error sending email as request demo:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 },
    );
  }
}
