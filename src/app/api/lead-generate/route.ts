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
import {
  normalizePhoneForStorage,
  phoneLookupWhereClause,
} from "@/utils/normalizePhone";
import { NextRequest } from "next/server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-TOKEN",
};

function jsonResponse(data: unknown, status: number) {
  const res = Response.json(data, { status });
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

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
  const phoneLookup = phoneLookupWhereClause(data.mobile);
  const existing = phoneLookup
    ? await db.client.findFirst({ where: { OR: phoneLookup, companyId } })
    : null;

  const normalizedData = {
    ...data,
    mobile: data.mobile ? normalizePhoneForStorage(data.mobile) : data.mobile,
  };

  if (!existing) {
    return db.client.create({
      data: { ...normalizedData, companyId, leadId, isSalesAgent: true },
    });
  }

  return db.client.update({
    where: { id: existing.id, companyId },
    data: { ...normalizedData, companyId, leadId },
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

/**
 * @swagger
 * /api/lead-generate:
 *   post:
 *     summary: Generate new lead from Zapier
 *     tags: [Leads]
 *     parameters:
 *       - in: header
 *         name: X-TOKEN
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Lead created successfully
 *       401:
 *         description: Invalid token
 *       500:
 *         description: Server error
 */

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("X-TOKEN");
    if (!token) return jsonResponse({ error: "Invalid token" }, 401);

    const company = await db.company.findFirst({
      where: { zapierToken: token },
    });

    if (!company) return jsonResponse({ error: "Invalid token" }, 401);

    const body = await request.json();
    const {
      name: clientName,
      email: clientEmail,
      phone: clientPhone,
      countryCode,
      customer_country: customerCountry,
      serviceId: rawServiceId,
      opportunity_source: opportunity,
      message: crmMsg,
      multiServices: rawMultiServices,
    } = body;

    // Parse opportunity string: "(source) vehicleInfo | services"
    const [sourcePart = "", afterParen = ""] = (opportunity ?? "").split(")");
    const parsedSource = sourcePart.replace("(", "").trim();
    const [parsedVehicleInfo = "", parsedServices = ""] = afterParen
      .split("|")
      .map((s: string) => s.trim());

    const isCRM = company.isCRMEnabled ?? false;
    const source = isCRM ? body.source || "Marketing Site" : parsedSource;
    const vehicleInfo = isCRM ? parsedVehicleInfo || "N/A" : parsedVehicleInfo;
    const services = isCRM
      ? parsedServices || crmMsg || "Service Request"
      : parsedServices;
    const serviceId = isCRM ? null : +rawServiceId;

    if (!isCRM && (!clientName || !vehicleInfo || !services || !source)) {
      return jsonResponse({ error: "Invalid input" }, 400);
    }

    const column = await db.column.findFirst({
      where: { title: "New Leads", companyId: company.id, type: "sales" },
    });
    if (!column)
      return jsonResponse({ error: "New Leads column not found" }, 404);

    const multipleServices =
      rawMultiServices?.length > 0
        ? { connect: rawMultiServices.map((s: any) => ({ id: Number(s.id) })) }
        : undefined;

    const newLead = await db.lead.create({
      data: {
        clientName,
        clientEmail,
        clientPhone,
        vehicleInfo,
        services,
        source,
        serviceId,
        countryCode,
        companyId: company.id,
        columnId: column.id,
        multipleServices,
      },
    });

    const { firstName, lastName } = parseClientName(clientName);
    const client = await upsertClient(company.id, newLead.id, {
      firstName,
      lastName,
      email: clientEmail,
      mobile: clientPhone,
    });

    const { year, make, model } = parseVehicleInfo(vehicleInfo);
    const vehicle = await db.vehicle.create({
      data: { year, make, model, companyId: company.id, clientId: client.id },
    });

    await db.lead.update({
      where: { companyId: company.id, id: newLead.id },
      data: { clientId: client.id, vehicleId: vehicle.id },
    });

    if (!isCRM) await initialCreateClientChatTrack(client.id);

    const automationToken = isCRM
      ? token
      : await companyWithUser({ companyId: newLead.companyId });

    await triggerAutomation(company.id, newLead.id, column.id, automationToken);

    await sendNewLeadNotification({
      companyId: company.id,
      leadClientName: newLead.clientName,
    });

    if (isCRM) {
      await sendCRMDemoNotification({
        companyId: company.id,
        clientName: newLead.clientName,
      });
    }

    const personality = await db.aiPersonality.findFirst({
      where: {
        companyId: newLead.companyId,
      },
    });

    console.log("[lead-generate] opening message check", {
      companyId: newLead.companyId,
      clientId: client?.id,
      clientMobile: client?.mobile,
      smsGateway: company?.smsGateway,
      personalityFound: !!personality,
      openingMessage: personality?.openingMessage ?? null,
    });

    if (personality?.openingMessage && client) {
      if (company?.smsGateway === "TWILIO") {
        console.log("[lead-generate] sending opening message via Twilio");
        await sendTwilioMessage({
          companyId: newLead.companyId,
          clientId: client.id,
          message: personality.openingMessage,
          attachments: [],
          systemCall: true,
          shouldSalesAgentStop: false,
        });
      } else {
        console.log("[lead-generate] sending opening message via Infobip");
        await sendInfobipMessage({
          companyId: newLead.companyId,
          clientId: client.id,
          message: personality.openingMessage,
          attachments: [],
          systemCall: true,
          shouldSalesAgentStop: false,
        });
      }
      console.log("[lead-generate] opening message sent successfully");
    } else {
      console.log(
        "[lead-generate] skipping opening message — personality or openingMessage missing",
      );
    }

    return jsonResponse(
      {
        id: newLead.id,
        name: clientName,
        email: clientEmail,
        phone: clientPhone,
        ...(isCRM
          ? { type: "demo_request" }
          : { customer_country: customerCountry }),
        opportunity_source: opportunity,
        countryCode,
      },
      201,
    );
  } catch (error: any) {
    return jsonResponse({ error: error.message }, 500);
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: CORS_HEADERS });
}
