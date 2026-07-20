import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { addAppointment } from "@/actions/appointment/addAppointment";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { buildWordSearchAnd } from "@/lib/wordSearch";

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

/**
 * @swagger
 * components:
 *   schemas:
 *     AppointmentAssignedUser:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         appointmentId:
 *           type: integer
 *         userId:
 *           type: integer
 *         eventId:
 *           type: string
 *           nullable: true
 *         user:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *             firstName:
 *               type: string
 *               nullable: true
 *             lastName:
 *               type: string
 *               nullable: true
 *             employeeType:
 *               type: string
 *               nullable: true
 *
 *     AppointmentClient:
 *       type: object
 *       nullable: true
 *       properties:
 *         id:
 *           type: integer
 *         firstName:
 *           type: string
 *           nullable: true
 *         lastName:
 *           type: string
 *           nullable: true
 *         email:
 *           type: string
 *           nullable: true
 *         mobile:
 *           type: string
 *           nullable: true
 *         countryCode:
 *           type: string
 *           nullable: true
 *         photo:
 *           type: string
 *           nullable: true
 *
 *     AppointmentVehicle:
 *       type: object
 *       nullable: true
 *       properties:
 *         id:
 *           type: integer
 *         year:
 *           type: integer
 *           nullable: true
 *         make:
 *           type: string
 *           nullable: true
 *         model:
 *           type: string
 *           nullable: true
 *
 *     AppointmentServiceCategory:
 *       type: object
 *       nullable: true
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         color:
 *           type: string
 *           nullable: true
 *
 *     AppointmentListItem:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         title:
 *           type: string
 *         date:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         endDate:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         startTime:
 *           type: string
 *           nullable: true
 *         endTime:
 *           type: string
 *           nullable: true
 *         companyId:
 *           type: integer
 *         userId:
 *           type: integer
 *         clientId:
 *           type: integer
 *           nullable: true
 *         vehicleId:
 *           type: integer
 *           nullable: true
 *         serviceCategoryId:
 *           type: integer
 *           nullable: true
 *         draftEstimate:
 *           type: string
 *           nullable: true
 *         notes:
 *           type: string
 *           nullable: true
 *         invoiceGrandTotal:
 *           type: number
 *           description: Grand total of the linked draft estimate invoice, if any (0 otherwise)
 *         confirmationEmailTemplateId:
 *           type: integer
 *           nullable: true
 *         confirmationEmailTemplateStatus:
 *           type: boolean
 *         reminderEmailTemplateId:
 *           type: integer
 *           nullable: true
 *         reminderEmailTemplateStatus:
 *           type: boolean
 *         googleEventId:
 *           type: string
 *           nullable: true
 *         timezone:
 *           type: string
 *           nullable: true
 *         createdBy:
 *           type: string
 *           enum: [user, sales_agent]
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         appointmentUsers:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/AppointmentAssignedUser'
 *         client:
 *           $ref: '#/components/schemas/AppointmentClient'
 *         vehicle:
 *           $ref: '#/components/schemas/AppointmentVehicle'
 *         serviceCategory:
 *           $ref: '#/components/schemas/AppointmentServiceCategory'
 *
 *     AppointmentCompanyPagination:
 *       type: object
 *       properties:
 *         total:
 *           type: integer
 *           example: 42
 *         page:
 *           type: integer
 *           example: 1
 *         limit:
 *           type: integer
 *           example: 10
 *         totalPages:
 *           type: integer
 *           example: 5
 *
 *     CreateAppointmentRequest:
 *       type: object
 *       required:
 *         - title
 *         - assignedUsers
 *       properties:
 *         title:
 *           type: string
 *           example: "Oil change"
 *         date:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         endDate:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         startTime:
 *           type: string
 *           nullable: true
 *           example: "10:00"
 *         endTime:
 *           type: string
 *           nullable: true
 *           example: "11:00"
 *         assignedUsers:
 *           type: array
 *           items:
 *             type: integer
 *           minItems: 1
 *           example: [1, 2]
 *         clientId:
 *           type: integer
 *           nullable: true
 *         vehicleId:
 *           type: integer
 *           nullable: true
 *         serviceCategoryId:
 *           type: integer
 *           nullable: true
 *         draftEstimate:
 *           type: string
 *           nullable: true
 *           description: ID of a draft estimate/invoice to link to this appointment
 *         notes:
 *           type: string
 *           nullable: true
 *         confirmationEmailTemplateId:
 *           type: integer
 *           nullable: true
 *         confirmationEmailTemplateStatus:
 *           type: boolean
 *         reminderEmailTemplateId:
 *           type: integer
 *           nullable: true
 *         reminderEmailTemplateStatus:
 *           type: boolean
 *         times:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *               time:
 *                 type: string
 *         timezone:
 *           type: string
 *           nullable: true
 *         userId:
 *           type: integer
 *           description: Creator user ID (forced as the appointment's userId)
 *
 *     CreateAppointmentResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: Appointment created successfully
 *         data:
 *           type: object
 *           nullable: true
 */

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

/**
 * @swagger
 * /api/appointment/company/{companyId}:
 *   get:
 *     summary: List appointments for a company
 *     description: >
 *       Returns a paginated list of appointments belonging to the given company. Admin/Manager/Sales
 *       users see all company appointments; other roles are scoped to appointments they created or
 *       are assigned to. Supports filtering by date range and free-text search (title, client
 *       name/mobile, vehicle make/model, service category name).
 *     tags:
 *       - Appointment
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *         description: Company ID (must match the authenticated principal's company)
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           maximum: 200
 *         description: Page size, capped at 200. When omitted, all matching appointments are returned.
 *       - in: query
 *         name: startDate
 *         required: false
 *         schema:
 *           type: string
 *           example: "2026-06-01"
 *         description: Filter to appointments overlapping [startDate, endDate]. Requires endDate.
 *       - in: query
 *         name: endDate
 *         required: false
 *         schema:
 *           type: string
 *           example: "2026-06-30"
 *         description: Filter to appointments overlapping [startDate, endDate]. Requires startDate.
 *       - in: query
 *         name: search
 *         required: false
 *         schema:
 *           type: string
 *         description: >
 *           Word-based, case-insensitive search across title, client name/mobile, vehicle
 *           make/model, and service category name. Each typed word (split on whitespace) must
 *           match at least one of these fields (in any order), so "John Doe" and "Doe John" both
 *           match a client named John Doe.
 *     responses:
 *       200:
 *         description: Paginated appointments list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 pagination:
 *                   $ref: '#/components/schemas/AppointmentCompanyPagination'
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AppointmentListItem'
 *       400:
 *         description: Invalid companyId
 *       401:
 *         description: Unauthorized - missing or invalid auth principal
 *       403:
 *         description: Forbidden - companyId does not match the authenticated principal
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Server error
 */
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

    // Word-based, order/whitespace-insensitive search (mirrors
    // estimate/[companyId]/route.ts): each typed word just needs to appear in
    // ANY of these fields, so "John Doe", "Doe John", or extra spaces all
    // still match a client whose name is split across firstName/lastName.
    const searchAnd = buildWordSearchAnd(search, [
      "title",
      "client.firstName",
      "client.lastName",
      "client.mobile",
      "vehicle.make",
      "vehicle.model",
      "serviceCategory.name",
    ]);
    if (searchAnd) {
      andConditions.push(...searchAnd);
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    const [total, appointments] = await Promise.all([
      db.appointment.count({ where }),
      db.appointment.findMany({
        where,
        include: INCLUDE,
        // Search results are ordered newest-created-first (matches the calendar
        // search); the calendar grid keeps chronological date order.
        orderBy: search
          ? [{ createdAt: "desc" }]
          : [{ date: "asc" }, { startTime: "asc" }],
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

/**
 * @swagger
 * /api/appointment/company/{companyId}:
 *   post:
 *     summary: Create an appointment
 *     description: >
 *       Creates a new appointment for the given company, assigns the given users, and (if
 *       draftEstimate is provided and doesn't already exist) creates a backing draft estimate
 *       invoice in the company's "Pending" shop column.
 *     tags:
 *       - Appointment
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *         description: Company ID (forced as the appointment's companyId)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateAppointmentRequest'
 *     responses:
 *       200:
 *         description: Appointment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreateAppointmentResponse'
 *       400:
 *         description: Invalid companyId, missing title/assignedUsers, or validation/creation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                 field:
 *                   type: string
 *                   nullable: true
 *       500:
 *         description: Internal server error
 */
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
