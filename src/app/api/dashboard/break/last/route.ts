import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * @swagger
 * /api/dashboard/break/last:
 *   get:
 *     summary: Get the last break record for a user
 *     description: Fetches the most recent break for the given user, including break start and end time.
 *     tags:
 *       - Attendance
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *           example: 12
 *         description: ID of the user
 *       - in: query
 *         name: timezone
 *         required: true
 *         schema:
 *           type: string
 *           example: "America/New_York"
 *         description: Timezone for date formatting
 *     responses:
 *       200:
 *         description: Last break record for the user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   nullable: true
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
 *                       example: 2026-03-11T12:45:00.000Z
 *       400:
 *         description: Missing required query parameters (userId or timezone)
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
 *                   example: "userId required"
 *       500:
 *         description: Internal server error
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
 *                   example: "Internal server error"
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const userId = Number(searchParams.get("userId"));

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "userId required" },
        { status: 400 },
      );
    }

    const lastClockInOut = await db.clockInOut.findFirst({
      where: {
        userId,
      },
      orderBy: {
        id: "desc",
      },
      include: {
        ClockBreak: true,
      },
    });

    if (!lastClockInOut || lastClockInOut.ClockBreak.length === 0) {
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    const lastBreak =
      lastClockInOut.ClockBreak[lastClockInOut.ClockBreak.length - 1];

    return NextResponse.json({
      success: true,
      data: lastBreak,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
