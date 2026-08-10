import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { errorHandler } from "@/error-boundary/globalErrorHandler";

/**
 * @swagger
 * /api/virtual-shop/issued-gift-card:
 *   get:
 *     summary: Get an Issued Gift Card by code or orderNumber
 *     description: Retrieve details of a purchased gift card using either its secret code or the confirmation order number.
 *     tags:
 *       - Virtual Shop Gift
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: The secure gift card code (e.g., GC-XXXX-XXXX-XXXX)
 *       - in: query
 *         name: orderNumber
 *         schema:
 *           type: string
 *         description: The confirmation order number (e.g., ORD-XXXXX)
 *     responses:
 *       200:
 *         description: Successfully retrieved the gift card details.
 *       400:
 *         description: Missing query parameters.
 *       404:
 *         description: Gift card not found.
 *       500:
 *         description: Internal Server Error.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const orderNumber = searchParams.get("orderNumber");

    if (!code && !orderNumber) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please provide either a 'code' or 'orderNumber' to query the gift card.",
        },
        { status: 400 },
      );
    }

    const giftCard = await db.issuedGiftCard.findFirst({
      where: {
        status: "ACTIVE",
        OR: [
          ...(code ? [{ code }] : []),
          ...(orderNumber ? [{ orderNumber }] : []),
        ],
      },
      include: {
        company: {
          select: {
            name: true,
            email: true,
            phone: true,
            address: true,
            city: true,
            state: true,
            zip: true,
          },
        },
      },
    });

    if (!giftCard) {
      return NextResponse.json(
        {
          success: false,
          message: "Gift card not found.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Gift card retrieved successfully.",
        data: giftCard,
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
