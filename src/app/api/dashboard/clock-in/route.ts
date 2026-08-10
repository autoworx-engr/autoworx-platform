import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import moment from "moment-timezone";

/**
 * @swagger
 * /api/dashboard/clock-in:
 *   post:
 *     summary: Clock In User
 *     description: Creates a new clock-in record for a user and schedules an automatic clock-out.
 *     tags:
 *       - Attendance
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - timezone
 *             properties:
 *               userId:
 *                 type: integer
 *                 example: 12
 *                 description: User ID
 *               timezone:
 *                 type: string
 *                 example: America/New_York
 *                 description: User timezone
 *     responses:
 *       200:
 *         description: Clock in successful
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
 *                   example: Clocked In
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
 *                     timezone:
 *                       type: string
 *                       example: America/New_York
 *       400:
 *         description: userId and timezone are required
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { userId, timezone } = body;

    if (!userId || !timezone) {
      return NextResponse.json(
        {
          success: false,
          message: "userId and timezone are required",
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

    const clockedIn = await db.clockInOut.create({
      data: {
        userId: user.id,
        companyId: user.companyId,
        clockIn: new Date(),
        timezone,
      },
    });

    // schedule auto clockout
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/auto-clockout/schedule`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            clockInOutId: clockedIn.id,
            userId: user.id,
            companyId: user.companyId,
            clockIn: clockedIn.clockIn,
            timezone,
          }),
        },
      );
    } catch (error) {
      console.error("Auto clockout scheduling failed:", error);
    }

    return NextResponse.json({
      success: true,
      message: "Clocked In",
      data: clockedIn,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      { status: 500 },
    );
  }
}

/**
 * @swagger
 * /api/dashboard/clock-in:
 *   get:
 *     summary: Get last clock-in record for user
 *     description: Returns the last clock-in record if it belongs to the current day.
 *     tags:
 *       - Attendance
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         description: User ID
 *         schema:
 *           type: integer
 *           example: 12
 *       - in: query
 *         name: timezone
 *         required: true
 *         description: User timezone
 *         schema:
 *           type: string
 *           example: America/New_York
 *     responses:
 *       200:
 *         description: Last clock-in record fetched
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   nullable: true
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
 *                     timezone:
 *                       type: string
 *                       example: America/New_York
 *                     ClockBreak:
 *                       type: array
 *                       items:
 *                         type: object
 *       400:
 *         description: userId and timezone are required
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const userId = Number(searchParams.get("userId"));
    const timezone = searchParams.get("timezone");

    if (!userId || !timezone) {
      return NextResponse.json(
        {
          success: false,
          message: "userId and timezone are required",
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

    const lastClockInOut = await db.clockInOut.findFirst({
      where: {
        userId: user.id,
        companyId: user.companyId,
      },
      orderBy: {
        id: "desc",
      },
      include: {
        ClockBreak: true,
      },
    });

    if (!lastClockInOut) {
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    const clockInDay = moment(lastClockInOut.clockIn).tz(
      lastClockInOut?.timezone || moment.tz.guess(),
    );

    const now = moment.tz(timezone);

    if (moment(clockInDay).isSame(now, "day")) {
      return NextResponse.json({
        success: true,
        data: lastClockInOut,
      });
    }

    return NextResponse.json({
      success: true,
      data: null,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      { status: 500 },
    );
  }
}
