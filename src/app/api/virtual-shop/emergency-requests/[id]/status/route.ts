import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";

/**
 * @swagger
 * /api/virtual-shop/emergency-requests/{id}/status:
 *   get:
 *     summary: Get public status of an emergency request
 *     description: Returns the current status of an emergency request. No authentication required. Only exposes safe public fields.
 *     tags: [Virtual Shop - Emergency]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Status retrieved successfully.
 *       404:
 *         description: Request not found.
 *       500:
 *         description: Internal server error.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const requestId = parseInt(id, 10);
    if (!Number.isFinite(requestId)) throw new AppError(400, "Invalid ID");

    const request = await db.emergencyBookingRequest.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        status: true,
        contactName: true,
        description: true,
        requestedDate: true,
        requestedTime: true,
        flexibleTiming: true,
        vehicleMake: true,
        vehicleModel: true,
        vehicleYear: true,
        adminNotes: true,
        rejectionReason: true,
        proposedDate: true,
        proposedTime: true,
        alternativeNotes: true,
        createdAt: true,
        updatedAt: true,
        expiresAt: true,
        shop: {
          select: {
            storeName: true,
            slug: true,
            logoUrl: true,
          },
        },
      },
    });

    if (!request) throw new AppError(404, "Request not found");

    return NextResponse.json({ success: true, data: request });
  } catch (error: any) {
    const formattedError = errorHandler(error);
    return NextResponse.json(
      { success: false, message: formattedError.message },
      { status: formattedError.statusCode },
    );
  }
}
