import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { sendBookingConfirmation } from "@/actions/communication/client/sendBookingConfirmation";

/**
 * @swagger
 * /api/virtual-shop/service-booking/deposit:
 *   put:
 *     summary: Update the deposit amount and status for a shop booking
 *     description: Updates the depositPaid amount correctly and recalculates balanceDue. Validates if the new deposit amount meets the depositRequired threshold and updates the booking status to CONFIRMED if criteria is met, or keeps it PENDING otherwise.
 *     tags:
 *       - Virtual Shop
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - shopBookingId
 *               - depositAmount
 *             properties:
 *               shopBookingId:
 *                 type: integer
 *                 description: ID of the shop booking
 *                 example: 5
 *               depositAmount:
 *                 type: number
 *                 description: The new deposit amount that has been successfully paid in total
 *                 example: 50.00
 *     responses:
 *       200:
 *         description: Deposit and status updated successfully.
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
 *                   example: "Deposit and booking status updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 5
 *                     depositPaid:
 *                       type: number
 *                       example: 50.00
 *                     balanceDue:
 *                       type: number
 *                       example: 99.99
 *                     status:
 *                       type: string
 *                       example: "CONFIRMED"
 *       400:
 *         description: Bad Request. Missing required fields.
 *       404:
 *         description: Not Found. Booking not found.
 *       500:
 *         description: Internal Server Error.
 */
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { shopBookingId, depositAmount } = body;

    if (!shopBookingId || depositAmount === undefined) {
      throw new AppError(400, "shopBookingId and depositAmount are required");
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

      // Send Confirmation via reusable helper
      if (newStatus === "CONFIRMED") {
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

      return NextResponse.json(
        {
          success: true,
          message: "Deposit and booking status updated successfully",
          data: {
            id: updatedBooking.id,
            depositPaid: newDepositPaid,
            balanceDue: newBalanceDue,
            status: updatedBooking.status,
          },
        },
        { status: 200 },
      );
    });
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
