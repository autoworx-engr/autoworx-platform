// import { updateCommunicationAutomationTrigger } from "@/actions/automation/communication/triggerCommunicationAutomation";
import { getPusherInstance } from "@/lib/pusher/server";
import { NextRequest } from "next/server";
import { processIncomingSMS } from "./_lib/processIncomingSMS";

const pusher = getPusherInstance();

/**
 * @swagger
 * /api/twilio/sms-receive/{companyIds}:
 *   post:
 *     summary: Twilio SMS webhook for multiple companies
 *     tags: [Twilio]
 *     parameters:
 *       - in: path
 *         name: companyIds
 *         required: true
 *         schema:
 *           type: string
 *           description: Comma-separated company IDs
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             properties:
 *               From:
 *                 type: string
 *               To:
 *                 type: string
 *               Body:
 *                 type: string
 *     responses:
 *       200:
 *         description: SMS received and processed
 *       400:
 *         description: Unsupported content type
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ companyIds: string }> },
) {
  try {
    const { params } = context;
    const companyIdsParam = (await params)?.companyIds;
    const companyIds = companyIdsParam.split(",").map((id) => parseInt(id, 10));

    const contentType = req.headers.get("content-type");
    if (contentType !== "application/x-www-form-urlencoded") {
      throw new Error(
        "Unsupported content type: Twilio webhook expects form-encoded data",
      );
    }

    const formData = await req.text();
    const body = Object.fromEntries(
      new URLSearchParams(formData).entries(),
    ) as Record<string, string>;

    // Respond to Twilio immediately to avoid 15s timeout, then process async
    processIncomingSMS(body, companyIds).catch((err) =>
      console.error("SMS processing error:", err),
    );

    return Response.json({ message: "Webhook received" }, { status: 200 });
  } catch (error: any) {
    console.error("Subscription error:", error);
    return Response.json(
      { message: "Webhook subscription failed", error: error?.message },
      { status: 500 },
    );
  }
}

// 🔹 Function to Fetch Twilio Media and Convert to File
async function fetchTwilioMedia(
  url: string,
  apiKeySid: string,
  apiKeySecret: string,
) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Basic ${btoa(`${apiKeySid}:${apiKeySecret}`)}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Twilio media: ${response.statusText}`);
  }

  const blob = await response.blob();
  const ext = mimeToExtension(blob.type);
  const filename = `twilio-mms-${Date.now()}.${ext}`;
  return new File([blob], filename, { type: blob.type });
}

function mimeToExtension(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "audio/ogg": "ogg",
    "audio/mpeg": "mp3",
    "audio/mp4": "m4a",
    "audio/wav": "wav",
    "audio/webm": "webm",
    "audio/amr": "amr",
    "audio/aac": "aac",
    "audio/3gpp": "3gp",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "video/3gpp": "3gp",
    "application/pdf": "pdf",
  };
  return map[mime.split(";")[0].trim()] || "bin";
}
