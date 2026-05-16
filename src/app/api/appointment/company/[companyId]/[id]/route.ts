import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCompanyIdFromBearer } from "@/lib/mobileAuth";
import { updateAppointment } from "@/actions/appointment/updateAppointment";
import { deleteAppointment } from "@/actions/appointment/deleteAppointment";
import { writeAuditLog } from "@/lib/copilot/audit";

/**
 * @swagger
 * /api/appointment/company/{companyId}/{id}:
 *   patch:
 *     summary: Update an appointment belonging to a company
 *     tags: [Appointment]
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema: { type: integer, example: 10 }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer, example: 42 }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId: { type: integer, example: 3 }
 *               title: { type: string, example: Brake Inspection }
 *               date: { type: string, format: date-time, nullable: true }
 *               startTime: { type: string, nullable: true, example: "09:00" }
 *               endTime: { type: string, nullable: true, example: "10:00" }
 *               assignedUsers:
 *                 type: array
 *                 items: { type: integer }
 *                 example: [2, 5]
 *               clientId: { type: integer, nullable: true }
 *               vehicleId: { type: integer, nullable: true }
 *               serviceCategoryId: { type: integer, nullable: true }
 *               notes: { type: string, nullable: true }
 *               timezone: { type: string, nullable: true }
 *     responses:
 *       200: { description: Appointment updated successfully }
 *       400: { description: Validation error or not found }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       500: { description: Internal server error }
 *
 *   delete:
 *     summary: Delete an appointment belonging to a company
 *     tags: [Appointment]
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema: { type: integer, example: 10 }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer, example: 42 }
 *     responses:
 *       200: { description: Appointment deleted successfully }
 *       400: { description: Not found }
 *       500: { description: Internal server error }
 */

async function resolveParams(props: {
  params: Promise<{ companyId: string; id: string }>;
}) {
  const params = await props.params;
  return { companyId: Number(params.companyId), id: Number(params.id) };
}

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ companyId: string; id: string }> },
) {
  const startTime = Date.now();
  const { companyId, id } = await resolveParams(props);

  if (!companyId || isNaN(companyId) || !id || isNaN(id)) {
    return NextResponse.json(
      { success: false, message: "Invalid companyId or id" },
      { status: 400 },
    );
  }

  const jwtCompanyId = await getCompanyIdFromBearer(req);
  if (jwtCompanyId === null) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }
  if (jwtCompanyId !== companyId) {
    return NextResponse.json(
      { success: false, message: "Forbidden" },
      { status: 403 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const userId = typeof body.userId === "number" ? body.userId : undefined;

  try {
    const updateInput = {
      ...body,
      appointmentId: id,
    } as Parameters<typeof updateAppointment>[0];
    const result = await updateAppointment(updateInput, {
      forceCompanyId: companyId,
      forceUserId: userId,
    });

    if (result.type === "error") {
      await writeAuditLog({
        actor: "api",
        action: "appointment.update",
        userId: userId ?? 0,
        companyId,
        resourceType: "Appointment",
        resourceId: String(id),
        input: body,
        success: false,
        errorMessage: result.message,
        latencyMs: Date.now() - startTime,
      });
      return NextResponse.json(
        {
          success: false,
          message: result.message ?? "Failed to update appointment",
        },
        { status: 400 },
      );
    }

    await writeAuditLog({
      actor: "api",
      action: "appointment.update",
      userId: userId ?? 0,
      companyId,
      resourceType: "Appointment",
      resourceId: String(id),
      input: body,
      success: true,
      latencyMs: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      message: "Appointment updated successfully",
      data: { appointmentId: id },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    await writeAuditLog({
      actor: "api",
      action: "appointment.update",
      userId: userId ?? 0,
      companyId,
      resourceType: "Appointment",
      resourceId: String(id),
      input: body,
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

export async function DELETE(
  _req: NextRequest,
  props: { params: Promise<{ companyId: string; id: string }> },
) {
  try {
    const { companyId, id } = await resolveParams(props);

    if (!companyId || isNaN(companyId) || !id || isNaN(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid companyId or id" },
        { status: 400 },
      );
    }

    const existing = await db.appointment.findFirst({
      where: { id, companyId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Appointment not found for this company" },
        { status: 400 },
      );
    }

    const result = await deleteAppointment(id);
    if (result?.type === "error") {
      return NextResponse.json(
        { success: false, message: "Failed to delete appointment" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Appointment deleted successfully",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
