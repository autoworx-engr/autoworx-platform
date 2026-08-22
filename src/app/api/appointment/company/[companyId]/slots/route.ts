import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAvailableSlots } from "@/actions/appointment/getAvailableSlots";

/**
 * @swagger
 * /api/appointment/company/{companyId}/slots:
 *   get:
 *     summary: Get available appointment slots for a shop on a specific date
 *     description: >
 *       Returns time slots for the given shop and date.
 *       The shop must belong to the specified company.
 *       Each slot shows whether it can accept a new booking based on
 *       existing appointments, active holds, and the shop's stacking limit.
 *     tags: [Appointment]
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *           example: 10
 *         description: Company ID
 *       - in: query
 *         name: shopId
 *         required: true
 *         schema:
 *           type: integer
 *           example: 5
 *         description: Shop ID (must belong to the company)
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           example: "2026-03-20"
 *         description: Target date in YYYY-MM-DD format
 *       - in: query
 *         name: duration
 *         required: false
 *         schema:
 *           type: integer
 *           example: 60
 *         description: >
 *           Service duration in minutes. Filters out slots where the service
 *           would run past closing time. Defaults to the shop's slot interval.
 *     responses:
 *       200:
 *         description: Slot list for the given date
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 date:
 *                   type: string
 *                   format: date-time
 *                   example: "2026-03-20T00:00:00.000Z"
 *                 slots:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       time:
 *                         type: string
 *                         example: "09:00"
 *                         description: Slot time in HH:mm (company timezone)
 *                       available:
 *                         type: boolean
 *                         example: true
 *       400:
 *         description: Missing or invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             examples:
 *               invalidCompany:
 *                 value: { success: false, message: Invalid companyId }
 *               missingShopId:
 *                 value: { success: false, message: shopId is required }
 *               invalidShopId:
 *                 value: { success: false, message: shopId must be a valid integer }
 *               missingDate:
 *                 value: { success: false, message: "date is required (YYYY-MM-DD)" }
 *               shopNotOwned:
 *                 value: { success: false, message: Shop does not belong to this company }
 *       404:
 *         description: Shop booking settings not configured
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               error: Settings not found.
 *       500:
 *         description: Internal server error
 */

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ companyId: string }> },
) {
  try {
    const { companyId: companyIdStr } = await props.params;
    const companyId = Number(companyIdStr);

    if (!companyId || isNaN(companyId)) {
      return NextResponse.json(
        { success: false, message: "Invalid companyId" },
        { status: 400 },
      );
    }

    const { searchParams } = new URL(req.url);
    const shopIdParam = searchParams.get("shopId");
    const date = searchParams.get("date");
    const durationParam = searchParams.get("duration");

    if (!shopIdParam) {
      return NextResponse.json(
        { success: false, message: "shopId is required" },
        { status: 400 },
      );
    }

    const shopId = Number(shopIdParam);
    if (isNaN(shopId) || shopId <= 0) {
      return NextResponse.json(
        { success: false, message: "shopId must be a valid integer" },
        { status: 400 },
      );
    }

    if (!date) {
      return NextResponse.json(
        { success: false, message: "date is required (YYYY-MM-DD)" },
        { status: 400 },
      );
    }

    const shop = await db.shop.findFirst({ where: { id: shopId, companyId } });
    if (!shop) {
      return NextResponse.json(
        { success: false, message: "Shop does not belong to this company" },
        { status: 400 },
      );
    }

    const duration = durationParam ? Number(durationParam) : undefined;
    const result = await getAvailableSlots(shopId, date, duration);

    if (!result.success) {
      const status = result.error === "Settings not found." ? 404 : 500;
      return NextResponse.json(result, { status });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Internal server error" },
      { status: 500 },
    );
  }
}
