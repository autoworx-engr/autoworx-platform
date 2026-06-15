import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * @swagger
 * /api/calendar-settings/holidays:
 *   get:
 *     summary: List holidays for the authenticated company
 *     tags: [Calendar]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         required: false
 *         schema: { type: string, example: June }
 *         description: Optional full month name filter (e.g. June)
 *       - in: query
 *         name: year
 *         required: false
 *         schema: { type: integer, example: 2026 }
 *         description: Optional year filter
 *     responses:
 *       200:
 *         description: List of holidays
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: integer, example: 5 }
 *                       companyId: { type: integer, example: 10 }
 *                       date: { type: string, format: date-time, example: 2026-06-15T00:00:00.000Z }
 *                       month: { type: string, example: June }
 *                       year: { type: integer, example: 2026 }
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

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month") || undefined;
    const yearParam = searchParams.get("year");
    const year = yearParam ? Number(yearParam) : undefined;

    const data = await db.holiday.findMany({
      where: { companyId, month, year },
      orderBy: { date: "asc" },
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error fetching holidays:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * @swagger
 * /api/calendar-settings/holidays:
 *   post:
 *     summary: Add holidays for the authenticated company
 *     description: Accepts an array of YYYY-MM-DD date strings. Existing dates are skipped; invalid dates are ignored.
 *     tags: [Calendar]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [dates]
 *             properties:
 *               dates:
 *                 type: array
 *                 items: { type: string, example: "2026-06-15" }
 *                 example: ["2026-06-15", "2026-12-25"]
 *     responses:
 *       200:
 *         description: Holidays saved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: "Holidays saved successfully" }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: integer, example: 5 }
 *                       companyId: { type: integer, example: 10 }
 *                       date: { type: string, format: date-time, example: "2026-06-15T00:00:00.000Z" }
 *                       month: { type: string, example: "June" }
 *                       year: { type: integer, example: 2026 }
 *       400:
 *         description: dates must be a non-empty array / No valid dates provided
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function POST(req: NextRequest) {
  try {
    const companyId = (await getAuthPrincipal(req))?.companyId ?? null;
    if (companyId === null) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await req.json();
    const dates: string[] = body?.dates;

    if (!Array.isArray(dates) || dates.length === 0) {
      return NextResponse.json(
        { success: false, message: "dates must be a non-empty array" },
        { status: 400 },
      );
    }

    const parsed = [];
    for (const raw of dates) {
      const dt = new Date(`${raw}T00:00:00Z`);
      if (isNaN(dt.getTime())) continue;
      parsed.push({
        date: dt.toISOString(),
        month: MONTH_NAMES[dt.getUTCMonth()],
        year: dt.getUTCFullYear(),
      });
    }

    const unique = Array.from(new Map(parsed.map((p) => [p.date, p])).values());

    if (unique.length === 0) {
      return NextResponse.json(
        { success: false, message: "No valid dates provided" },
        { status: 400 },
      );
    }

    const existing = await db.holiday.findMany({
      where: { companyId, date: { in: unique.map((p) => p.date) } },
      select: { date: true },
    });
    const existingDates = new Set(existing.map((h) => h.date.toISOString()));
    const toCreate = unique.filter((p) => !existingDates.has(p.date));

    if (toCreate.length > 0) {
      await db.holiday.createMany({
        data: toCreate.map((p) => ({ companyId, ...p })),
      });
    }

    const data = await db.holiday.findMany({
      where: { companyId, date: { in: unique.map((p) => p.date) } },
      orderBy: { date: "asc" },
    });

    return NextResponse.json({
      success: true,
      message: "Holidays saved successfully",
      data,
    });
  } catch (error) {
    console.error("Error saving holidays:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
