import { NextRequest, NextResponse } from "next/server";
import { addAppointment } from "@/actions/appointment/addAppointment";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";

/**
 * @swagger
 * /api/appointment/create:
 *   post:
 *     summary: Create a new appointment
 *     tags: [Appointment]
 *     security:
 *       - bearerAuth: []
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
 *               title:
 *                 type: string
 *                 example: Vehicle Inspection
 *                 description: Appointment title
 *               date:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *                 example: 2026-02-20T10:00:00.000Z
 *                 description: Appointment start date (ISO format)
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *                 example: 2026-02-22T10:00:00.000Z
 *                 description: Appointment end date for multi-day appointments (ISO format). Optional - omit or set null for single-day appointments.
 *               startTime:
 *                 type: string
 *                 nullable: true
 *                 example: "10:00"
 *                 description: Start time (HH:mm)
 *               endTime:
 *                 type: string
 *                 nullable: true
 *                 example: "11:00"
 *                 description: End time (HH:mm)
 *               assignedUsers:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 example: [2, 3]
 *                 description: List of assigned user IDs
 *               clientId:
 *                 type: integer
 *                 nullable: true
 *                 example: 15
 *                 description: Client ID
 *               vehicleId:
 *                 type: integer
 *                 nullable: true
 *                 example: 8
 *                 description: Vehicle ID
 *               draftEstimate:
 *                 type: string
 *                 nullable: true
 *                 example: "EST-1001"
 *                 description: Draft estimate ID
 *               notes:
 *                 type: string
 *                 nullable: true
 *                 example: Customer requested quick service
 *                 description: Additional notes
 *               confirmationEmailTemplateId:
 *                 type: integer
 *                 nullable: true
 *                 example: 5
 *                 description: Confirmation email template ID
 *               confirmationEmailTemplateStatus:
 *                 type: boolean
 *                 nullable: true
 *                 example: true
 *                 description: Send confirmation email or not
 *               reminderEmailTemplateId:
 *                 type: integer
 *                 nullable: true
 *                 example: 6
 *                 description: Reminder email template ID
 *               reminderEmailTemplateStatus:
 *                 type: boolean
 *                 nullable: true
 *                 example: true
 *                 description: Enable reminder email scheduling
 *               times:
 *                 type: array
 *                 nullable: true
 *                 description: Reminder schedule times
 *                 items:
 *                   type: object
 *                   properties:
 *                     date:
 *                       type: string
 *                       example: "2026-02-19"
 *                     time:
 *                       type: string
 *                       example: "09:00"
 *               timezone:
 *                 type: string
 *                 nullable: true
 *                 example: "Asia/Dhaka"
 *                 description: Appointment timezone
 *     responses:
 *       200:
 *         description: Appointment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Appointment created successfully
 *                 data:
 *                   type: object
 *       400:
 *         description: Validation error / Bad request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               example:
 *                 success: false
 *                 message: Title is required
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               example:
 *                 success: false
 *                 message: Failed to create appointment
 */

export async function POST(req: NextRequest) {
  try {
    const jwtCompanyId = (await getAuthPrincipal(req))?.companyId ?? null;
    const body = await req.json();
    const {
      title,
      date,
      endDate,
      startTime,
      endTime,
      assignedUsers,
      clientId,
      vehicleId,
      serviceCategoryId,
      draftEstimate,
      notes,
      confirmationEmailTemplateId,
      confirmationEmailTemplateStatus,
      reminderEmailTemplateId,
      reminderEmailTemplateStatus,
      times,
      timezone,
      forceUserId,
    } = body;

    let forceCompanyId: number | undefined = body.forceCompanyId;
    if (jwtCompanyId !== null) {
      if (forceCompanyId !== undefined && forceCompanyId !== jwtCompanyId)
        return NextResponse.json(
          { success: false, message: "Forbidden: company mismatch" },
          { status: 403 },
        );
      forceCompanyId = jwtCompanyId;
    }

    // Basic validation (extra safety before Zod)
    if (!title) {
      return NextResponse.json(
        { success: false, message: "Title is required" },
        { status: 400 },
      );
    }

    if (!assignedUsers || !Array.isArray(assignedUsers)) {
      return NextResponse.json(
        { success: false, message: "assignedUsers must be an array" },
        { status: 400 },
      );
    }

    const result = await addAppointment({
      title,
      date,
      endDate: endDate ?? null,
      startTime,
      endTime,
      assignedUsers,
      clientId,
      vehicleId,
      serviceCategoryId,
      draftEstimate: draftEstimate ?? null,
      notes,
      confirmationEmailTemplateId,
      confirmationEmailTemplateStatus,
      reminderEmailTemplateId,
      reminderEmailTemplateStatus,
      times,
      timezone,
      forceCompanyId,
      forceUserId,
    });

    // Handle server action error format (both "error" and "globalError" types)
    if (result?.type === "error" || result?.type === "globalError") {
      return NextResponse.json(
        {
          success: false,
          message: result.message || "Failed to create appointment",
          field: (result as any).field || null,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Appointment created successfully",
        data: result || null,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          (error as Error).message ||
          "Internal server error while creating appointment",
      },
      { status: 500 },
    );
  }
}
