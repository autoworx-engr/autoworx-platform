import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { recordingSid: string } },
) {
  const recordingSid = params.recordingSid;
  if (!recordingSid) {
    return new Response("Missing recording SID", { status: 400 });
  }

  const companyId = await getCompanyId();
  const twilioCredentials = await db.twilioCredentials.findFirst({
    where: { companyId },
  });

  const accountSid = twilioCredentials?.accountSid!;
  const authToken = twilioCredentials?.authToken!;
  const recordingUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Recordings/${recordingSid}.mp3`;

  const response = await fetch(recordingUrl, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
    },
  });

  if (!response.ok) {
    return new Response("Failed to fetch recording", {
      status: response.status,
    });
  }

  const audioBuffer = await response.arrayBuffer();

  return new Response(audioBuffer, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Disposition": `inline; filename="${recordingSid}.mp3"`,
    },
  });
}
