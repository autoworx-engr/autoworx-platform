"use server";

import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";

export const updateInfobipVoiceConfig = async ({
  applicationId,
  callsConfigurationId,
  companyId,
}: {
  applicationId: string;
  callsConfigurationId: string;
  companyId?: number;
}) => {
  try {
    const cId = companyId || (await getCompanyId());

    const infobipConfig = await db.infobipConfig.update({
      where: {
        companyId: cId,
      },
      data: {
        applicationId,
        callsConfigurationId,
      },
    });

    return { success: true, data: infobipConfig };
  } catch (error) {
    console.error("Error updating Infobip voice config:", error);
    return { success: false };
  }
};

export const getInfobipVoiceConfig = async (companyId?: number) => {
  try {
    const cId = companyId || (await getCompanyId());

    const infobipConfig = await db.infobipConfig.findFirst({
      where: {
        companyId: cId,
      },
      select: {
        applicationId: true,
        callsConfigurationId: true,
        phoneNumber: true,
      },
    });

    return { success: true, data: infobipConfig };
  } catch (error) {
    console.error("Error getting Infobip voice config:", error);
    return { success: false, data: null };
  }
};
