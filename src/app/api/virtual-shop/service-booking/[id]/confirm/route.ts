import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { errorHandler } from "@/error-boundary/globalErrorHandler";

/**
 * GET /api/virtual-shop/service-booking/[id]/confirm
 *
 * Read-only: returns the booking's current status, invoiceId, and totals.
 * Used by the frontend after Stripe redirect to pick up the confirmed booking data.
 */
export async function GET(
  _req: Request,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const params = await props.params;
    const shopBookingId = Number(params.id);
    if (!shopBookingId || !Number.isFinite(shopBookingId)) {
      return NextResponse.json(
        { success: false, message: "Invalid booking ID" },
        { status: 400 },
      );
    }

    const booking = await db.shopBooking.findUnique({
      where: { id: shopBookingId },
      include: {
        invoice: {
          select: {
            id: true,
            subtotal: true,
            discount: true,
            tax: true,
            serviceFee: true,
            grandTotal: true,
            deposit: true,
            due: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, message: "Booking not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        status: booking.status,
        invoiceId: booking.invoiceId,
        appointmentId: booking.appointmentId,
        totals: booking.invoice
          ? {
              subtotal: Number(booking.invoice.subtotal),
              grandTotal: Number(booking.invoice.grandTotal),
              giftCardRedeemed: Number(booking.invoice.discount || 0),
              deposit: Number(booking.invoice.deposit),
              due: Number(booking.invoice.due),
            }
          : null,
      },
    });
  } catch (error: any) {
    const formattedError = errorHandler(error);
    return NextResponse.json(
      { success: false, message: formattedError.message },
      { status: formattedError.statusCode },
    );
  }
}
