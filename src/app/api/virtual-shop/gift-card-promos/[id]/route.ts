import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { jwtVerifyToken } from "@/lib/jwtVerify";
import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { Prisma } from "@prisma/client";
import { z } from "zod";

const updatePromoSchema = z
  .object({
    code: z
      .string()
      .min(2, "Code must be at least 2 characters")
      .max(50, "Code is too long")
      .optional(),
    type: z.enum(["Percentage", "Fixed"]).optional(),
    value: z.number().positive("Value must be a positive number").optional(),
    startDate: z.string().optional().nullable(),
    expireDate: z.string().optional().nullable(),
    usageLimit: z.number().int().nonnegative().optional().nullable(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.type === "Percentage" && data.value && data.value > 100) {
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
 * /api/virtual-shop/gift-card-promos/{id}:
 *   patch:
 *     summary: Update a gift card promo
 *     description: Update specific fields of an existing promotional code.
 *     tags:
 *       - Virtual Shop Gift
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
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
 *       200:
 *         description: Successfully updated promo.
 *       400:
 *         description: Validation error or duplicate code.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Promo not found.
 *       500:
 *         description: Internal server error.
 */
export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const params = await props.params;
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

    const promoId = parseInt(params.id, 10);
    if (isNaN(promoId)) {
      throw new AppError(400, "Invalid promo ID");
    }

    // Verify ownership via shop
    const existingPromo = await db.giftCardPromo.findUnique({
      where: { id: promoId },
      include: { shop: { select: { companyId: true } } },
    });

    if (!existingPromo || existingPromo.shop.companyId !== companyId) {
      throw new AppError(404, "Promo code not found or unauthorized");
    }

    const body = await req.json();
    const parsedBody = updatePromoSchema.safeParse(body);

    if (!parsedBody.success) {
      throw new AppError(
        400,
        `Validation Error: ${parsedBody.error.errors.map((e) => e.message).join(", ")}`,
      );
    }

    const { code, type, value, startDate, expireDate, usageLimit, isActive } =
      parsedBody.data;

    // Additional cross-field validation for percentage logic on update
    // If setting to Percentage, make sure existing or new value is <= 100
    const finalType = type ?? existingPromo.type;
    const finalValue = value ?? Number(existingPromo.value);

    if (finalType === "Percentage" && finalValue > 100) {
      throw new AppError(400, "Percentage value cannot exceed 100");
    }

    // Check code uniqueness if changing code (scoped to the same shop)
    if (code && code !== existingPromo.code) {
      const duplicateCode = await db.giftCardPromo.findUnique({
        where: {
          shopId_code: {
            shopId: existingPromo.shopId,
            code,
          },
        },
      });

      if (duplicateCode) {
        throw new AppError(
          400,
          `Promo code "${code}" already exists for this shop`,
        );
      }
    }

    const updateData: any = {};
    if (code !== undefined) updateData.code = code;
    if (type !== undefined) updateData.type = type;
    if (value !== undefined) updateData.value = new Prisma.Decimal(value);
    if (startDate !== undefined)
      updateData.startDate = startDate ? new Date(startDate) : new Date();
    if (expireDate !== undefined)
      updateData.expireDate = expireDate ? new Date(expireDate) : null;
    if (usageLimit !== undefined) updateData.usageLimit = usageLimit ?? null;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedPromo = await db.giftCardPromo.update({
      where: { id: promoId },
      data: updateData,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Promo updated successfully",
        data: updatedPromo,
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

/**
 * @swagger
 * /api/virtual-shop/gift-card-promos/{id}:
 *   delete:
 *     summary: Delete a gift card promo
 *     description: Remove a promotional code permanently.
 *     tags:
 *       - Virtual Shop Gift
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Successfully deleted promo.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Promo not found.
 *       500:
 *         description: Internal server error.
 */
export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const params = await props.params;
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

    const promoId = parseInt(params.id, 10);
    if (isNaN(promoId)) {
      throw new AppError(400, "Invalid promo ID");
    }

    // Verify ownership via shop
    const existingPromo = await db.giftCardPromo.findUnique({
      where: { id: promoId },
      include: { shop: { select: { companyId: true } } },
    });

    if (!existingPromo || existingPromo.shop.companyId !== companyId) {
      throw new AppError(404, "Promo code not found or unauthorized");
    }

    await db.giftCardPromo.delete({
      where: { id: promoId },
    });

    return NextResponse.json(
      { success: true, message: "Promo deleted successfully" },
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
