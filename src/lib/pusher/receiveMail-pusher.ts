"use server";

import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { getPusherInstance } from "@/lib/pusher/server";
import { MailgunEmail, MailgunEmailAttachment } from "@prisma/client";

const pusher = getPusherInstance();

export default async function receiveMail(
  mailGunMail: MailgunEmail & { attachments: MailgunEmailAttachment[] | [] },
) {
  try {
    // Send Mail to user via pusher
    const channelName = `mail-${mailGunMail.companyId}-${mailGunMail.clientId}`;
    await pusher.trigger(channelName, "mail", mailGunMail);
    return {
      type: "success",
    };
  } catch (error) {
    console.error(error);
    return errorHandler(error);
  }
}
