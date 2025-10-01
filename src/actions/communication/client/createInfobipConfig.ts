"use server";

import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { InfobipConfig } from "@prisma/client";

export const getInfobipConfig = async (): Promise<{
  success: boolean;
  data?: InfobipConfig | null;
}> => {
  try {
    const companyId = await getCompanyId();

    const infobipConfig = await db.infobipConfig.findFirst({
      where: {
        companyId,
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
    return await db.infobipConfig.findFirst({
      where: {
        companyId,
      },
    });
  } catch (error) {
    console.error("Error getting Infobip config by ID:", error);
    return null;
  }
};

export const createInfobipConfig = async ({
  phoneNumber,
}: {
  phoneNumber: string;
}) => {
  try {
    const companyId = await getCompanyId();

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

export const deleteInfobipConfig = async () => {
  try {
    const companyId = await getCompanyId();

    await db.infobipConfig.delete({
      where: {
        companyId,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error deleting Infobip config:", error);
    return { success: false };
  }
};

export const getFromNumberInfobip = async () => {
  try {
    const companyId = await getCompanyId();
    const infobipConfig = await db.infobipConfig.findFirst({
      where: {
        companyId,
      },
    });
    return infobipConfig?.phoneNumber;
  } catch (error) {
    console.error("Error getting from number for Infobip", error);
    return null;
  }
};
