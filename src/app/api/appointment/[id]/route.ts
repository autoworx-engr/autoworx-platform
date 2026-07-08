import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { deleteAppointment } from "@/actions/appointment/deleteAppointment";

const INCLUDE = {
  appointmentUsers: {
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeType: true,
        },
      },
    },
  },
  client: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      mobile: true,
      countryCode: true,
      photo: true,
    },
  },
  vehicle: {
    select: { id: true, year: true, make: true, model: true },
  },
  serviceCategory: {
    select: { id: true, name: true, color: true },
  },
} satisfies Prisma.AppointmentInclude;

function serialize(appt: Record<string, unknown>) {
  return {
    ...appt,
    date: appt.date instanceof Date ? appt.date.toISOString() : appt.date,
    createdAt:
      appt.createdAt instanceof Date
        ? appt.createdAt.toISOString()
        : appt.createdAt,
    updatedAt:
      appt.updatedAt instanceof Date
        ? appt.updatedAt.toISOString()
        : appt.updatedAt,
  };
}

type ParsedDate = { ok: true; value: Date | null | undefined } | { ok: false };

function parseEditableDate(value: unknown): ParsedDate {
  if (value === undefined) return { ok: true, value: undefined };
  if (!value) return { ok: true, value: null };
  const parsed = new Date(value as string);
  if (isNaN(parsed.getTime())) return { ok: false };
  return { ok: true, value: parsed };
}

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: Ctx) {
  try {
    const { id } = await context.params;
    const appt = await db.appointment.findUnique({
      where: { id: Number(id) },
      include: INCLUDE,
    });
    if (!appt) {
      return NextResponse.json(
        { success: false, message: "Appointment not found" },
        { status: 404 },
      );
    }
    return NextResponse.json({
      success: true,
      message: "ok",
      data: serialize(appt as unknown as Record<string, unknown>),
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest, context: Ctx) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    const {
      title,
      date,
      endDate,
      startTime,
      endTime,
      clientId,
      vehicleId,
      serviceCategoryId,
      draftEstimate,
      notes,
      confirmationEmailTemplateId,
      confirmationEmailTemplateStatus,
      reminderEmailTemplateId,
      reminderEmailTemplateStatus,
      assignedUsers,
      times,
      timezone,
    } = body;

    const parsedDate = parseEditableDate(date);
    if (!parsedDate.ok) {
      return NextResponse.json(
        { success: false, message: "Invalid date format" },
        { status: 400 },
      );
    }

    const parsedEndDate = parseEditableDate(endDate);
    if (!parsedEndDate.ok) {
      return NextResponse.json(
        { success: false, message: "Invalid end date format" },
        { status: 400 },
      );
    }

    const updated = await db.appointment.update({
      where: { id: Number(id) },
      data: {
        ...(title !== undefined && { title }),
        ...(parsedDate.value !== undefined && { date: parsedDate.value }),
        ...(parsedEndDate.value !== undefined && {
          endDate: parsedEndDate.value,
        }),
        ...(startTime !== undefined && { startTime }),
        ...(endTime !== undefined && { endTime }),
        ...(clientId !== undefined && { clientId }),
        ...(vehicleId !== undefined && { vehicleId }),
        ...(serviceCategoryId !== undefined && { serviceCategoryId }),
        ...(draftEstimate !== undefined && { draftEstimate }),
        ...(notes !== undefined && { notes }),
        ...(confirmationEmailTemplateId !== undefined && {
          confirmationEmailTemplateId,
        }),
        ...(confirmationEmailTemplateStatus !== undefined && {
          confirmationEmailTemplateStatus,
        }),
        ...(reminderEmailTemplateId !== undefined && {
          reminderEmailTemplateId,
        }),
        ...(reminderEmailTemplateStatus !== undefined && {
          reminderEmailTemplateStatus,
        }),
        ...(times !== undefined && { times }),
        ...(timezone !== undefined && { timezone }),
      },
      include: INCLUDE,
    });

    if (assignedUsers && Array.isArray(assignedUsers)) {
      await db.appointmentUser.deleteMany({
        where: { appointmentId: Number(id) },
      });
      if (assignedUsers.length > 0) {
        await db.appointmentUser.createMany({
          data: assignedUsers.map((uid: number) => ({
            appointmentId: Number(id),
            userId: uid,
            eventId: null,
          })),
        });
      }
    }

    const result = await db.appointment.findUnique({
      where: { id: Number(id) },
      include: INCLUDE,
    });

    return NextResponse.json({
      success: true,
      message: "Appointment updated",
      data: serialize(result as unknown as Record<string, unknown>),
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest, context: Ctx) {
  try {
    const { id } = await context.params;
    const appointmentId = Number(id);
    if (!Number.isFinite(appointmentId)) {
      return NextResponse.json(
        { success: false, message: "Invalid appointment id" },
        { status: 400 },
      );
    }

    // Scope the delete to the caller's company so a mobile token can't remove
    // another company's appointment.
    const companyId = (await getAuthPrincipal(req))?.companyId ?? null;
    if (companyId !== null) {
      const appt = await db.appointment.findUnique({
        where: { id: appointmentId },
        select: { companyId: true },
      });
      if (!appt) {
        return NextResponse.json(
          { success: false, message: "Appointment not found" },
          { status: 404 },
        );
      }
      if (appt.companyId !== companyId) {
        return NextResponse.json(
          { success: false, message: "Forbidden: company mismatch" },
          { status: 403 },
        );
      }
    }

    // Reuse the shared server action so reminders (Nest), Google Calendar events
    // and Pusher notifications are cleaned up the same way the web modal does.
    const result = await deleteAppointment(appointmentId);
    if (result.type === "error") {
      return NextResponse.json(
        { success: false, message: "Server error" },
        { status: 500 },
      );
    }
    return NextResponse.json({ success: true, message: "Appointment deleted" });
  } catch {
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 },
    );
  }
}
