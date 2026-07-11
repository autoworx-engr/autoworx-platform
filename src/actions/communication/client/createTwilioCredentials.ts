"use server";

import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { TwilioCredentials } from "@prisma/client";
import Twilio from "twilio";

export const isSmsAvailable = async (companyId?: number) => {
  try {
    const cId = companyId || (await getCompanyId());
    const company = await db.company.findFirst({
      where: {
        id: cId,
      },
      select: {
        smsGateway: true,
      },
    });
    let smsGateway;

    if (company?.smsGateway === "TWILIO") {
      smsGateway = await db.twilioCredentials.findFirst({
        where: {
          companyId: cId,
        },
      });
    } else if (company?.smsGateway === "INFOBIP") {
      smsGateway = await db.infobipConfig.findFirst({
        where: {
          companyId: cId,
        },
      });
    }

    if (smsGateway)
      return {
        success: true,
        data: smsGateway,
      };
    throw new Error("SMS gateway not found");
  } catch (error) {
    console.error("Error getting from number", error);
    return {
      success: false,
    };
  }
};
export const getFromNumber = async (companyId?: number) => {
  try {
    const cId = companyId || (await getCompanyId());
    const twilioCredentials = await db.twilioCredentials.findFirst({
      where: {
        companyId: cId,
      },
    });
    return twilioCredentials?.phoneNumber;
  } catch (error) {
    console.error("Error getting from number", error);
    return null;
  }
};

export const getTwilioCredentials = async (
  companyId?: number,
): Promise<{
  success: boolean;
  data?: TwilioCredentials | null;
}> => {
  try {
    const cId = companyId || (await getCompanyId());

    const twilioCredential = await db.twilioCredentials.findFirst({
      where: {
        companyId: cId,
      },
    });

    return { success: true, data: twilioCredential };
  } catch (error) {
    console.error("Error getting Twilio credentials", error);
    return { success: false };
  }
};

export const createTwilioCredentials = async ({
  companyId,
  accountSid,
  phoneNumber,
  apiKeySid,
  apiKeySecret,
  phoneNumberSid,
  fcmPushCredentialSid,
  apnPushCredentialSid,
}: {
  companyId: number;
  accountSid: string;
  phoneNumber: string;
  apiKeySid: string;
  apiKeySecret: string;
  phoneNumberSid: string;
  fcmPushCredentialSid?: string;
  apnPushCredentialSid?: string;
}) => {
  console.log("🚀 ~ createTwilioCredentials ~ companyId:", companyId);
  try {
    // const companyId = await getCompanyId();

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
        fcmPushCredentialSid,
        apnPushCredentialSid,
      },
      update: {
        accountSid,
        phoneNumber,
        apiKeySid,
        apiKeySecret,
        phoneNumberSid,
        fcmPushCredentialSid,
        apnPushCredentialSid,
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
          voiceUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/incoming`,
        });
      }

      const appHost = new URL(
        process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost",
      ).hostname;
      const twimlAppName = `Autoworx_TwiML_App_${companyId}_${appHost}`;

      const existingApps = await cuurentClient.applications.list({
        friendlyName: twimlAppName,
        limit: 1,
      });

      let application;
      if (existingApps.length > 0) {
        application = await cuurentClient
          .applications(existingApps[0].sid)
          .update({
            friendlyName: twimlAppName,
            voiceUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/receive`,
            voiceMethod: "POST",
          });
      } else {
        application = await cuurentClient.applications.create({
          friendlyName: twimlAppName,
          voiceUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/receive`,
          voiceMethod: "POST",
        });
      }

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
      await db.company.update({
        where: { id: companyId },
        data: { smsGateway: "TWILIO" },
      });
    }

    return { success: true };
  } catch (error) {
    console.error("", error);
    return { success: false };
  }
};

export const buyTwilioNumber = async (companyId?: number) => {
  try {
    const cId = companyId || (await getCompanyId());
    const company = await db.company.findFirst({
      where: {
        id: cId,
      },
    });

    if (!company) {
      throw new Error("Company not found");
    }
    let twilioCredential = await db.twilioCredentials.findFirst({
      where: {
        companyId: cId,
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
      friendlyName: `Company-${cId}_${company.name}`,
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
      smsUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/sms-receive/${cId}`,
    });

    // 4. Create TwiML App (optional, for voice)
    const application = await subClient.applications.create({
      friendlyName: `TwiML App - Company ${cId}`,
      voiceUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/receive`,
      voiceMethod: "POST",
    });

    // 5. Save credentials to DB
    await db.twilioCredentials.upsert({
      where: { companyId: cId },
      create: {
        accountSid: subaccount.sid,
        apiKeySid: apiKey.sid,
        apiKeySecret: apiKey.secret,
        phoneNumber: purchased.phoneNumber,
        phoneNumberSid: purchased.sid,
        twimlAppSid: application.sid,
        companyId: cId,
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
