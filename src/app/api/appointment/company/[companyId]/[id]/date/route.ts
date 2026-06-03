import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assignAppointmentDate } from "@/actions/appointment/assignAppointmentDate";

/**
 * @swagger
 * /api/appointment/company/{companyId}/{id}/date:
 *   put:
 *     summary: Assign or update the date and time of an appointment
 *     description: >
 *       Validates the appointment belongs to the given company, then assigns a
 *       date/time and syncs to Google Calendar if a token exists.
 *     tags: [Appointment]
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *           example: 10
 *         description: Company ID
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 42
 *         description: Appointment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - date
 *               - timezone
 *             properties:
 *               date:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-03-20T00:00:00.000Z"
 *                 description: New appointment date (ISO 8601 or YYYY-MM-DD)
 *               startTime:
 *                 type: string
 *                 nullable: true
 *                 example: "09:00"
 *                 description: Start time in HH:mm
 *               endTime:
 *                 type: string
 *                 nullable: true
 *                 example: "10:00"
 *                 description: End time in HH:mm
 *               timezone:
 *                 type: string
 *                 example: "America/New_York"
 *                 description: IANA timezone identifier
 *     responses:
 *       200:
 *         description: Date assigned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Appointment date assigned successfully }
 *                 data: { type: object, description: Updated appointment with users and client }
 *       400:
 *         description: Missing fields or appointment not in this company
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: false }
 *                 message: { type: string }
 *             examples:
 *               invalidId:
 *                 value: { success: false, message: Invalid companyId or id }
 *               notFound:
 *                 value: { success: false, message: Appointment not found for this company }
 *               missingDate:
 *                 value: { success: false, message: date is required }
 *               missingTimezone:
 *                 value: { success: false, message: timezone is required }
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: Internal server error
 */

export async function PUT(
  req: NextRequest,
  props: { params: Promise<{ companyId: string; id: string }> },
) {
  try {
    const params = await props.params;
    const companyId = Number(params.companyId);
    const id = Number(params.id);

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
    const { date, startTime = null, endTime = null, timezone } = body;

    if (!date) {
      return NextResponse.json(
        { success: false, message: "date is required" },
        { status: 400 },
      );
    }

    if (!timezone) {
      return NextResponse.json(
        { success: false, message: "timezone is required" },
        { status: 400 },
      );
    }

    const result = await assignAppointmentDate({
      id,
      date,
      startTime,
      endTime,
      timezone,
    });

    if (result?.type === "error") {
      return NextResponse.json(
        { success: false, message: "Failed to assign appointment date" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Appointment date assigned successfully",
      data: (result as any)?.data ?? null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Internal server error" },
      { status: 500 },
    );
  }
}
