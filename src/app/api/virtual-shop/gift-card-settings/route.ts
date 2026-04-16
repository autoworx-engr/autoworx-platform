import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { jwtVerifyToken } from "@/lib/jwtVerify";
import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { Prisma } from "@prisma/client";
import { z } from "zod";

const updateGiftCardSettingsSchema = z.object({
  allowCustomAmount: z.boolean().optional(),
  minCustomAmount: z.number().nullable().optional(),
  maxCustomAmount: z.number().nullable().optional(),
  presetAmounts: z.array(z.number()).nullable().optional(),
  allowEmailDelivery: z.boolean().optional(),
  allowSmsDelivery: z.boolean().optional(),
  defaultDelivery: z.enum(["EMAIL", "SMS", "BOTH"]).optional(),
  allowScheduledSend: z.boolean().optional(),
  defaultExpiryDays: z.number().nullable().optional(),
  termsAndConditions: z.string().nullable().optional(),
  privacyPolicy: z.string().nullable().optional(),
});

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
 * /api/virtual-shop/gift-card-settings:
 *   get:
 *     summary: Retrieve gift card settings
 *     description: Fetch the gift card settings for a specific shop via its shop ID.
 *     tags:
 *       - Virtual Shop Gift
 *     parameters:
 *       - in: query
 *         name: shopId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the shop to fetch settings for.
 *     responses:
 *       200:
 *         description: Successfully retrieved gift card settings.
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
 *                     allowCustomAmount:
 *                       type: boolean
 *                     minCustomAmount:
 *                       type: number
 *                     maxCustomAmount:
 *                       type: number
 *                     presetAmounts:
 *                       type: array
 *                       items:
 *                         type: number
 *                     allowEmailDelivery:
 *                       type: boolean
 *                     allowSmsDelivery:
 *                       type: boolean
 *                     defaultDelivery:
 *                       type: string
 *                     allowScheduledSend:
 *                       type: boolean
 *                     defaultExpiryDays:
 *                       type: integer
 *                     termsAndConditions:
 *                       type: string
 *                     privacyPolicy:
 *                       type: string
 *       400:
 *         description: Bad request.
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
    const queryShopId = searchParams.get("shopId") ?? "";

    const shopId = parseInt(queryShopId, 10);

    if (isNaN(shopId)) {
      throw new AppError(400, "Shop ID is required");
    }

    const settings = await db.giftCardSetting.findUnique({
      where: { shopId },
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
 * /api/virtual-shop/gift-card-settings:
 *   post:
 *     summary: Create default gift card settings
 *     description: Initializes the default gift card settings for a shop if they don't already exist.
 *     tags:
 *       - Virtual Shop Gift
 *     security:
 *       - bearerAuth: []
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
 *       201:
 *         description: Successfully created default gift card settings.
 *       400:
 *         description: Settings already exist.
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

    const body = await req.json();
    const shopId = body.shopId;

    if (!shopId || isNaN(Number(shopId))) {
      throw new AppError(400, "Shop ID is required");
    }

    const shop = await db.shop.findUnique({
      where: { id: Number(shopId) },
    });

    if (!shop || shop.companyId !== companyId) {
      throw new AppError(404, "Shop not found or access denied");
    }

    const existingSettings = await db.giftCardSetting.findUnique({
      where: { shopId: Number(shopId) },
    });

    if (existingSettings) {
      throw new AppError(400, "Settings already exist. Use PATCH to update.");
    }

    const newSettings = await db.giftCardSetting.create({
      data: {
        companyId,
        shopId: Number(shopId),
        allowCustomAmount: true,
        minCustomAmount: new Prisma.Decimal(10.0),
        maxCustomAmount: new Prisma.Decimal(1000.0),
        presetAmounts: [25, 50, 100, 200],
        allowEmailDelivery: true,
        allowSmsDelivery: false,
        defaultDelivery: "EMAIL",
        allowScheduledSend: true,
        defaultExpiryDays: null,
        termsAndConditions:
          "Gift cards are non-refundable and cannot be exchanged for cash.",
        privacyPolicy:
          "We value your privacy. Your information is securely stored.",
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
 * /api/virtual-shop/gift-card-settings:
 *   patch:
 *     summary: Update gift card settings
 *     description: Update the gift card configuration for an authenticated company.
 *     tags:
 *       - Virtual Shop
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               allowCustomAmount:
 *                 type: boolean
 *               minCustomAmount:
 *                 type: number
 *               maxCustomAmount:
 *                 type: number
 *               presetAmounts:
 *                 type: array
 *                 items:
 *                   type: number
 *               allowEmailDelivery:
 *                 type: boolean
 *               allowSmsDelivery:
 *                 type: boolean
 *               defaultDelivery:
 *                 type: string
 *                 enum: [EMAIL, SMS, BOTH]
 *               allowScheduledSend:
 *                 type: boolean
 *               defaultExpiryDays:
 *                 type: integer
 *                 nullable: true
 *               termsAndConditions:
 *                 type: string
 *               privacyPolicy:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successfully updated gift card settings.
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
    const { shopId: rawShopId, ...settingsPayload } = body;
    const parsedBody = updateGiftCardSettingsSchema.safeParse(settingsPayload);

    if (!parsedBody.success) {
      throw new AppError(
        400,
        `Validation Error: ${parsedBody.error.errors.map((e) => e.message).join(", ")}`,
      );
    }

    if (!rawShopId || isNaN(Number(rawShopId))) {
      throw new AppError(400, "Shop ID is required");
    }

    const shopId = Number(rawShopId);

    const shop = await db.shop.findUnique({
      where: { id: shopId },
    });

    if (!shop || shop.companyId !== companyId) {
      throw new AppError(404, "Shop not found or access denied");
    }

    const {
      allowCustomAmount,
      minCustomAmount,
      maxCustomAmount,
      presetAmounts,
      allowEmailDelivery,
      allowSmsDelivery,
      defaultDelivery,
      allowScheduledSend,
      defaultExpiryDays,
      termsAndConditions,
      privacyPolicy,
    } = parsedBody.data;

    const updateData: any = {};
    if (allowCustomAmount !== undefined)
      updateData.allowCustomAmount = allowCustomAmount;
    if (minCustomAmount !== undefined)
      updateData.minCustomAmount = minCustomAmount
        ? new Prisma.Decimal(minCustomAmount)
        : null;
    if (maxCustomAmount !== undefined)
      updateData.maxCustomAmount = maxCustomAmount
        ? new Prisma.Decimal(maxCustomAmount)
        : null;
    if (presetAmounts !== undefined) updateData.presetAmounts = presetAmounts;
    if (allowEmailDelivery !== undefined)
      updateData.allowEmailDelivery = allowEmailDelivery;
    if (allowSmsDelivery !== undefined)
      updateData.allowSmsDelivery = allowSmsDelivery;
    if (defaultDelivery !== undefined)
      updateData.defaultDelivery = defaultDelivery;
    if (allowScheduledSend !== undefined)
      updateData.allowScheduledSend = allowScheduledSend;
    if (defaultExpiryDays !== undefined)
      updateData.defaultExpiryDays = defaultExpiryDays;
    if (termsAndConditions !== undefined)
      updateData.termsAndConditions = termsAndConditions;
    if (privacyPolicy !== undefined) updateData.privacyPolicy = privacyPolicy;

    const updatedSettings = await db.giftCardSetting.update({
      where: { shopId },
      data: updateData,
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
