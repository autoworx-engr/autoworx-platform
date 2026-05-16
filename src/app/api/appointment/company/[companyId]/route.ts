import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { addAppointment } from "@/actions/appointment/addAppointment";
import { getCompanyIdFromBearer } from "@/lib/mobileAuth";
import { writeAuditLog } from "@/lib/copilot/audit";

/**
 * @swagger
 * /api/appointment/company/{companyId}:
 *   get:
 *     summary: List all appointments for a company
 *     tags: [Appointment]
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *           example: 10
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 10
 *     responses:
 *       200:
 *         description: Paginated appointment list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total: { type: integer, example: 50 }
 *                     page: { type: integer, example: 1 }
 *                     limit: { type: integer, example: 10 }
 *                     totalPages: { type: integer, example: 5 }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: Invalid companyId
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: Invalid companyId
 *       500:
 *         description: Internal server error
 *
 *   post:
 *     summary: Create a new appointment for a company
 *     tags: [Appointment]
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *           example: 10
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - assignedUsers
 *               - userId
 *             properties:
 *               title:
 *                 type: string
 *                 example: Vehicle Inspection
 *               userId:
 *                 type: integer
 *                 example: 3
 *                 description: ID of the user creating the appointment
 *               date:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *                 example: "2026-03-20T10:00:00.000Z"
 *               startTime:
 *                 type: string
 *                 nullable: true
 *                 example: "10:00"
 *               endTime:
 *                 type: string
 *                 nullable: true
 *                 example: "11:00"
 *               assignedUsers:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 example: [2, 3]
 *               clientId:
 *                 type: integer
 *                 nullable: true
 *                 example: 15
 *               vehicleId:
 *                 type: integer
 *                 nullable: true
 *                 example: 8
 *               serviceCategoryId:
 *                 type: integer
 *                 nullable: true
 *                 example: 3
 *               draftEstimate:
 *                 type: string
 *                 nullable: true
 *                 example: "EST-1001"
 *               notes:
 *                 type: string
 *                 nullable: true
 *                 example: Customer requested morning slot
 *               confirmationEmailTemplateId:
 *                 type: integer
 *                 nullable: true
 *                 example: 5
 *               confirmationEmailTemplateStatus:
 *                 type: boolean
 *                 nullable: true
 *                 example: true
 *               reminderEmailTemplateId:
 *                 type: integer
 *                 nullable: true
 *                 example: 6
 *               reminderEmailTemplateStatus:
 *                 type: boolean
 *                 nullable: true
 *                 example: false
 *               times:
 *                 type: array
 *                 nullable: true
 *                 items:
 *                   type: object
 *                   properties:
 *                     date: { type: string, example: "2026-03-19" }
 *                     time: { type: string, example: "09:00" }
 *               timezone:
 *                 type: string
 *                 nullable: true
 *                 example: "America/New_York"
 *     responses:
 *       200:
 *         description: Appointment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Appointment created successfully }
 *                 data: { type: object }
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: Title is required
 *       500:
 *         description: Internal server error
 */

export async function GET(
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

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.max(1, Number(searchParams.get("limit") || 10));
    const skip = (page - 1) * limit;

    const where = { companyId };

    const [appointments, total] = await Promise.all([
      db.appointment.findMany({
        where,
        include: {
          appointmentUsers: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true } },
            },
          },
          client: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          vehicle: {
            select: { id: true, year: true, make: true, model: true },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      db.appointment.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      data: appointments,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ companyId: string }> },
) {
  const startTime = Date.now();
  try {
    const { companyId: companyIdStr } = await props.params;
    const companyId = Number(companyIdStr);

    if (!companyId || isNaN(companyId)) {
      return NextResponse.json(
        { success: false, message: "Invalid companyId" },
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
      await writeAuditLog({
        actor: "api",
        action: "appointment.create",
        userId: typeof body.userId === "number" ? body.userId : 0,
        companyId,
        resourceType: "Appointment",
        success: false,
        errorMessage: result.message ?? "Failed to create appointment",
        latencyMs: Date.now() - startTime,
      });
      return NextResponse.json(
        {
          success: false,
          message: result.message || "Failed to create appointment",
          field: (result as any).field ?? null,
        },
        { status: 400 },
      );
    }

    await writeAuditLog({
      actor: "api",
      action: "appointment.create",
      userId: typeof body.userId === "number" ? body.userId : 0,
      companyId,
      resourceType: "Appointment",
      resourceId: String((result as any)?.data?.id ?? ""),
      output: (result as any)?.data,
      success: true,
      latencyMs: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      message: "Appointment created successfully",
      data: (result as any)?.data ?? null,
    });
  } catch (error: any) {
    await writeAuditLog({
      actor: "api",
      action: "appointment.create",
      userId: 0,
      companyId: 0,
      success: false,
      errorMessage: error?.message ?? "Unknown error",
      latencyMs: Date.now() - startTime,
    });
    return NextResponse.json(
      { success: false, message: error?.message || "Internal server error" },
      { status: 500 },
    );
  }
}
