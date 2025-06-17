import { db } from "@/lib/db";

type TSendNotificationByEmail = {
  userEmail: string;
  userName?: string;
  companyId: number;
  subject?: string;
  description: string;
};

export default async function sendNotificationByEmail({
  userEmail,
  companyId,
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

    const template = `📌 ${description}`;
    // Prepare form data for sending the email
    const form = new FormData();
    form.append("from", `${name} <${email}>`);
    form.append("to", userEmail);
    form.append("subject", "Notification from Autoworx");
    form.append("text", template);
    form.append("h:Reply-To", `${companyId}@${process.env.MAILGUN_DOMAIN}`);

    // Send the email via Mailgun API
    const sendMail = await fetch(
      `https://api.mailgun.net/v3/${process.env.MAILGUN_DOMAIN}/messages`,
      {
        method: "POST",
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(
              `${process.env.MAILGUN_USERNAME}:${process.env.MAILGUN_API_KEY}`,
            ).toString("base64"),
        },
        body: form,
      },
    );
    const response: any = await sendMail.json();

    if (sendMail.status !== 200) {
      throw new Error("Failed to send email");
    }
    return {
      success: true,
      id: response.id,
    };
  } catch (err) {
    throw err;
  }
}
