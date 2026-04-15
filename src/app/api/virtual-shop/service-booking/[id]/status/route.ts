import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { jwtVerifyToken } from "@/lib/jwtVerify";
import { getToken } from "next-auth/jwt";
import { z } from "zod";

const updateStatusSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"]),
});

/**
 * @swagger
 * /api/virtual-shop/service-booking/{id}/status:
 *   patch:
 *     summary: Update the status of a service booking
 *     description: Modifies the status of an existing service booking based on the provided values. Requires authentication to verify ownership.
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
 *         description: The ID of the service booking to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PENDING, CONFIRMED, COMPLETED, CANCELLED]
 *                 description: The new status for the booking.
 *           example:
 *             status: "CONFIRMED"
 *     responses:
 *       200:
 *         description: Successfully updated service booking status.
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
 *                   example: "Status updated successfully"
 *                 data:
 *                   type: object
 *                   description: Updated Shop Booking object
 *       400:
 *         description: Invalid or missing data.
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
 *       404:
 *         description: Service booking not found or access denied.
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
export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const params = await props.params;
    const bookingId = parseInt(params.id, 10);
    if (isNaN(bookingId)) {
      throw new AppError(400, "Invalid booking ID");
    }

    const body = await req.json();
    const parsedBody = await updateStatusSchema.parseAsync(body);
    const { status } = parsedBody;

    const authHeader = req.headers.get("authorization") ?? "";
    let accessToken = "";
    if (authHeader.startsWith("Bearer ")) {
      accessToken = authHeader.split(" ")[1];
    } else if (authHeader.startsWith("Bearer")) {
      accessToken = authHeader.replace("Bearer", "").trim();
    } else {
      accessToken = authHeader;
    }

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

    // Check ownership
    const existingBooking = await db.shopBooking.findUnique({
      where: { id: bookingId },
      include: { shop: true },
    });

    if (!existingBooking || existingBooking.shop.companyId !== companyId) {
      throw new AppError(404, "Booking not found or access denied");
    }

    const updatedBooking = await db.shopBooking.update({
      where: { id: bookingId },
      data: { status },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Status updated successfully",
        data: updatedBooking,
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
