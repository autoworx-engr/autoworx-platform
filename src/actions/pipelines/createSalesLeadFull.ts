"use server";

import { updateCommunicationAutomationTrigger } from "@/actions/automation/communication/triggerCommunicationAutomation";
import { updatePipelineAutomationTrigger } from "@/actions/automation/pipeline/triggerPipelineAutomation";
import { updateTagAutomationTrigger } from "@/actions/automation/tag/triggerTagAutomation";
import { initialCreateClientChatTrack } from "@/actions/communication/client/chat-track";
import { sendInfobipMessage } from "@/actions/communication/client/sendInfobipMessage";
import { sendTwilioMessage } from "@/actions/communication/client/sendTwilioMessage";
import { companyWithUser } from "@/actions/settings/getCompanyWithUser";
import { db } from "@/lib/db";
import { sendNewLeadNotification } from "@/lib/notification/pipeline-notify";

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

async function triggerAutomation(
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

export async function createSalesLeadFull({
  companyId,
  clientName,
  clientEmail,
  clientPhone,
  countryCode,
  vehicleInfo,
  services,
  source,
  comments,
  columnId,
}: {
  companyId: number;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  countryCode?: string;
  vehicleInfo: string;
  services: string;
  source: string;
  comments?: string;
  columnId?: number;
}) {
  const company = await db.company.findFirst({ where: { id: companyId } });
  if (!company) throw new Error("Company not found");

  let resolvedColumnId = columnId;
  if (!resolvedColumnId) {
    const defaultColumn = await db.column.findFirst({
      where: { companyId, type: "sales", title: "New Leads" },
      select: { id: true },
    });
    resolvedColumnId = defaultColumn?.id;
  }

  const newLead = await db.lead.create({
    data: {
      clientName,
      clientEmail: clientEmail ?? null,
      clientPhone: clientPhone ?? null,
      countryCode: countryCode ?? "US",
      vehicleInfo,
      services,
      source,
      comments: comments ?? null,
      companyId,
      columnId: resolvedColumnId ?? null,
    },
  });

  const { firstName, lastName } = parseClientName(clientName);
  const client = await upsertClient(companyId, newLead.id, {
    firstName,
    lastName,
    email: clientEmail,
    mobile: clientPhone,
  });

  const { year, make, model } = parseVehicleInfo(vehicleInfo);
  const vehicle = await db.vehicle.create({
    data: { year, make, model, companyId, clientId: client.id },
  });

  await db.lead.update({
    where: { companyId, id: newLead.id },
    data: { clientId: client.id, vehicleId: vehicle.id },
  });

  await initialCreateClientChatTrack(client.id);

  if (resolvedColumnId) {
    const automationToken = await companyWithUser({ companyId });
    await triggerAutomation(
      companyId,
      newLead.id,
      resolvedColumnId,
      automationToken,
    );
  }

  await sendNewLeadNotification({
    companyId,
    leadClientName: newLead.clientName,
  });

  const personality = await db.aiPersonality.findFirst({
    where: { companyId },
  });

  if (personality?.openingMessage && client) {
    if (company.smsGateway === "TWILIO") {
      await sendTwilioMessage({
        companyId,
        clientId: client.id,
        message: personality.openingMessage,
        attachments: [],
        systemCall: true,
        shouldSalesAgentStop: false,
      });
    } else {
      await sendInfobipMessage({
        companyId,
        clientId: client.id,
        message: personality.openingMessage,
        attachments: [],
        systemCall: true,
        shouldSalesAgentStop: false,
      });
    }
  }

  return newLead;
}
