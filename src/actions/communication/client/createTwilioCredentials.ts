"use server";

import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
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

export const createTwilioCredentials = async ({
  accountSid,
  authToken,
  phoneNumber,
  apiKeySid,
  apiKeySecret,
  phoneNumberSid,
}: {
  accountSid: string;
  authToken: string;
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
        authToken,
        phoneNumber,
        apiKeySid,
        apiKeySecret,
        companyId: companyId as number,
        phoneNumberSid,
      },
      update: {
        accountSid,
        authToken,
        phoneNumber,
        apiKeySid,
        apiKeySecret,
        phoneNumberSid,
      },
    });

    if (
      twilioCredential.accountSid &&
      twilioCredential.authToken &&
      twilioCredential.phoneNumberSid
    ) {
      let companies = await db.twilioCredentials.findMany({
        where: {
          phoneNumber,
        },
        select: {
          companyId: true,
          phoneNumberSid: true,
          accountSid: true,
          authToken: true,
        },
      });

      let companyIds: string[] | number[] | string = companies?.map(
        (c) => c.companyId,
      );
      companyIds.sort();
      companyIds = companyIds?.join(",");

      let cuurentClient = Twilio(
        twilioCredential.accountSid,
        twilioCredential.authToken,
      );

      for (const company of companies) {
        let client = Twilio(company.accountSid, company.authToken);
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

export const getTwilioCredentials = async () => {
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
