import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * @swagger
 * /api/appointment/company/{companyId}/calendar-settings:
 *   put:
 *     summary: Create or update calendar settings for a company
 *     description: >
 *       Upserts the calendar configuration (week start, day hours, weekend days).
 *       Creates a new record if none exists, otherwise updates the existing one.
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
 *               - weekStart
 *               - dayStart
 *               - dayEnd
 *               - weekend1
 *               - weekend2
 *             properties:
 *               weekStart:
 *                 type: string
 *                 example: SUNDAY
 *                 description: >
 *                   Day the calendar week starts on.
 *                   One of: SUNDAY, MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY
 *               dayStart:
 *                 type: string
 *                 example: "08:00"
 *                 description: Working day start time in HH:mm
 *               dayEnd:
 *                 type: string
 *                 example: "18:00"
 *                 description: Working day end time in HH:mm
 *               weekend1:
 *                 type: string
 *                 example: SATURDAY
 *                 description: First weekend/off day (same enum as weekStart)
 *               weekend2:
 *                 type: string
 *                 example: SUNDAY
 *                 description: Second weekend/off day (same enum as weekStart)
 *     responses:
 *       200:
 *         description: Calendar settings saved (created or updated)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Calendar settings updated successfully }
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: integer, example: 3 }
 *                     companyId: { type: integer, example: 10 }
 *                     weekStart: { type: string, example: SUNDAY }
 *                     dayStart: { type: string, example: "08:00" }
 *                     dayEnd: { type: string, example: "18:00" }
 *                     weekend1: { type: string, example: SATURDAY }
 *                     weekend2: { type: string, example: SUNDAY }
 *       400:
 *         description: Missing required fields or invalid companyId
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             examples:
 *               invalidId:
 *                 value: { success: false, message: Invalid companyId }
 *               missingWeekStart:
 *                 value: { success: false, message: weekStart is required }
 *               missingDayStart:
 *                 value: { success: false, message: dayStart is required }
 *               missingDayEnd:
 *                 value: { success: false, message: dayEnd is required }
 *               missingWeekend1:
 *                 value: { success: false, message: weekend1 is required }
 *               missingWeekend2:
 *                 value: { success: false, message: weekend2 is required }
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
    const { weekStart, dayStart, dayEnd, weekend1, weekend2 } = body;

    for (const [key, val] of [
      ["weekStart", weekStart],
      ["dayStart", dayStart],
      ["dayEnd", dayEnd],
      ["weekend1", weekend1],
      ["weekend2", weekend2],
    ] as [string, unknown][]) {
      if (!val) {
        return NextResponse.json(
          { success: false, message: `${key} is required` },
          { status: 400 },
        );
      }
    }

    const data = await db.calendarSettings.upsert({
      where: { companyId },
      update: { weekStart, dayStart, dayEnd, weekend1, weekend2 },
      create: { companyId, weekStart, dayStart, dayEnd, weekend1, weekend2 },
    });

    return NextResponse.json({
      success: true,
      message: "Calendar settings updated successfully",
      data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Internal server error" },
      { status: 500 },
    );
  }
}
