import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { deleteAppointment } from "@/actions/appointment/deleteAppointment";
import { notifyAppointmentUpdated } from "../_appointmentNotifications";

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

async function authorizeAppointmentAccess(
  req: NextRequest,
  rawId: string,
): Promise<
  { error: NextResponse } | { appointmentId: number; companyId: number }
> {
  const appointmentId = Number(rawId);
  if (!Number.isFinite(appointmentId)) {
    return {
      error: NextResponse.json(
        { success: false, message: "Invalid appointment id" },
        { status: 400 },
      ),
    };
  }

  const principal = await getAuthPrincipal(req);
  if (!principal) {
    return {
      error: NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      ),
    };
  }

  const appt = await db.appointment.findUnique({
    where: { id: appointmentId },
    select: { companyId: true },
  });
  if (!appt) {
    return {
      error: NextResponse.json(
        { success: false, message: "Appointment not found" },
        { status: 404 },
      ),
    };
  }
  if (appt.companyId !== principal.companyId) {
    return {
      error: NextResponse.json(
        { success: false, message: "Forbidden: company mismatch" },
        { status: 403 },
      ),
    };
  }

  return { appointmentId, companyId: principal.companyId };
}

export async function GET(req: NextRequest, context: Ctx) {
  try {
    const { id } = await context.params;
    const access = await authorizeAppointmentAccess(req, id);
    if ("error" in access) return access.error;

    const appt = await db.appointment.findUnique({
      where: { id: access.appointmentId },
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
    const access = await authorizeAppointmentAccess(req, id);
    if ("error" in access) return access.error;
    const appointmentId = access.appointmentId;

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

    await db.appointment.update({
      where: { id: appointmentId },
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
        where: { appointmentId },
      });
      if (assignedUsers.length > 0) {
        await db.appointmentUser.createMany({
          data: assignedUsers.map((uid: number) => ({
            appointmentId,
            userId: uid,
            eventId: null,
          })),
        });
      }
    }

    const result = await db.appointment.findUnique({
      where: { id: appointmentId },
      include: INCLUDE,
    });

    await notifyAppointmentUpdated(appointmentId, access.companyId);

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

    const access = await authorizeAppointmentAccess(req, id);
    if ("error" in access) return access.error;

    const result = await deleteAppointment(access.appointmentId);
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
