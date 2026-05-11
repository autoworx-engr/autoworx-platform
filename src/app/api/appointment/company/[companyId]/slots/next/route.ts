import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getNextAvailableAppointment } from "@/actions/appointment/getAvailableSlots";

/**
 * @swagger
 * /api/appointment/company/{companyId}/slots/next:
 *   get:
 *     summary: Find the next available appointment date for a shop
 *     description: >
 *       Searches up to 30 days ahead (starting today, in the company's timezone)
 *       and returns the first date that has at least one available slot.
 *       The shop must belong to the specified company.
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
 *         name: duration
 *         required: false
 *         schema:
 *           type: integer
 *           example: 60
 *         description: >
 *           Service duration in minutes. Filters out slots that can't
 *           accommodate the full duration before closing.
 *           Defaults to the shop's slot interval.
 *     responses:
 *       200:
 *         description: Next available date and slots found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 date:
 *                   type: string
 *                   format: date-time
 *                   example: "2026-03-21T00:00:00.000Z"
 *                   description: First date with an available slot
 *                 slots:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       time:
 *                         type: string
 *                         example: "10:00"
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
 *               shopNotOwned:
 *                 value: { success: false, message: Shop does not belong to this company }
 *       404:
 *         description: No available appointments in the next 30 days
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               error: No available appointments.
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

    const shop = await db.shop.findFirst({ where: { id: shopId, companyId } });
    if (!shop) {
      return NextResponse.json(
        { success: false, message: "Shop does not belong to this company" },
        { status: 400 },
      );
    }

    const duration = durationParam ? Number(durationParam) : undefined;
    const result = await getNextAvailableAppointment(shopId, duration);

    if (!result.success) {
      return NextResponse.json(result, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Internal server error" },
      { status: 500 },
    );
  }
}
