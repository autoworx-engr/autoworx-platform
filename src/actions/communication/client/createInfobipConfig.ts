"use server";

import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { InfobipConfig } from "@prisma/client";

export const getSmsGateway = async (
  companyId?: number,
): Promise<string | null> => {
  try {
    const cId = companyId || (await getCompanyId());

    const company = await db.company.findFirst({
      where: {
        id: cId,
      },
      select: { smsGateway: true },
    });

    return company?.smsGateway || "TWILIO";
  } catch (error) {
    console.error("Error getting SMS gateway:", error);
    return null;
  }
};

export const getInfobipConfig = async (
  companyId?: number,
): Promise<{
  success: boolean;
  data?: InfobipConfig | null;
}> => {
  try {
    const cId = companyId || (await getCompanyId());

    const infobipConfig = await db.infobipConfig.findFirst({
      where: {
        companyId: cId,
      },
    });

    return { success: true, data: infobipConfig };
  } catch (error) {
    console.error("Error getting Infobip config:", error);
    return { success: false };
  }
};

export const getInfobipConfigById = async (companyId: number) => {
  try {
    const infobipConfig = await db.infobipConfig.findFirst({
      where: {
        companyId,
      },
    });
    return { success: true, data: infobipConfig };
  } catch (error) {
    console.error("Error getting Infobip config by ID:", error);
    return { success: false };
  }
};

export const createInfobipConfig = async ({
  companyId,
  phoneNumber,
}: {
  companyId: number;
  phoneNumber: string;
}) => {
  try {
    const infobipConfig = await db.infobipConfig.upsert({
      where: {
        companyId,
      },
      create: {
        phoneNumber,
        companyId: companyId as number,
      },
      update: {
        phoneNumber,
      },
    });

    await db.company.update({
      where: { id: companyId },
      data: { smsGateway: "INFOBIP" },
    });

    return { success: true, data: infobipConfig };
  } catch (error) {
    console.error("Error creating Infobip config:", error);
    return { success: false };
  }
};

export const deleteInfobipConfig = async (companyId?: number) => {
  try {
    const cId = companyId || (await getCompanyId());

    await db.infobipConfig.delete({
      where: {
        companyId: cId,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error deleting Infobip config:", error);
    return { success: false };
  }
};

export const getFromNumberInfobip = async (companyId?: number) => {
  try {
    const cId = companyId || (await getCompanyId());
    const infobipConfig = await db.infobipConfig.findFirst({
      where: {
        companyId: cId,
      },
    });
    return infobipConfig?.phoneNumber;
  } catch (error) {
    console.error("Error getting from number for Infobip", error);
    return null;
  }
};
