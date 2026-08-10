import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

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
 *               - userId
 *             properties:
 *               clockInOutId:
 *                 type: integer
 *                 example: 55
 *                 description: ID of the clock-in record
 *               userId:
 *                 type: integer
 *                 example: 12
 *                 description: User ID starting the break
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
 *         description: Missing required parameters (clockInOutId or userId)
 *       500:
 *         description: Internal server error
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { clockInOutId, userId } = body;

    if (!clockInOutId || !userId) {
      return NextResponse.json(
        { success: false, message: "clockInOutId and userId required" },
        { status: 400 },
      );
    }

    const breakStart = await db.clockBreak.create({
      data: {
        clockInOutId,
        breakStart: new Date(),
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
