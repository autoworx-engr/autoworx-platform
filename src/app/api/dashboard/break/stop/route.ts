import { NextRequest, NextResponse } from "next/server";
import { companyNow } from "@/lib/companyTime";
import { db } from "@/lib/db";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";

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
 *             properties:
 *               clockBreakId:
 *                 type: integer
 *                 example: 101
 *                 description: ID of the break record to stop
 *               timezone:
 *                 type: string
 *                 example: America/New_York
 *                 description: Optional company timezone used to stamp breakEnd/updatedAt. Falls back to the timezone stored on the clock-in record.
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
 *         description: Missing required parameter (clockBreakId)
 *       401:
 *         description: Unauthorized - missing or invalid auth principal
 *       404:
 *         description: Break record not found
 *       500:
 *         description: Internal server error
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { clockBreakId, timezone } = body;

    if (!clockBreakId) {
      return NextResponse.json(
        { success: false, message: "clockBreakId required" },
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

    const existing = await db.clockBreak.findUnique({
      where: { id: clockBreakId },
      select: { clockInOut: { select: { timezone: true, userId: true } } },
    });

    if (!existing || existing.clockInOut?.userId !== userId) {
      return NextResponse.json(
        { success: false, message: "Break record not found" },
        { status: 404 },
      );
    }

    const now = companyNow(timezone || existing?.clockInOut?.timezone);

    const breakStop = await db.clockBreak.update({
      where: {
        id: clockBreakId,
      },
      data: {
        breakEnd: now,
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
