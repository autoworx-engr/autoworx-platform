import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { jwtVerifyToken } from "@/lib/jwtVerify";
import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { Prisma } from "@prisma/client";

/**
 * @swagger
 * components:
 *   schemas:
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *         errorDetails:
 *           type: object
 */

/**
 * @swagger
 * /api/virtual-shop/shop-booking-settings:
 *   get:
 *     summary: Retrieve shop booking settings
 *     description: Fetch the booking settings for a specific shop ID, including deposit settings, appointment logic, add-ons, and availability.
 *     tags:
 *       - Virtual Shop
 *     parameters:
 *       - in: query
 *         name: shopId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the shop to fetch settings for.
 *     responses:
 *       200:
 *         description: Successfully retrieved shop booking settings.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     shopId:
 *                       type: integer
 *                     isDepositEnabled:
 *                       type: boolean
 *                     depositType:
 *                       type: string
 *                       enum: [FIXED, PERCENTAGE]
 *                     depositValue:
 *                       type: number
 *                     isStackingEnabled:
 *                       type: boolean
 *                     stackingLimit:
 *                       type: integer
 *                     slotInterval:
 *                       type: integer
 *                     isTaxEnabled:
 *                       type: boolean
 *                     isServiceFeeEnabled:
 *                       type: boolean
 *                     availabilities:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           dayOfWeek:
 *                             type: string
 *                             enum: [MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY]
 *                           isOpen:
 *                             type: boolean
 *                           startTime:
 *                             type: string
 *                           endTime:
 *                             type: string
 *       400:
 *         description: Missing shopId.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Settings not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const shopId = searchParams.get("shopId");

    if (!shopId) {
      throw new AppError(400, "Missing shopId");
    }

    const settings = await db.shopBookingSetting.findUnique({
      where: { shopId: parseInt(shopId, 10) },
      include: { availabilities: true },
    });

    if (!settings) {
      throw new AppError(404, "Settings not found");
    }

    return NextResponse.json(
      { success: true, data: settings },
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

/**
 * @swagger
 * /api/virtual-shop/shop-booking-settings:
 *   post:
 *     summary: Create default shop booking settings
 *     description: Create the default booking settings for a specific shop.
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
 *                 description: The ID of the shop to create settings for
 *     responses:
 *       201:
 *         description: Successfully created default shop booking settings.
 *       400:
 *         description: Missing shopId or settings already exist.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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

    const existingSettings = await db.shopBookingSetting.findUnique({
      where: { shopId: parseInt(shopId, 10) },
    });

    if (existingSettings) {
      throw new AppError(400, "Settings already exist. Use PATCH to update.");
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

    const newSettings = await db.shopBookingSetting.create({
      data: {
        shopId: parseInt(shopId, 10),
        isDepositEnabled: false,
        depositType: "FIXED",
        depositValue: null,
        isStackingEnabled: false,
        stackingLimit: 1,
        slotInterval: 30,
        isTaxEnabled: false,
        isServiceFeeEnabled: false,
        availabilities: {
          create: defaultAvailabilities,
        },
      },
      include: {
        availabilities: true,
      },
    });

    return NextResponse.json(
      { success: true, data: newSettings },
      { status: 201 },
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

/**
 * @swagger
 * /api/virtual-shop/shop-booking-settings:
 *   patch:
 *     summary: Update shop booking settings
 *     description: Update the scheduling, deposits, and add-on settings for a specific shop.
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
 *               isDepositEnabled:
 *                 type: boolean
 *               depositType:
 *                 type: string
 *                 enum: [FIXED, PERCENTAGE]
 *               depositValue:
 *                 type: number
 *               isStackingEnabled:
 *                 type: boolean
 *               stackingLimit:
 *                 type: integer
 *               slotInterval:
 *                 type: integer
 *               isTaxEnabled:
 *                 type: boolean
 *               isServiceFeeEnabled:
 *                 type: boolean
 *               availabilities:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     dayOfWeek:
 *                       type: string
 *                       enum: [MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY]
 *                     isOpen:
 *                       type: boolean
 *                     startTime:
 *                       type: string
 *                       example: "08:00"
 *                     endTime:
 *                       type: string
 *                       example: "18:00"
 *     responses:
 *       200:
 *         description: Successfully updated shop booking settings.
 *       400:
 *         description: Missing shopId.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export async function PATCH(req: Request) {
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

    const body = await req.json();
    const {
      shopId,
      isDepositEnabled,
      depositType,
      depositValue,
      isStackingEnabled,
      stackingLimit,
      slotInterval,
      isTaxEnabled,
      isServiceFeeEnabled,
      availabilities,
    } = body;

    if (!shopId) {
      throw new AppError(400, "Missing shopId");
    }

    const updateData: any = {};
    if (isDepositEnabled !== undefined)
      updateData.isDepositEnabled = isDepositEnabled;
    if (depositType !== undefined) updateData.depositType = depositType;
    if (depositValue !== undefined)
      updateData.depositValue = depositValue
        ? new Prisma.Decimal(depositValue)
        : null;
    if (isStackingEnabled !== undefined)
      updateData.isStackingEnabled = isStackingEnabled;
    if (stackingLimit !== undefined) updateData.stackingLimit = stackingLimit;
    if (slotInterval !== undefined) updateData.slotInterval = slotInterval;
    if (isTaxEnabled !== undefined) updateData.isTaxEnabled = isTaxEnabled;
    if (isServiceFeeEnabled !== undefined)
      updateData.isServiceFeeEnabled = isServiceFeeEnabled;

    if (availabilities && Array.isArray(availabilities)) {
      updateData.availabilities = {
        updateMany: availabilities.map((a: any) => ({
          where: { dayOfWeek: a.dayOfWeek },
          data: {
            isOpen: a.isOpen ?? true,
            startTime: a.startTime ?? null,
            endTime: a.endTime ?? null,
          },
        })),
      };
    }

    const updatedSettings = await db.shopBookingSetting.update({
      where: { shopId: parseInt(shopId, 10) },
      data: updateData,
      include: {
        availabilities: true,
      },
    });

    return NextResponse.json(
      { success: true, data: updatedSettings },
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
