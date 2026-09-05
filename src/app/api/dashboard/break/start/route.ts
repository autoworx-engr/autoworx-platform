import { NextRequest, NextResponse } from "next/server";
import { companyNow } from "@/lib/companyTime";
import { db } from "@/lib/db";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { isHourlyEmployee } from "@/lib/employeeSalaryType";

/**
 * @swagger
 * /api/dashboard/break/start:
 *   post:
 *     summary: Start a break for a user
 *     description: Creates a new break entry associated with a user's active clock-in record.
 *     tags:
 *       - Attendance
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - clockInOutId
 *             properties:
 *               clockInOutId:
 *                 type: integer
 *                 example: 55
 *                 description: ID of the clock-in record
 *               timezone:
 *                 type: string
 *                 example: America/New_York
 *                 description: Optional company timezone used to stamp breakStart/createdAt/updatedAt. Falls back to the timezone stored on the clock-in record.
 *     responses:
 *       200:
 *         description: Break started successfully
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
 *                   example: Break Successful
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 101
 *                     clockInOutId:
 *                       type: integer
 *                       example: 55
 *                     breakStart:
 *                       type: string
 *                       format: date-time
 *                       example: 2026-03-11T12:30:00.000Z
 *                     breakEnd:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                       example: null
 *       400:
 *         description: Missing required parameter (clockInOutId)
 *       401:
 *         description: Unauthorized - missing or invalid auth principal
 *       404:
 *         description: Clock-in record not found
 *       500:
 *         description: Internal server error
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { clockInOutId, timezone } = body;

    if (!clockInOutId) {
      return NextResponse.json(
        { success: false, message: "clockInOutId required" },
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
    const userId = principal.userId;

    const parent = await db.clockInOut.findUnique({
      where: { id: clockInOutId },
      select: { timezone: true, userId: true },
    });

    if (!parent || parent.userId !== userId) {
      return NextResponse.json(
        { success: false, message: "Clock-in record not found" },
        { status: 404 },
      );
    }

    if (!(await isHourlyEmployee(userId, principal.companyId))) {
      return NextResponse.json(
        {
          success: false,
          message: "Breaks are only available for hourly employees.",
        },
        { status: 403 },
      );
    }

    const now = companyNow(timezone || parent?.timezone);

    const breakStart = await db.clockBreak.create({
      data: {
        clockInOutId,
        breakStart: now,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Break Successful",
      data: breakStart,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
