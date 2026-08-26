import { NextRequest, NextResponse } from "next/server";
import { companyNow } from "@/lib/companyTime";
import { db } from "@/lib/db";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";

/**
 * @swagger
 * /api/dashboard/clock-out:
 *   post:
 *     summary: Clock Out User
 *     description: Updates the clock-out time for a user’s active clock-in record and closes any active breaks.
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
 *                 description: Optional company timezone used to stamp clockOut/updatedAt. Falls back to the timezone stored on the clock-in record.
 *     responses:
 *       200:
 *         description: User clocked out successfully
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
 *                   example: Clocked Out
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 55
 *                     userId:
 *                       type: integer
 *                       example: 12
 *                     companyId:
 *                       type: integer
 *                       example: 4
 *                     clockIn:
 *                       type: string
 *                       format: date-time
 *                       example: 2026-03-11T09:30:00.000Z
 *                     clockOut:
 *                       type: string
 *                       format: date-time
 *                       example: 2026-03-11T17:30:00.000Z
 *                     ClockBreak:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 101
 *                           breakStart:
 *                             type: string
 *                             format: date-time
 *                             example: 2026-03-11T12:30:00.000Z
 *                           breakEnd:
 *                             type: string
 *                             format: date-time
 *                             example: 2026-03-11T13:00:00.000Z
 *       400:
 *         description: clockInOutId is required
 *       401:
 *         description: Unauthorized - missing or invalid auth principal
 *       404:
 *         description: User not found or clock-in record not found
 *       500:
 *         description: Internal server error
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { clockInOutId, timezone } = body;

    if (!clockInOutId) {
      return NextResponse.json(
        {
          success: false,
          message: "clockInOutId is required",
        },
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

    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found",
        },
        { status: 404 },
      );
    }

    const existing = await db.clockInOut.findUnique({
      where: { id: clockInOutId },
      select: { timezone: true },
    });

    const now = companyNow(timezone || existing?.timezone);

    const clockedOut = await db.clockInOut.update({
      where: {
        id: clockInOutId,
        userId: user.id,
        companyId: user.companyId,
      },
      data: {
        clockOut: now,
      },
      include: {
        ClockBreak: true,
      },
    });

    const breaksLength = clockedOut?.ClockBreak?.length - 1;
    const lastBreakId = clockedOut.ClockBreak[breaksLength]?.id;

    if (
      clockedOut?.ClockBreak[breaksLength]?.id &&
      !clockedOut.ClockBreak[clockedOut.ClockBreak.length - 1]?.breakEnd
    ) {
      await db.clockBreak.update({
        where: {
          id: lastBreakId,
        },
        data: {
          breakEnd: now,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Clocked Out",
      data: clockedOut,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Internal server error",
      },
      { status: 500 },
    );
  }
}
