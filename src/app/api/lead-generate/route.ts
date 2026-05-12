import { createLeadRecord } from "@/lib/leads/createLeadRecord";
import { db } from "@/lib/db";
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

    const multipleServices =
      rawMultiServices?.length > 0
        ? { connect: rawMultiServices.map((s: any) => ({ id: Number(s.id) })) }
        : undefined;

    const result = await createLeadRecord(
      {
        clientName,
        clientEmail,
        clientPhone,
        vehicleInfo,
        services,
        source,
        serviceId,
        countryCode,
        multipleServices,
      },
      company.id,
      {
        isCRM,
        doTriggerAutomation: true,
        sendOpeningSms: true,
        zapierToken: token,
      },
    );

    return jsonResponse(
      {
        id: result.leadId,
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
