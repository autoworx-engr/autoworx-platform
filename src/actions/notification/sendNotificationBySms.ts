import Twilio from "twilio";
import { getTwilioCredentials } from "../communication/client/sendTwilioMessage";
import { normalizeUSPhoneNumber } from "@/lib/normalizeUSPhoneNumber";

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
      }
    );

    if (twilioCredentials.phoneNumber && userPhoneNo && description) {
      await twilio.messages.create({
        body: description,
        from: twilioCredentials.phoneNumber,
        to: normalizeUSPhoneNumber(userPhoneNo)!,
      });
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
