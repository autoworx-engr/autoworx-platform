import { db } from "@/lib/db";
import { AppError } from "@/error-boundary/error";

/**
 * Updates the deposit amount and status for a shop booking.
 */
export async function updateVirtualShopDeposit(
  shopBookingId: number | string,
  depositAmount: number,
) {
  if (!shopBookingId || depositAmount === undefined) {
    throw new AppError(400, "shopBookingId and depositAmount are required");
  }

  return await db.$transaction(async (tx) => {
    // Find the booking
    const booking = await tx.shopBooking.findUnique({
      where: { id: Number(shopBookingId) },
      include: {
        shop: {
          include: {
            bookingSettings: true,
          },
        },
        invoice: true,
      },
    });

    if (!booking) {
      throw new AppError(404, "Shop booking not found");
    }

    const total = Number(booking.invoice?.grandTotal || 0);
    const isDepositEnabled = Boolean(
      booking.shop?.bookingSettings?.isDepositEnabled,
    );
    const depositType = booking.shop?.bookingSettings?.depositType;
    const depositValue = Number(
      booking.shop?.bookingSettings?.depositValue || 0,
    );
    const depositRequired = !isDepositEnabled
      ? 0
      : depositType === "PERCENTAGE"
        ? (total * depositValue) / 100
        : depositValue;
    const newDepositPaid = Number(depositAmount);

    // Validate deposit Paid is not > total
    if (newDepositPaid > total) {
      throw new AppError(
        400,
        "Deposit paid cannot exceed total booking amount",
      );
    }

    const newBalanceDue = total - newDepositPaid;

    const newStatus =
      newDepositPaid >= depositRequired ? "CONFIRMED" : "PENDING";

    const updatedBooking = await tx.shopBooking.update({
      where: { id: booking.id },
      data: {
        status: newStatus,
      },
    });

    // Update Invoice Deposit Values as well!
    // Since ShopBooking is linked to an Estimate/Invoice
    // We should also update the invoice values so they sync.
    if (booking.invoiceId) {
      await tx.invoice.update({
        where: { id: booking.invoiceId },
        data: {
          deposit: newDepositPaid,
          due: newBalanceDue,
        },
      });
    }

    return {
      id: updatedBooking.id,
      depositPaid: newDepositPaid,
      balanceDue: newBalanceDue,
      status: updatedBooking.status,
    };
  });
}
