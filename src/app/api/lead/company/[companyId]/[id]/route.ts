import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCompanyIdFromBearer } from "@/lib/mobileAuth";
import { updateLead } from "@/actions/lead/updateLead";
import { writeAuditLog } from "@/lib/copilot/audit";

/**
 * @swagger
 * /api/lead/company/{companyId}/{id}:
 *   put:
 *     summary: Update a lead belonging to the specified company
 *     tags: [Leads]
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema: { type: integer, example: 4 }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer, example: 12 }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId: { type: integer }
 *               columnId: { type: integer, nullable: true }
 *               clientName: { type: string }
 *               clientEmail: { type: string }
 *               clientPhone: { type: string }
 *               vehicleInfo: { type: string }
 *               services: { type: string }
 *               source: { type: string }
 *               comments: { type: string }
 *               assignedSalesUserId: { type: integer, nullable: true }
 *     responses:
 *       200: { description: Lead updated }
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       500: { description: Internal server error }
 */

const UpdateLeadBodySchema = z.object({
  userId: z.number().int().positive(),
  columnId: z.number().int().positive().nullable().optional(),
  clientName: z.string().min(1).optional(),
  clientEmail: z.string().email().optional().or(z.literal("")),
  clientPhone: z.string().optional(),
  vehicleInfo: z.string().min(1).optional(),
  services: z.string().min(1).optional(),
  source: z.string().min(1).optional(),
  comments: z.string().optional(),
  assignedSalesUserId: z.number().int().positive().nullable().optional(),
});

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ companyId: string; id: string }> },
): Promise<NextResponse> {
  const startTime = Date.now();
  const { companyId: companyIdParam, id: idParam } = await context.params;

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

  const leadId = parseInt(idParam, 10);
  if (isNaN(leadId)) {
    return NextResponse.json(
      { success: false, message: "Invalid lead id" },
      { status: 400 },
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

  const parsed = UpdateLeadBodySchema.safeParse(rawBody);
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

  const { userId, ...updateFields } = parsed.data;

  try {
    const result = await updateLead(
      { leadId, ...updateFields },
      { forceCompanyId: companyId, forceUserId: userId },
    );

    if (result.type === "error") {
      await writeAuditLog({
        actor: "api",
        action: "lead.update",
        userId,
        companyId,
        resourceType: "Lead",
        resourceId: String(leadId),
        input: updateFields,
        success: false,
        errorMessage: result.message,
        latencyMs: Date.now() - startTime,
      });
      return NextResponse.json(
        { success: false, message: result.message ?? "Failed to update lead" },
        { status: 400 },
      );
    }

    await writeAuditLog({
      actor: "api",
      action: "lead.update",
      userId,
      companyId,
      resourceType: "Lead",
      resourceId: String(leadId),
      input: updateFields,
      success: true,
      latencyMs: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      message: "Lead updated successfully",
      data: { leadId },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to update lead";
    await writeAuditLog({
      actor: "api",
      action: "lead.update",
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
