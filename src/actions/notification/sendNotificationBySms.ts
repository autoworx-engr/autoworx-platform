import Twilio from "twilio";
import { getTwilioCredentials } from "../communication/client/sendTwilioMessage";
import { normalizeUSPhoneNumber } from "@/lib/normalizeUSPhoneNumber";
import { guardOutboundSms, maskPhone } from "@/lib/sms/outboundSmsGuard";

type TSendNotificationBySms = {
  userName?: string;
  userPhoneNo: string;
  description: string;
  companyId: number;
};

export default async function sendNotificationBySms({
  userPhoneNo,
  description,
  companyId,
}: TSendNotificationBySms) {
  try {
    let twilioCredentials = await getTwilioCredentials({
      companyId,
    });

    if (!twilioCredentials) {
      return {
        success: false,
      };
    }

    const twilio = Twilio(
      twilioCredentials.apiKeySid,
      twilioCredentials.apiKeySecret,
      {
        accountSid: twilioCredentials.accountSid,
      },
    );

    const to = normalizeUSPhoneNumber(userPhoneNo);
    if (twilioCredentials.phoneNumber && to && description) {
      const gate = await guardOutboundSms(to, companyId);
      if (gate.allowed) {
        await twilio.messages.create({
          body: description,
          from: twilioCredentials.phoneNumber,
          to,
        });
      } else {
        console.warn(
          `[sms] outbound skipped (${gate.reason}); to=${maskPhone(to)}`,
        );
      }
      return {
        success: true,
      };
    } else {
      throw new Error("Missing required parameters");
    }
  } catch (err) {
    throw err;
  }
}
