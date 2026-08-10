import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { jwtVerifyToken } from "@/lib/jwtVerify";
import { getToken } from "next-auth/jwt";
import { z } from "zod";

const updateStatusSchema = z.object({
  isActive: z.boolean({ required_error: "isActive is required" }),
});

/**
 * @swagger
 * /api/virtual-shop/shop-services/{id}/status:
 *   patch:
 *     summary: Update a shop service's active status
 *     description: Toggles the isActive flag for a specific shop service.
 *     tags:
 *       - Virtual Shop
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the shop service to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isActive
 *             properties:
 *               isActive:
 *                 type: boolean
 *                 description: Toggle service availability.
 *                 example: true
 *     responses:
 *       200:
 *         description: Successfully updated shop service status.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *       400:
 *         description: Invalid or missing data.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Company ID not found.
 *       404:
 *         description: Shop service not found or access denied.
 *       500:
 *         description: Internal server error.
 */
export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const params = await props.params;
    const serviceId = parseInt(params.id, 10);
    if (isNaN(serviceId)) {
      throw new AppError(400, "Invalid Shop Service ID");
    }

    const body = await req.json();
    const { isActive } = updateStatusSchema.parse(body);

    const authHeader = req.headers.get("authorization") ?? "";
    const accessToken = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : authHeader;

    let companyId: number | undefined;

    if (accessToken) {
      try {
        const verifyToken = await jwtVerifyToken(accessToken);
        companyId = verifyToken?.payload?.companyId as number | undefined;
      } catch {
        throw new AppError(401, "Unauthorized");
      }
    } else {
      const sessionToken = await getToken({
        req,
        secret: process.env.NEXTAUTH_SECRET,
      });
      companyId = sessionToken?.companyId as number | undefined;
    }

    if (!companyId) {
      throw new AppError(401, "Unauthorized");
    }

    // 1. Verify Ownership
    const existingService = await db.shopService.findUnique({
      where: { id: serviceId },
      include: { shop: true },
    });

    if (!existingService || existingService.shop.companyId !== companyId) {
      throw new AppError(404, "Shop service not found or access denied");
    }

    const updatedShopService = await db.shopService.update({
      where: { id: serviceId },
      data: {
        isActive,
      },
    });

    return NextResponse.json(
      { success: true, data: updatedShopService },
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
