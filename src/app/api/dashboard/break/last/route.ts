import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { isCompanyToday, resolveCompanyTimezone } from "@/lib/companyTime";

/**
 * @swagger
 * /api/dashboard/break/last:
 *   get:
 *     summary: Get today's last break record for a user
 *     description: >-
 *       Fetches the authenticated user's most recent break, including break
 *       start and end time. Scoped to the company's current calendar day —
 *       returns `data: null` when the latest break did not start today, so a
 *       previous day's break never leaks into today's dashboard.
 *     tags:
 *       - Attendance
 *     parameters:
 *       - in: query
 *         name: timezone
 *         required: false
 *         schema:
 *           type: string
 *           example: "America/New_York"
 *         description: >-
 *           Fallback IANA timezone. The company's configured timezone takes
 *           precedence; this is only used when the company has none set.
 *     responses:
 *       200:
 *         description: Today's last break record, or null when there is none
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
 *       401:
 *         description: Unauthorized - missing or invalid auth principal
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
    const principal = await getAuthPrincipal(req);
    if (!principal) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }
    const userId = principal.userId;

    const { searchParams } = new URL(req.url);
    const timezone = searchParams.get("timezone");

    const lastClockInOut = await db.clockInOut.findFirst({
      where: {
        userId,
      },
      orderBy: {
        id: "desc",
      },
      include: {
        ClockBreak: { orderBy: { id: "asc" } },
      },
    });

    if (!lastClockInOut || lastClockInOut.ClockBreak.length === 0) {
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    const companyTimezone = await resolveCompanyTimezone(
      principal.companyId,
      timezone ?? lastClockInOut.timezone,
    );

    // The most recent ClockInOut may be days old. Its last break is only the
    // *current* break when it started on today's company date.
    const lastBreak =
      lastClockInOut.ClockBreak[lastClockInOut.ClockBreak.length - 1];

    if (!isCompanyToday(lastBreak.breakStart, companyTimezone)) {
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

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
