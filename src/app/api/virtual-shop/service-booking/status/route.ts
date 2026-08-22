import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";

/**
 * @swagger
 * /api/virtual-shop/service-booking/status:
 *   get:
 *     summary: Get service booking status counts
 *     description: Retrieve an array of all possible service booking statuses along with the total count of bookings (estimates) in each status for a specific shop.
 *     tags:
 *       - Virtual Shop
 *     parameters:
 *       - in: query
 *         name: shopId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The unique ID for the virtual shop.
 *     responses:
 *       200:
 *         description: Successfully fetched status counts.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       status:
 *                         type: string
 *                         example: "PENDING"
 *                       count:
 *                         type: integer
 *                         example: 5
 *                       totalEstimateCount:
 *                         type: integer
 *                         example: 5
 *       400:
 *         description: Bad Request. Shop ID is required.
 *       500:
 *         description: Internal server error.
 */
export async function GET(req: Request) {
  try {
    const searchParams = new URL(req.url).searchParams;
    const shopId = searchParams.get("shopId");

    if (!shopId) {
      throw new AppError(400, "Shop ID is required");
    }

    const statuses = await db.shopBooking.groupBy({
      by: ["status"],
      where: {
        shop: {
          id: Number(shopId),
        },
      },
      _count: {
        _all: true,
      },
    });

    const allStatuses = [
      "PENDING",
      "CONFIRMED",
      "COMPLETED",
      "CANCELLED",
    ] as const;

    const formattedData = allStatuses.map((status) => {
      const found = statuses.find((s) => s.status === status);
      return {
        status,
        count: found ? found._count._all : 0,
        totalEstimateCount: found ? found._count._all : 0,
      };
    });

    return NextResponse.json(
      {
        success: true,
        data: formattedData,
      },
      { status: 200 },
    );
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
