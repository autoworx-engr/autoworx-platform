import { db } from "@/lib/db";
import { AppError } from "@/error-boundary/error";
import { sendBookingConfirmation } from "@/actions/communication/client/sendBookingConfirmation";

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

  const incomingDepositAmount = Number(depositAmount);
  if (!Number.isFinite(incomingDepositAmount) || incomingDepositAmount <= 0) {
    throw new AppError(400, "depositAmount must be greater than 0");
  }

  return await db.$transaction(async (tx) => {
    // Find the booking
    const booking = await tx.shopBooking.findUnique({
      where: { id: Number(shopBookingId) },
      include: {
        client: true,
        shop: {
          include: {
            bookingSettings: true,
            company: {
              select: { name: true, smsGateway: true },
            },
          },
        },
        appointment: true,
        vehicle: true,
        services: true,
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
    const existingDepositPaid = Number(booking.invoice?.deposit || 0);
    const newDepositPaid = Number(
      (existingDepositPaid + incomingDepositAmount).toFixed(2),
    );

    // Validate deposit Paid is not > total
    if (newDepositPaid > total) {
      throw new AppError(
        400,
        "Deposit paid cannot exceed total booking amount",
      );
    }

    const newBalanceDue = Number((total - newDepositPaid).toFixed(2));
    const wasConfirmed = booking.status === "CONFIRMED";

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

    // Send Confirmation via reusable helper
    if (!wasConfirmed && newStatus === "CONFIRMED") {
      await sendBookingConfirmation({
        client: {
          id: booking.client!.id,
          firstName: booking.client!.firstName,
          email: booking.client?.email,
          mobile: booking.client?.mobile,
        },
        shop: {
          companyId: booking.shop.companyId,
          company: booking.shop.company,
        },
        appointment: {
          date: booking.appointment?.date || null,
          startTime: booking.appointment?.startTime || null,
        },
        vehicle: booking.vehicle
          ? {
              year: booking.vehicle.year,
              make: booking.vehicle.make,
              model: booking.vehicle.model,
            }
          : null,
        services:
          booking.services?.map((s: any) => ({ title: s.title })) || null,
        isDeposit: true,
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
