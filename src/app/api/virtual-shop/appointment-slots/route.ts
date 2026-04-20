import { NextResponse } from "next/server";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import {
  getAvailableSlots,
  getNextAvailableAppointment,
} from "@/actions/appointment/getAvailableSlots";

/**
 * @swagger
 * /api/virtual-shop/appointment-slots:
 *   get:
 *     summary: Get available appointment slots for a shop
 *     description: Fetch timeslots for appointments either by specific date or get the 'Next Available' appointment slots. Pre-filled with test data so you can "Try it out" directly.
 *     tags:
 *       - Virtual Shop Appointments
 *     parameters:
 *       - in: query
 *         name: shopId
 *         required: true
 *         schema:
 *           type: integer
 *           default: 1
 *         description: ID of the shop to check availability for.
 *       - in: query
 *         name: date
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *           default: "2024-11-20"
 *         description: Date to check available slots (YYYY-MM-DD). Required unless nextAvailable is true.
 *       - in: query
 *         name: nextAvailable
 *         required: false
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Set to true to find the first available future date with open slots.
 *     responses:
 *       200:
 *         description: Successfully fetched available time slots
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 date:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-11-20T00:00:00.000Z"
 *                 availableSlots:
 *                   type: array
 *                   items:
 *                     type: string
 *                     example: "08:30"
 *       400:
 *         description: Error response
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
 *                 errorDetails:
 *                   type: object
 *       500:
 *         description: Internal server error
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shopIdParam = searchParams.get("shopId");
    const dateParam = searchParams.get("date");
    const nextAvailable = searchParams.get("nextAvailable");

    if (!shopIdParam) {
      return NextResponse.json(
        { success: false, error: "shopId is required" },
        { status: 400 },
      );
    }

    const shopId = parseInt(shopIdParam, 10);
    if (isNaN(shopId)) {
      return NextResponse.json(
        { success: false, error: "Invalid shopId" },
        { status: 400 },
      );
    }

    const durationParam = searchParams.get("duration");
    const duration = durationParam ? parseInt(durationParam, 10) : undefined;

    // Handle "Next Available" lookup
    if (nextAvailable === "true") {
      const result = await getNextAvailableAppointment(shopId, duration);
      return NextResponse.json(result);
    }

    // Handle specific date lookup
    if (!dateParam) {
      return NextResponse.json(
        {
          success: false,
          error: "date is required unless nextAvailable is true",
        },
        { status: 400 },
      );
    }

    const result = await getAvailableSlots(shopId, dateParam, duration);
    return NextResponse.json(result);
  } catch (error: any) {
    const formattedError = errorHandler(error);
    return NextResponse.json(
      {
        success: false,
        message: formattedError.message,
        errorDetails: formattedError,
      },
      { status: formattedError.statusCode },
    );
  }
}
