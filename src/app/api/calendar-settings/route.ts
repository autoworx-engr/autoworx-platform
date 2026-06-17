import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";

/**
 * @swagger
 * /api/calendar-settings:
 *   get:
 *     summary: Get calendar settings for the authenticated company
 *     tags: [Calendar]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Calendar settings (data is null if not configured yet)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     id: { type: integer, example: 3 }
 *                     companyId: { type: integer, example: 10 }
 *                     weekStart: { type: string, example: monday }
 *                     dayStart: { type: string, example: "08:00" }
 *                     dayEnd: { type: string, example: "18:00" }
 *                     weekend1: { type: string, example: saturday }
 *                     weekend2: { type: string, example: sunday }
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function GET(req: NextRequest) {
  try {
    const companyId = (await getAuthPrincipal(req))?.companyId ?? null;
    if (companyId === null) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const data = await db.calendarSettings.findFirst({
      where: { companyId },
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error fetching calendar settings:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * @swagger
 * /api/calendar-settings:
 *   put:
 *     summary: Create or update calendar settings for the authenticated company
 *     description: Upserts the calendar configuration for the company resolved from the Bearer token.
 *     tags: [Calendar]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [weekStart, dayStart, dayEnd, weekend1, weekend2]
 *             properties:
 *               weekStart: { type: string, example: monday }
 *               dayStart: { type: string, example: "08:00" }
 *               dayEnd: { type: string, example: "18:00" }
 *               weekend1: { type: string, example: saturday }
 *               weekend2: { type: string, example: sunday }
 *     responses:
 *       200:
 *         description: Calendar settings saved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: "Calendar settings updated successfully" }
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: integer, example: 3 }
 *                     companyId: { type: integer, example: 10 }
 *                     weekStart: { type: string, example: "monday" }
 *                     dayStart: { type: string, example: "08:00" }
 *                     dayEnd: { type: string, example: "18:00" }
 *                     weekend1: { type: string, example: "saturday" }
 *                     weekend2: { type: string, example: "sunday" }
 *       400:
 *         description: Missing required field
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function PUT(req: NextRequest) {
  try {
    const companyId = (await getAuthPrincipal(req))?.companyId ?? null;
    if (companyId === null) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
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
  } catch (error) {
    console.error("Error updating calendar settings:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
