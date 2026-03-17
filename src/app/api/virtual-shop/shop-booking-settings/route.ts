import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/authOptions";
import { Prisma } from "@prisma/client";

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
 *       404:
 *         description: Settings not found.
 *       500:
 *         description: Internal server error.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const shopId = searchParams.get("shopId");

    if (!shopId) {
      return NextResponse.json(
        { success: false, message: "Missing shopId" },
        { status: 400 },
      );
    }

    const settings = await db.shopBookingSetting.findUnique({
      where: { shopId: parseInt(shopId, 10) },
      include: { availabilities: true },
    });

    if (!settings) {
      return NextResponse.json(
        { success: false, message: "Settings not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { success: true, data: settings },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching shop booking settings:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
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
 *       401:
 *         description: Unauthorized.
 *       500:
 *         description: Internal server error.
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const { shopId } = await req.json();

    if (!shopId) {
      return NextResponse.json(
        { success: false, message: "Missing shopId" },
        { status: 400 },
      );
    }

    const existingSettings = await db.shopBookingSetting.findUnique({
      where: { shopId: parseInt(shopId, 10) },
    });

    if (existingSettings) {
      return NextResponse.json(
        {
          success: false,
          message: "Settings already exist. Use PUT to update.",
        },
        { status: 400 },
      );
    }

    const companySettings = await db.calendarSettings.findUnique({
      where: { companyId: (session.user as any).companyId },
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
    ].map(day => ({
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
  } catch (error) {
    console.error("Error creating shop booking settings:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * @swagger
 * /api/virtual-shop/shop-booking-settings:
 *   put:
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
 *       401:
 *         description: Unauthorized.
 *       500:
 *         description: Internal server error.
 */
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
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
      return NextResponse.json(
        { success: false, message: "Missing shopId" },
        { status: 400 },
      );
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
        deleteMany: {}, // Delete old to replace with new ones cleanly
        create: availabilities.map((a: any) => ({
          dayOfWeek: a.dayOfWeek,
          isOpen: a.isOpen ?? true,
          startTime: a.startTime ?? null,
          endTime: a.endTime ?? null,
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
  } catch (error) {
    console.error("Error updating shop booking settings:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
