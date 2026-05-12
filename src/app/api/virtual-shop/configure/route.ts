import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { Prisma } from "@prisma/client";

/**
 * @swagger
 * /api/virtual-shop/configure:
 *   post:
 *     tags:
 *       - Virtual Shop
 *     summary: Setup a new virtual shop
 *     description: Create a new shop configuration for a company.
 *     operationId: createShop
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - storeName
 *               - companyId
 *             properties:
 *               storeName:
 *                 type: string
 *                 example: Auto Parts Store
 *               description:
 *                 type: string
 *                 example: Best car parts shop in town
 *               logoUrl:
 *                 type: string
 *                 example: https://cdn.example.com/logo.png
 *               bannerUrl:
 *                 type: string
 *                 example: https://cdn.example.com/banner.png
 *               companyId:
 *                 type: integer
 *                 example: 1
 *               themeConfig:
 *                 type: object
 *                 example:
 *                   primaryColor: "#3b82f6"
 *                   font: "Inter"
 *
 *     responses:
 *       200:
 *         description: Shop created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Shop created successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     storeName:
 *                       type: string
 *                       example: Auto Parts Store
 *                     slug:
 *                       type: string
 *                       example: auto-parts-store
 *                     companyId:
 *                       type: integer
 *                       example: 1
 *
 *       400:
 *         description: Validation error or slug already exists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               example:
 *                 success: false
 *                 message: Slug already exists
 *
 *       500:
 *         description: Internal server error
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      storeName,
      description,
      logoUrl,
      bannerUrl,
      themeConfig,
      companyId,
      termsConditions,
      privacyPolicy,
      urgentBookingNotificationsEnabled,
    } = body;

    const slug = storeName
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    if (!storeName || !slug) {
      throw new AppError(400, "The store name are required!");
    }

    // Check if slug already exists
    const existing = await db.shop.findUnique({ where: { slug } });
    if (existing) {
      throw new AppError(400, "The shop already exist!");
    }

    const shop = await db.$transaction(async (tx) => {
      const newShop = await tx.shop.create({
        data: {
          companyId,
          storeName,
          slug,
          description: description ?? null,
          logoUrl,
          bannerUrl,
          themeConfig: themeConfig ?? null,
          termsConditions: termsConditions ?? null,
          privacyPolicy: privacyPolicy ?? null,
          urgentBookingNotificationsEnabled:
            urgentBookingNotificationsEnabled ?? true,
        },
      });

      const existingShopBookingSetting = await tx.shopBookingSetting.findUnique(
        {
          where: { shopId: newShop.id },
        },
      );

      if (existingShopBookingSetting) {
        throw new AppError(400, "Shop booking setting already exists");
      }

      const companySettings = await tx.calendarSettings.findUnique({
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

      await tx.shopBookingSetting.create({
        data: {
          shopId: newShop.id,
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
      });

      const existingGiftCardSetting = await tx.giftCardSetting.findUnique({
        where: { shopId: newShop.id },
      });

      if (!existingGiftCardSetting) {
        await tx.giftCardSetting.create({
          data: {
            companyId,
            shopId: newShop.id,
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
      }

      return newShop;
    });

    return NextResponse.json({
      success: true,
      message: "Shop created successfully",
      data: shop,
    });
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
