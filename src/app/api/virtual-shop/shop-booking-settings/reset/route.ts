import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { jwtVerifyToken } from "@/lib/jwtVerify";
import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";

/**
 * @swagger
 * /api/virtual-shop/shop-booking-settings/reset:
 *   post:
 *     summary: Reset shop booking settings
 *     description: Resets the booking settings and availability for a specific shop to their default values.
 *     tags:
 *       - Virtual Shop
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - shopId
 *             properties:
 *               shopId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Successfully reset shop booking settings.
 *       400:
 *         description: Missing shopId.
 *       401:
 *         description: Unauthorized.
 *       500:
 *         description: Internal server error.
 */
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const accessToken = authHeader.startsWith("Bearer")
      ? authHeader.split(" ")[1]
      : authHeader;

    const verifyToken = await jwtVerifyToken(accessToken);

    if (!verifyToken?.payload) {
      throw new AppError(401, "Unauthorized");
    }

    const companyId = verifyToken?.payload?.companyId as number;

    if (!companyId) {
      throw new AppError(403, "Company ID not found in session");
    }

    const { shopId } = await req.json();

    if (!shopId) {
      throw new AppError(400, "Missing shopId");
    }

    const parsedShopId = parseInt(shopId, 10);

    const existingSettings = await db.shopBookingSetting.findUnique({
      where: { shopId: parsedShopId },
    });

    if (!existingSettings) {
      throw new AppError(404, "Settings not found to reset");
    }

    const companySettings = await db.calendarSettings.findUnique({
      where: { companyId },
    });

    const defaultStartTime = companySettings?.dayStart || "09:00";
    const defaultEndTime = companySettings?.dayEnd || "17:00";

    const defaultAvailabilities = [
      "MONDAY",
      "TUESDAY",
      "WEDNESDAY",
      "THURSDAY",
      "FRIDAY",
      "SATURDAY",
      "SUNDAY",
    ].map((day) => ({
      dayOfWeek: day as any,
      isOpen: true,
      startTime: defaultStartTime,
      endTime: defaultEndTime,
    }));

    const resetSettings = await db.shopBookingSetting.update({
      where: { shopId: parsedShopId },
      data: {
        isDepositEnabled: false,
        depositType: "FIXED",
        depositValue: null,
        isStackingEnabled: false,
        stackingLimit: 1,
        slotInterval: 30,
        isTaxEnabled: false,
        isServiceFeeEnabled: false,
        availabilities: {
          deleteMany: {}, // Delete all old availabilities
          create: defaultAvailabilities, // Create the new default ones
        },
      },
      include: {
        availabilities: true,
      },
    });

    return NextResponse.json(
      { success: true, data: resetSettings },
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
