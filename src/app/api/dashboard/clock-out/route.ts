import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

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
 *               - userId
 *             properties:
 *               clockInOutId:
 *                 type: integer
 *                 example: 55
 *                 description: ID of the clock-in record
 *               userId:
 *                 type: integer
 *                 example: 12
 *                 description: User ID
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
 *         description: clockInOutId and userId are required
 *       404:
 *         description: User not found or clock-in record not found
 *       500:
 *         description: Internal server error
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { clockInOutId, userId } = body;

    if (!clockInOutId || !userId) {
      return NextResponse.json(
        {
          success: false,
          message: "clockInOutId and userId are required",
        },
        { status: 400 },
      );
    }

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

    const clockedOut = await db.clockInOut.update({
      where: {
        id: clockInOutId,
        userId: user.id,
        companyId: user.companyId,
      },
      data: {
        clockOut: new Date(),
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
          breakEnd: new Date(),
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
