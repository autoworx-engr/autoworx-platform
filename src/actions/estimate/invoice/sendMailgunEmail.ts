import { db } from "@/lib/db";
import { updatePipelineAutomationTrigger } from "@/actions/automation/pipeline/triggerPipelineAutomation";

export async function sendMailgunEmail({
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

    // Fetch company ID and Mailgun credentials
    const company = await db.company.findFirst({
      where: { id: client.companyId },
    });

    if (!company) throw new Error("No company found");
    if (!company?.email) throw new Error("No Company Email Found");

    // Prepare form data for sending the email
    const form = new FormData();
    form.append(
      "from",
      `${company?.name} <${company?.id}@${process.env.MAILGUN_DOMAIN}>`,
    );
    form.append("to", client.email!);
    form.append("subject", subject);
    form.append(
      "text",
      `${text}

    -------------------------
    To unsubscribe, click here: ${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe?email=${encodeURIComponent(client.email!)}`,
    );

    form.append("h:Reply-To", `${company?.id}@${process.env.MAILGUN_DOMAIN}`);
    form.append(
      "h:List-Unsubscribe",
      `<mailto:unsubscribe@${process.env.MAILGUN_DOMAIN}?subject=unsubscribe>, <${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe>`,
    );

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

    // trigger automation pipeline
    try {
      if (client?.Lead?.id && client?.Lead?.columnId) {
        await updatePipelineAutomationTrigger({
          companyId: client.companyId,
          condition: "MESSAGE_SENT_CLIENT",
          leadId: client?.Lead.id,
          columnId: client?.Lead?.columnId,
        });
      }
    } catch (error) {}

    return {
      success: true,
      id: response.id,
    };
  } catch (error: any) {
    console.error(error);
    return {
      success: false,
      message: error.message || "Failed to send email",
    };
  }
}
