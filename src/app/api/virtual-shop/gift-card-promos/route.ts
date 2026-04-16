import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { jwtVerifyToken } from "@/lib/jwtVerify";
import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { Prisma } from "@prisma/client";
import { z } from "zod";

const createPromoSchema = z
  .object({
    code: z
      .string()
      .min(2, "Code must be at least 2 characters")
      .max(50, "Code is too long"),
    type: z.enum(["Percentage", "Fixed"]),
    value: z.number().positive("Value must be a positive number"),
    startDate: z.string().optional().nullable(),
    expireDate: z.string().optional().nullable(),
    usageLimit: z.number().int().nonnegative().optional().nullable(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.type === "Percentage" && data.value > 100) {
        return false;
      }
      return true;
    },
    {
      message: "Percentage value cannot exceed 100",
      path: ["value"],
    },
  );

/**
 * @swagger
 * /api/virtual-shop/gift-card-promos:
 *   get:
 *     summary: List all gift card promos
 *     description: Fetch all promotional codes for the authenticated company.
 *     tags:
 *       - Virtual Shop Gift
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved promos.
 *       401:
 *         description: Unauthorized.
 *       500:
 *         description: Internal server error.
 */
export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const shopIdStr = searchParams.get("shopId");

    if (!shopIdStr) {
      throw new AppError(400, "shopId query parameter is required");
    }

    const shopId = parseInt(shopIdStr, 10);

    const shop = await db.shop.findUnique({
      where: { id: shopId },
    });

    if (!shop || shop.companyId !== companyId) {
      throw new AppError(404, "Shop not found or access denied");
    }

    const promos = await db.giftCardPromo.findMany({
      where: { shopId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: promos }, { status: 200 });
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
 * /api/virtual-shop/gift-card-promos:
 *   post:
 *     summary: Create a gift card promo
 *     description: Create a new promotional code.
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
 *               - code
 *               - type
 *               - value
 *             properties:
 *               code:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [Percentage, Fixed]
 *               value:
 *                 type: number
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               expireDate:
 *                 type: string
 *                 format: date-time
 *               usageLimit:
 *                 type: integer
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Successfully created promo.
 *       400:
 *         description: Validation error or code already exists.
 *       401:
 *         description: Unauthorized.
 *       500:
 *         description: Internal server error.
 */
export async function POST(req: NextRequest) {
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
    const { shopId: rawShopId, ...promoPayload } = body;
    const parsedBody = createPromoSchema.safeParse(promoPayload);

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

    const { code, type, value, startDate, expireDate, usageLimit, isActive } =
      parsedBody.data;

    // Check if code exists uniquely for this shop
    const existingPromo = await db.giftCardPromo.findUnique({
      where: {
        shopId_code: {
          shopId,
          code,
        },
      },
    });

    if (existingPromo) {
      throw new AppError(
        400,
        `Promo code "${code}" already exists for this shop`,
      );
    }

    const newPromo = await db.giftCardPromo.create({
      data: {
        companyId,
        shopId,
        code,
        type,
        value: new Prisma.Decimal(value),
        startDate: startDate ? new Date(startDate) : new Date(),
        expireDate: expireDate ? new Date(expireDate) : null,
        usageLimit: usageLimit ?? null,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Promo code created successfully",
        data: newPromo,
      },
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
