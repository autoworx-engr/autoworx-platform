import { db } from "@/lib/db";
import { updatePipelineAutomationTrigger } from "@/actions/automation/pipeline/triggerPipelineAutomation";
import { SESClient, SendRawEmailCommand } from "@aws-sdk/client-ses";

// Initialize SES Client
const sesClient = new SESClient({
  region: process.env.AWS_BUCKET_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY!,
    secretAccessKey: process.env.AWS_SECRET_KEY!,
  },
});

// Helper to generate raw email
function createRawEmail({
  from,
  to,
  subject,
  text,
  replyTo,
}: {
  from: string;
  to: string;
  subject: string;
  text: string;
  replyTo: string;
}) {
  const boundary = `----=_Boundary_${Date.now()}`;
  let raw = "";

  raw += `From: ${from}\r\n`;
  raw += `To: ${to}\r\n`;
  raw += `Subject: ${subject}\r\n`;
  raw += `Reply-To: ${replyTo}\r\n`;
  raw += `MIME-Version: 1.0\r\n`;
  raw += `Content-Type: multipart/alternative; boundary="${boundary}"\r\n`;
  raw += `List-Unsubscribe: <mailto:unsubscribe@${process.env.SES_DOMAIN}?subject=unsubscribe>, <${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe>\r\n`;
  raw += `List-Unsubscribe-Post: List-Unsubscribe=One-Click\r\n\r\n`;

  raw += `--${boundary}\r\n`;
  raw += `Content-Type: text/plain; charset=UTF-8\r\n`;
  raw += `Content-Transfer-Encoding: 7bit\r\n\r\n`;
  raw += `${text}\n\n-------------------------\nTo unsubscribe, click here: ${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe?email=${encodeURIComponent(to)}\r\n`;
  raw += `--${boundary}--`;

  return raw;
}

export async function sendSESEmail({
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

    if (!client || !client.email) {
      throw new Error("Client not found or email missing");
    }

    const company = await db.company.findFirst({
      where: { id: client.companyId },
    });

    if (!company || !company.email) {
      throw new Error("Company not found or missing email");
    }

    const fromAddress = `communication@${process.env.MAILGUN_DOMAIN}`;
    const replyToAddress = `${company.id}@${process.env.MAILGUN_DOMAIN}`;
    const toAddress = client.email;

    const rawEmail = createRawEmail({
      from: fromAddress,
      to: toAddress,
      subject,
      text,
      replyTo: replyToAddress,
    });

    const sendCommand = new SendRawEmailCommand({
      Source: fromAddress,
      Destinations: [toAddress],
      RawMessage: {
        Data: Buffer.from(rawEmail),
      },
    });

    const result = await sesClient.send(sendCommand);

    // Automation trigger
    if (client?.Lead?.id && client?.Lead?.columnId) {
      await updatePipelineAutomationTrigger({
        companyId: client.companyId,
        condition: "MESSAGE_SENT_CLIENT",
        leadId: client?.Lead.id,
        columnId: client?.Lead?.columnId,
      });
    }

    return {
      success: true,
      id: result.MessageId,
    };
  } catch (error: any) {
    console.error("SES Send Error:", error);
    return {
      success: false,
      message: error.message || "Failed to send email via SES",
    };
  }
}
