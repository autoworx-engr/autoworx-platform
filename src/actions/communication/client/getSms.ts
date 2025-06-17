"use server";

import { updatePipelineAutomationTrigger } from "@/actions/automation/pipeline/triggerPipelineAutomation";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { ClientSMS, ClientSmsAttachments } from "@prisma/client";

const getSms = async (
  clientId: number,
): Promise<(ClientSMS & { attachments: ClientSmsAttachments[] })[]> => {
  const companyId = await getCompanyId();

  const client = await db.client.findUnique({
    where: {
      id: clientId,
    },
    include: {
      Lead: true,
    },
  });

  const messages = await db.clientSMS.findMany({
    where: {
      clientId: +clientId!,
      companyId,
    },
    include: {
      attachments: true,
    },
  });

  try {
    if (client?.Lead?.id && client?.Lead?.columnId) {
      await updatePipelineAutomationTrigger({
        companyId: client.companyId,
        condition: "MESSAGE_RECEIVED_CLIENT",
        leadId: client?.Lead.id,
        columnId: client?.Lead?.columnId,
      });
    }
  } catch (error) {}

  return messages;
};

export default getSms;
