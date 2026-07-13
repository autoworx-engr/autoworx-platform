import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { addAppointment } from "@/actions/appointment/addAppointment";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";

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

    const principal = await getAuthPrincipal(req);
    if (!principal) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }
    if (companyId !== principal.companyId) {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 },
      );
    }

    const { searchParams } = req.nextUrl;

    const toPositiveInt = (raw: string | null): number | undefined => {
      if (raw == null) return undefined;
      const n = Number(raw);
      return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
    };

    const page = toPositiveInt(searchParams.get("page")) ?? 1;
    const parsedLimit = toPositiveInt(searchParams.get("limit"));
    const limit = parsedLimit ? Math.min(200, parsedLimit) : undefined;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const userId = principal.userId;
    const search = searchParams.get("search")?.trim();

    const dbUser = await db.user.findUnique({
      where: { id: userId },
      select: { employeeType: true },
    });
    const COMPANY_WIDE_ROLES = ["Admin", "Manager", "Sales"];
    const seesAll = dbUser?.employeeType
      ? COMPANY_WIDE_ROLES.includes(dbUser.employeeType)
      : false;

    const where: Prisma.AppointmentWhereInput = { companyId };
    const andConditions: Prisma.AppointmentWhereInput[] = [];

    if (startDate && endDate) {
      const startISO = new Date(`${startDate}T00:00:00.000Z`);
      const endISO = new Date(`${endDate}T23:59:59.999Z`);
      andConditions.push({ date: { lte: endISO } });
      andConditions.push({
        OR: [
          { endDate: null, date: { gte: startISO } },
          { endDate: { gte: startISO } },
        ],
      });
    }

    // Non-privileged roles are scoped to their own appointments (creator OR
    // assignee). Privileged roles skip this entirely.
    if (!seesAll && userId) {
      andConditions.push({
        OR: [{ userId }, { appointmentUsers: { some: { userId } } }],
      });
    }

    if (search) {
      andConditions.push({
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { client: { firstName: { contains: search, mode: "insensitive" } } },
          { client: { lastName: { contains: search, mode: "insensitive" } } },
          { client: { mobile: { contains: search } } },
          { vehicle: { make: { contains: search, mode: "insensitive" } } },
          { vehicle: { model: { contains: search, mode: "insensitive" } } },
          {
            serviceCategory: {
              name: { contains: search, mode: "insensitive" },
            },
          },
        ],
      });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    const [total, appointments] = await Promise.all([
      db.appointment.count({ where }),
      db.appointment.findMany({
        where,
        include: INCLUDE,
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
        ...(limit !== undefined
          ? { skip: (page - 1) * limit, take: limit }
          : {}),
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
        limit: limit ?? total,
        totalPages: limit ? Math.ceil(total / limit) : 1,
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
