"use server";

import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { sendInfobipMessage } from "../sendInfobipMessage";
import { sendTwilioMessage } from "../sendTwilioMessage";

export async function sendWorkOrderAttachments({
  clientId,
  attachments,
}: {
  clientId: number;
  attachments: { url: string; name: string }[];
}) {
  try {
    const companyId = await getCompanyId();
    const company = await db.company.findFirst({
      where: { id: companyId },
      select: {
        smsGateway: true,
      },
    });

    if (company?.smsGateway === "INFOBIP") {
      await sendInfobipMessage({
        companyId,
        clientId,
        message: "",
        attachments,
      });
    } else if (company?.smsGateway === "TWILIO") {
      await sendTwilioMessage({
        companyId,
        clientId,
        message: "",
        attachments,
      });
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error sending work order attachments:", error);
    return {
      success: false,
      error: "Failed to send work order attachments",
    };
  }
}
