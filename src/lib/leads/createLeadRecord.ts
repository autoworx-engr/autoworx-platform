import { updateCommunicationAutomationTrigger } from "@/actions/automation/communication/triggerCommunicationAutomation";
import { updatePipelineAutomationTrigger } from "@/actions/automation/pipeline/triggerPipelineAutomation";
import { updateTagAutomationTrigger } from "@/actions/automation/tag/triggerTagAutomation";
import { initialCreateClientChatTrack } from "@/actions/communication/client/chat-track";
import { sendInfobipMessage } from "@/actions/communication/client/sendInfobipMessage";
import { sendTwilioMessage } from "@/actions/communication/client/sendTwilioMessage";
import { companyWithUser } from "@/actions/settings/getCompanyWithUser";
import { db } from "@/lib/db";
import { sendCRMDemoNotification } from "@/lib/notification/crm-demo-notifiy";
import { sendNewLeadNotification } from "@/lib/notification/pipeline-notify";

export type CreateLeadInput = {
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  vehicleInfo: string;
  services: string;
  source: string;
  serviceId?: number | null;
  countryCode?: string;
  multipleServices?: { connect: Array<{ id: number }> };
};

export type CreateLeadResult = {
  leadId: number;
  clientId: number;
  vehicleId: number;
};

export type CreateLeadOptions = {
  isCRM?: boolean;
  doTriggerAutomation?: boolean;
  sendOpeningSms?: boolean;
  zapierToken?: string;
};

function parseClientName(name: string) {
  const parts = name.trim().split(" ");
  return { firstName: parts.shift() ?? "", lastName: parts.join(" ") };
}

function parseVehicleInfo(vehicleInfo: string) {
  const parts = vehicleInfo.split(/\s+/);
  return {
    year: parseInt(parts[0]) || undefined,
    make: parts[1] || parts[0] || "",
    model: parts.slice(2).join(" ") || "",
  };
}

async function upsertClient(
  companyId: number,
  leadId: number,
  data: {
    firstName: string;
    lastName: string;
    email?: string;
    mobile?: string;
  },
) {
  const existing = data.mobile
    ? await db.client.findFirst({ where: { mobile: data.mobile, companyId } })
    : null;

  if (!existing) {
    return db.client.create({
      data: { ...data, companyId, leadId, isSalesAgent: true },
    });
  }

  return db.client.update({
    where: { id: existing.id, companyId },
    data: { ...data, companyId, leadId },
  });
}

async function runAutomations(
  companyId: number,
  leadId: number,
  columnId: number,
  generatedToken: string,
) {
  try {
    await updatePipelineAutomationTrigger({
      companyId,
      condition: "TIME_DELAY",
      leadId,
      columnId,
    });
  } catch {}

  await updateCommunicationAutomationTrigger({
    companyId,
    leadId,
    columnId,
    generatedToken,
  });

  updateTagAutomationTrigger({
    columnId,
    companyId,
    pipelineType: "SALES",
    leadId,
    conditionType: "post_tag",
    generatedToken,
  });
}

export async function createLeadRecord(
  data: CreateLeadInput,
  companyId: number,
  options: CreateLeadOptions = {},
): Promise<CreateLeadResult> {
  const {
    isCRM = false,
    doTriggerAutomation = true,
    sendOpeningSms = true,
    zapierToken,
  } = options;

  const column = await db.column.findFirst({
    where: { title: "New Leads", companyId, type: "sales" },
  });
  if (!column) throw new Error("New Leads column not found");

  const newLead = await db.lead.create({
    data: {
      clientName: data.clientName,
      clientEmail: data.clientEmail,
      clientPhone: data.clientPhone,
      vehicleInfo: data.vehicleInfo,
      services: data.services,
      source: data.source,
      serviceId: data.serviceId,
      countryCode: data.countryCode,
      companyId,
      columnId: column.id,
      multipleServices: data.multipleServices,
    },
  });

  const { firstName, lastName } = parseClientName(data.clientName);
  const client = await upsertClient(companyId, newLead.id, {
    firstName,
    lastName,
    email: data.clientEmail,
    mobile: data.clientPhone,
  });

  const { year, make, model } = parseVehicleInfo(data.vehicleInfo);
  const vehicle = await db.vehicle.create({
    data: { year, make, model, companyId, clientId: client.id },
  });

  await db.lead.update({
    where: { companyId, id: newLead.id },
    data: { clientId: client.id, vehicleId: vehicle.id },
  });

  if (!isCRM) await initialCreateClientChatTrack(client.id);

  if (doTriggerAutomation) {
    const automationToken =
      isCRM && zapierToken ? zapierToken : await companyWithUser({ companyId });
    await runAutomations(companyId, newLead.id, column.id, automationToken);
  }

  await sendNewLeadNotification({
    companyId,
    leadClientName: newLead.clientName,
  });

  if (isCRM) {
    await sendCRMDemoNotification({
      companyId,
      clientName: newLead.clientName,
    });
  }

  if (sendOpeningSms) {
    const [company, personality] = await Promise.all([
      db.company.findFirst({
        where: { id: companyId },
        select: { smsGateway: true },
      }),
      db.aiPersonality.findFirst({ where: { companyId } }),
    ]);

    if (personality?.openingMessage) {
      if (company?.smsGateway === "TWILIO") {
        await sendTwilioMessage({
          companyId,
          clientId: client.id,
          message: personality.openingMessage,
          attachments: [],
          systemCall: true,
        });
      } else {
        await sendInfobipMessage({
          companyId,
          clientId: client.id,
          message: personality.openingMessage,
          attachments: [],
          systemCall: true,
        });
      }
    }
  }

  return { leadId: newLead.id, clientId: client.id, vehicleId: vehicle.id };
}
