import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deleteAppointment } from "@/actions/appointment/deleteAppointment";
import { scheduleRemindersInNest } from "@/actions/appointment/appointmentReminderScheduler";
import { deleteRemindersInNest } from "@/actions/appointment/deleteAppointment";

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
 *             required:
 *               - title
 *               - assignedUsers
 *             properties:
 *               title: { type: string, example: Brake Inspection }
 *               date: { type: string, format: date-time, nullable: true, example: "2026-03-15T09:00:00.000Z" }
 *               startTime: { type: string, nullable: true, example: "09:00" }
 *               endTime: { type: string, nullable: true, example: "10:00" }
 *               assignedUsers:
 *                 type: array
 *                 items: { type: integer }
 *                 example: [2, 5]
 *               clientId: { type: integer, nullable: true, example: 15 }
 *               vehicleId: { type: integer, nullable: true, example: 8 }
 *               serviceCategoryId: { type: integer, nullable: true, example: 3 }
 *               draftEstimate: { type: string, nullable: true, example: "EST-2002" }
 *               notes: { type: string, nullable: true, example: Customer prefers morning }
 *               confirmationEmailTemplateId: { type: integer, nullable: true, example: 5 }
 *               confirmationEmailTemplateStatus: { type: boolean, nullable: true, example: true }
 *               reminderEmailTemplateId: { type: integer, nullable: true, example: 6 }
 *               reminderEmailTemplateStatus: { type: boolean, nullable: true, example: true }
 *               times:
 *                 type: array
 *                 nullable: true
 *                 items:
 *                   type: object
 *                   properties:
 *                     date: { type: string, example: "2026-03-14" }
 *                     time: { type: string, example: "08:30" }
 *               timezone: { type: string, nullable: true, example: "America/New_York" }
 *     responses:
 *       200:
 *         description: Appointment updated successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Appointment updated successfully
 *               data: {}
 *       400:
 *         description: Validation error or appointment not found for company
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: Appointment not found for this company
 *       500:
 *         description: Internal server error
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
 *       200:
 *         description: Appointment deleted successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Appointment deleted successfully
 *       400:
 *         description: Appointment not found for this company
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: Appointment not found for this company
 *       500:
 *         description: Internal server error
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
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Appointment not found for this company" },
        { status: 400 },
      );
    }

    const body = await req.json();

    if (!body.title) {
      return NextResponse.json(
        { success: false, message: "title is required" },
        { status: 400 },
      );
    }

    if (!Array.isArray(body.assignedUsers)) {
      return NextResponse.json(
        { success: false, message: "assignedUsers must be an array" },
        { status: 400 },
      );
    }

    const updatedAppointment = await db.appointment.update({
      where: { id },
      data: {
        title: body.title,
        date: body.date ? new Date(body.date) : undefined,
        startTime: body.startTime ?? undefined,
        endTime: body.endTime ?? undefined,
        clientId: body.clientId ?? undefined,
        vehicleId: body.vehicleId ?? undefined,
        serviceCategoryId: body.serviceCategoryId ?? undefined,
        draftEstimate: body.draftEstimate ?? undefined,
        notes: body.notes ?? undefined,
        confirmationEmailTemplateId:
          body.confirmationEmailTemplateId ?? undefined,
        confirmationEmailTemplateStatus:
          body.confirmationEmailTemplateStatus ?? undefined,
        reminderEmailTemplateId: body.reminderEmailTemplateId ?? undefined,
        reminderEmailTemplateStatus:
          body.reminderEmailTemplateStatus ?? undefined,
        times: body.times ?? undefined,
        timezone: body.timezone ?? undefined,
      },
    });

    await db.appointmentUser.deleteMany({ where: { appointmentId: id } });
    if (body.assignedUsers.length > 0) {
      await db.appointmentUser.createMany({
        data: body.assignedUsers.map((uid: number) => ({
          appointmentId: id,
          userId: uid,
          eventId: "",
        })),
      });
    }

    try {
      await deleteRemindersInNest(String(id));
      if (updatedAppointment.date && updatedAppointment.startTime) {
        const company = await db.company.findFirst({
          where: { id: companyId },
          select: { timezone: true },
        });
        await scheduleRemindersInNest({
          id: String(id),
          date: updatedAppointment.date,
          time: updatedAppointment.startTime,
          timezone: company?.timezone || body.timezone || "Etc/UTC",
        });
      }
    } catch (_) {}

    return NextResponse.json({
      success: true,
      message: "Appointment updated successfully",
      data: updatedAppointment,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Internal server error" },
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
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Internal server error" },
      { status: 500 },
    );
  }
}
