import { NextResponse } from "next/server";
import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { confirmShopBooking } from "@/services/confirmShopBooking";

/**
 * POST /api/virtual-shop/service-booking/[id]/apply-gift-card
 *
 * Confirms a pending booking using a gift card (and optional cash already paid).
 * Creates the invoice + appointment, redeems the gift card, and sets status CONFIRMED.
 *
 * Body:
 *   giftCardCode: string  – gift card code to redeem
 *   cashPaid?: number     – amount already paid via payment gateway (default 0)
 */
export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const params = await props.params;
    const shopBookingId = Number(params.id);
    if (!shopBookingId || !Number.isFinite(shopBookingId)) {
      throw new AppError(400, "Invalid booking ID");
    }

    const body = await req.json();
    const { giftCardCode, cashPaid = 0 } = body;

    if (!giftCardCode || typeof giftCardCode !== "string") {
      throw new AppError(400, "giftCardCode is required");
    }

    const result = await confirmShopBooking({
      shopBookingId,
      cashPaid: Number(cashPaid),
      giftCardCode,
    });

    return NextResponse.json({
      success: true,
      message: "Gift card applied and booking confirmed",
      data: result,
    });
  } catch (error: any) {
    const formattedError = errorHandler(error);
    return NextResponse.json(
      { success: false, message: formattedError.message },
      { status: formattedError.statusCode },
    );
  }
}
