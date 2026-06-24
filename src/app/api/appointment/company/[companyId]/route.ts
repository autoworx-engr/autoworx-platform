import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { addAppointment } from "@/actions/appointment/addAppointment";

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

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ companyId: string }> },
) {
  try {
    const { companyId: companyIdStr } = await context.params;
    const companyId = Number(companyIdStr);
    if (!companyId || isNaN(companyId)) {
      return NextResponse.json(
        { success: false, message: "Invalid companyId" },
        { status: 400 },
      );
    }

    const { searchParams } = req.nextUrl;
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(
      200,
      Math.max(1, Number(searchParams.get("limit") ?? 50)),
    );
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const userId = searchParams.get("userId")
      ? Number(searchParams.get("userId"))
      : undefined;
    const search = searchParams.get("search")?.trim();

    const where: Prisma.AppointmentWhereInput = { companyId };

    if (startDate && endDate) {
      where.date = {
        gte: new Date(`${startDate}T00:00:00.000Z`),
        lte: new Date(`${endDate}T23:59:59.999Z`),
      };
    }

    if (userId) {
      where.appointmentUsers = { some: { userId } };
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { client: { firstName: { contains: search, mode: "insensitive" } } },
        { client: { lastName: { contains: search, mode: "insensitive" } } },
        { client: { mobile: { contains: search } } },
        { vehicle: { make: { contains: search, mode: "insensitive" } } },
        { vehicle: { model: { contains: search, mode: "insensitive" } } },
        {
          serviceCategory: { name: { contains: search, mode: "insensitive" } },
        },
      ];
    }

    const [total, appointments] = await Promise.all([
      db.appointment.count({ where }),
      db.appointment.findMany({
        where,
        include: INCLUDE,
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const draftEstimateIds = appointments
      .map((a) => a.draftEstimate)
      .filter((id): id is string => !!id);
    let invoiceMap = new Map<string, number>();
    if (draftEstimateIds.length > 0) {
      const invoices = await db.invoice.findMany({
        where: { id: { in: draftEstimateIds } },
        select: { id: true, grandTotal: true },
      });
      invoiceMap = new Map(
        invoices.map((i) => [i.id, Number(i.grandTotal) || 0]),
      );
    }

    return NextResponse.json({
      success: true,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      data: appointments.map((a) => ({
        ...serialize(a),
        invoiceGrandTotal: a.draftEstimate
          ? invoiceMap.get(a.draftEstimate) || 0
          : 0,
      })),
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 },
    );
  }
}

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ companyId: string }> },
) {
  try {
    const { companyId: companyIdStr } = await props.params;
    const companyId = Number(companyIdStr);

    if (!companyId || isNaN(companyId)) {
      return NextResponse.json(
        { success: false, message: "Invalid companyId" },
        { status: 400 },
      );
    }

    const body = await req.json();

    if (!body.title) {
      return NextResponse.json(
        { success: false, message: "Title is required" },
        { status: 400 },
      );
    }

    if (!Array.isArray(body.assignedUsers) || body.assignedUsers.length === 0) {
      return NextResponse.json(
        { success: false, message: "assignedUsers must be a non-empty array" },
        { status: 400 },
      );
    }

    const result = await addAppointment({
      ...body,
      forceCompanyId: companyId,
      forceUserId: body.userId,
      draftEstimate: body.draftEstimate ?? null,
    });

    if (result?.type === "error") {
      return NextResponse.json(
        {
          success: false,
          message: result.message || "Failed to create appointment",
          field: (result as any).field ?? null,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Appointment created successfully",
      data: (result as any)?.data ?? null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Internal server error" },
      { status: 500 },
    );
  }
}
