import { getCalendarSettings } from "@/actions/calendar-settings/getCalendarSettings";
import { NextResponse } from "next/server";

/**
 * @swagger
 * /api/calendar-settings:
 *   get:
 *     summary: Get calendar settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Calendar settings
 */
export async function GET() {
  const settings = await getCalendarSettings();
  return NextResponse.json(settings);
}
