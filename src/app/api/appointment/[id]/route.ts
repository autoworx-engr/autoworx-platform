import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

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
      timezone,
    } = body;

    const updated = await db.appointment.update({
      where: { id: Number(id) },
      data: {
        ...(title !== undefined && { title }),
        ...(date !== undefined && { date: date ? new Date(date) : null }),
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

export async function DELETE(_req: NextRequest, context: Ctx) {
  try {
    const { id } = await context.params;
    await db.appointment.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true, message: "Appointment deleted" });
  } catch {
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 },
    );
  }
}
