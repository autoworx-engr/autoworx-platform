"use server";

import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { TwilioCredentials } from "@prisma/client";
import Twilio from "twilio";

export const getFromNumber = async () => {
  try {
    const companyId = await getCompanyId();
    const twilioCredentials = await db.twilioCredentials.findFirst({
      where: {
        companyId,
      },
    });
    return twilioCredentials?.phoneNumber;
  } catch (error) {
    console.error("Error getting from number", error);
    return null;
  }
};

export const getTwilioCredentials = async (): Promise<{
  success: boolean;
  data?: TwilioCredentials | null;
}> => {
  try {
    const companyId = await getCompanyId();

    const twilioCredential = await db.twilioCredentials.findFirst({
      where: {
        companyId,
      },
    });

    return { success: true, data: twilioCredential };
  } catch (error) {
    console.error("", error);
    return { success: false };
  }
};

export const createTwilioCredentials = async ({
  accountSid,
  phoneNumber,
  apiKeySid,
  apiKeySecret,
  phoneNumberSid,
}: {
  accountSid: string;
  phoneNumber: string;
  apiKeySid: string;
  apiKeySecret: string;
  phoneNumberSid: string;
}) => {
  try {
    const companyId = await getCompanyId();

    const twilioCredential = await db.twilioCredentials.upsert({
      where: {
        companyId,
      },
      create: {
        accountSid,
        phoneNumber,
        apiKeySid,
        apiKeySecret,
        companyId: companyId as number,
        phoneNumberSid,
      },
      update: {
        accountSid,
        phoneNumber,
        apiKeySid,
        apiKeySecret,
        phoneNumberSid,
      },
    });

    if (twilioCredential.accountSid && twilioCredential.phoneNumberSid) {
      let companies = await db.twilioCredentials.findMany({
        where: {
          phoneNumber,
        },
        select: {
          companyId: true,
          phoneNumberSid: true,
          accountSid: true,
          apiKeySecret: true,
          apiKeySid: true,
        },
      });

      let companyIds: string[] | number[] | string = companies?.map(
        (c) => c.companyId,
      );
      companyIds.sort();
      companyIds = companyIds?.join(",");

      let cuurentClient = Twilio(
        twilioCredential.apiKeySid,
        twilioCredential.apiKeySecret,
        {
          accountSid: twilioCredential.accountSid,
        },
      );

      for (const company of companies) {
        let client = Twilio(company.apiKeySid, company.apiKeySecret, {
          accountSid: company.accountSid,
        });
        await client.incomingPhoneNumbers(company.phoneNumberSid).update({
          smsUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/sms-receive/${companyIds}`,
        });
      }

      const application = await cuurentClient.applications.create({
        friendlyName: `User TwiML App`,
        voiceUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/receive`,
        voiceMethod: "POST",
      });

      if (application.sid) {
        await db.twilioCredentials.update({
          where: {
            companyId,
          },
          data: {
            twimlAppSid: application.sid,
          },
        });
      }
    }

    return { success: true };
  } catch (error) {
    console.error("", error);
    return { success: false };
  }
};

export const buyTwilioNumber = async () => {
  try {
    const companyId = await getCompanyId();
    const company = await db.company.findFirst({
      where: {
        id: companyId,
      },
    });

    if (!company) {
      throw new Error("Company not found");
    }
    let twilioCredential = await db.twilioCredentials.findFirst({
      where: {
        companyId,
      },
    });

    if (twilioCredential?.phoneNumberSid && twilioCredential?.accountSid) {
      return { success: true, data: twilioCredential };
    }

    const parentClient = Twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!,
    );

    // 1. Create subaccount for the company
    const subaccount = await parentClient.api.accounts.create({
      friendlyName: `Company-${companyId}_${company.name}`,
    });

    const subClient = Twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!,
      { accountSid: subaccount.sid },
    );

    // 2. Create API key for that subaccount (optional, but good practice)
    const apiKey = await subClient.newKeys.create();

    // 3. Buy a phone number
    const numbers = await subClient.availablePhoneNumbers("US").local.list({
      limit: 1,
    });

    const phoneNumber = numbers[0];
    const purchased = await subClient.incomingPhoneNumbers.create({
      phoneNumber: phoneNumber.phoneNumber,
      smsUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/sms-receive/${companyId}`,
    });

    // 4. Create TwiML App (optional, for voice)
    const application = await subClient.applications.create({
      friendlyName: `TwiML App - Company ${companyId}`,
      voiceUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/receive`,
      voiceMethod: "POST",
    });

    // 5. Save credentials to DB
    await db.twilioCredentials.upsert({
      where: { companyId },
      create: {
        accountSid: subaccount.sid,
        apiKeySid: apiKey.sid,
        apiKeySecret: apiKey.secret,
        phoneNumber: purchased.phoneNumber,
        phoneNumberSid: purchased.sid,
        twimlAppSid: application.sid,
        companyId,
      },
      update: {
        accountSid: subaccount.sid,
        apiKeySid: apiKey.sid,
        apiKeySecret: apiKey.secret,
        phoneNumber: purchased.phoneNumber,
        phoneNumberSid: purchased.sid,
        twimlAppSid: application.sid,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error setting up Twilio for company:", error);
    return { success: false };
  }
};

export const deleteTwilioSubaccount = async () => {
  try {
    const parentClient = Twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!,
    );

    // Close the subaccount (sets status to 'closed')
    await parentClient.api.accounts("").update({ status: "closed" });

    return { success: true };
  } catch (error) {
    console.error("Failed to delete Twilio subaccount:", error);
    return { success: false, error };
  }
};
