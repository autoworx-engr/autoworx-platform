import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCompanyIdFromBearer } from "@/lib/mobileAuth";
import {
  createLeadRecord,
  type CreateLeadInput,
} from "@/lib/leads/createLeadRecord";
import { writeAuditLog } from "@/lib/copilot/audit";

/**
 * @swagger
 * /api/lead/company/{companyId}:
 *   post:
 *     summary: Create a new lead for a company
 *     description: |
 *       Creates a lead, client, and vehicle record. Used by both the AI copilot
 *       (server-side internal call via internalApiClient) and the mobile app.
 *       Authenticated via Bearer JWT. The companyId in the URL must match the
 *       companyId claim in the JWT — 403 on mismatch.
 *     tags: [Leads]
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema: { type: integer, example: 4 }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, clientName, vehicleInfo, services, source]
 *             properties:
 *               userId: { type: integer, example: 7 }
 *               clientName: { type: string, example: "Jane Smith" }
 *               clientEmail: { type: string, example: "jane@example.com" }
 *               clientPhone: { type: string, example: "5551234567" }
 *               vehicleInfo: { type: string, example: "2020 Honda Civic" }
 *               services: { type: string, example: "Oil Change" }
 *               source: { type: string, example: "Website" }
 *               serviceId: { type: integer, nullable: true }
 *               countryCode: { type: string, example: "US" }
 *     responses:
 *       201:
 *         description: Lead created successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Lead created successfully
 *               data: { leadId: 123, clientId: 456, vehicleId: 789 }
 *       400:
 *         description: Validation error
 *       401:
 *         description: Missing or invalid Bearer token
 *       403:
 *         description: JWT companyId does not match URL companyId
 *       500:
 *         description: Internal server error
 */

const CreateLeadBodySchema = z.object({
  userId: z.number().int().positive(),
  clientName: z.string().min(1, "clientName is required"),
  clientEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  clientPhone: z.string().optional(),
  vehicleInfo: z.string().min(1, "vehicleInfo is required"),
  services: z.string().min(1, "services is required"),
  source: z.string().min(1, "source is required"),
  serviceId: z.number().int().nullable().optional(),
  countryCode: z.string().optional(),
  sendOpeningSms: z.boolean().optional(),
  multipleServices: z
    .object({
      connect: z.array(z.object({ id: z.number().int().positive() })),
    })
    .optional(),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ companyId: string }> },
): Promise<NextResponse> {
  const startTime = Date.now();
  const { companyId: companyIdParam } = await context.params;

  const jwtCompanyId = await getCompanyIdFromBearer(req);
  if (jwtCompanyId === null) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  const urlCompanyId = parseInt(companyIdParam, 10);
  if (isNaN(urlCompanyId) || urlCompanyId !== jwtCompanyId) {
    return NextResponse.json(
      { success: false, message: "Forbidden" },
      { status: 403 },
    );
  }
  const companyId = jwtCompanyId;

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = CreateLeadBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        message: parsed.error.errors[0]?.message ?? "Validation error",
        field: parsed.error.errors[0]?.path.join(".") ?? null,
      },
      { status: 400 },
    );
  }

  const { userId, clientEmail, sendOpeningSms, ...rest } = parsed.data;
  const leadInput: CreateLeadInput = {
    ...rest,
    clientEmail: clientEmail || undefined,
  };

  try {
    const result = await createLeadRecord(leadInput, companyId, {
      isCRM: false,
      doTriggerAutomation: true,
      sendOpeningSms: sendOpeningSms ?? true,
    });

    await writeAuditLog({
      actor: "api",
      action: "lead.create",
      userId,
      companyId,
      resourceType: "Lead",
      resourceId: String(result.leadId),
      input: leadInput,
      output: { leadId: result.leadId, clientId: result.clientId },
      success: true,
      latencyMs: Date.now() - startTime,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Lead created successfully",
        data: {
          leadId: result.leadId,
          clientId: result.clientId,
          vehicleId: result.vehicleId,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create lead";

    await writeAuditLog({
      actor: "api",
      action: "lead.create",
      userId,
      companyId,
      success: false,
      errorMessage,
      latencyMs: Date.now() - startTime,
    });

    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 },
    );
  }
}
