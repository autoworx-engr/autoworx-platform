import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * @swagger
 * /api/dashboard/break/stop:
 *   post:
 *     summary: Stop a break for a user
 *     description: Updates the break record to set the break end time.
 *     tags:
 *       - Attendance
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - clockBreakId
 *               - userId
 *             properties:
 *               clockBreakId:
 *                 type: integer
 *                 example: 101
 *                 description: ID of the break record to stop
 *               userId:
 *                 type: integer
 *                 example: 12
 *                 description: ID of the user stopping the break
 *     responses:
 *       200:
 *         description: Break stopped successfully
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
 *                   example: Stopped Break
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
 *                       example: 2026-03-11T12:45:00.000Z
 *       400:
 *         description: Missing required parameters (clockBreakId or userId)
 *       500:
 *         description: Internal server error
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { clockBreakId, userId } = body;

    if (!clockBreakId || !userId) {
      return NextResponse.json(
        { success: false, message: "clockBreakId and userId required" },
        { status: 400 },
      );
    }

    const breakStop = await db.clockBreak.update({
      where: {
        id: clockBreakId,
      },
      data: {
        breakEnd: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Stopped Break",
      data: breakStop,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
