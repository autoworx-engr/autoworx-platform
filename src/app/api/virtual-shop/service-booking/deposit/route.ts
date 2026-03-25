import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import moment from "moment";
import { sendInfobipEmail } from "@/actions/estimate/invoice/sendInfobipEmail";
import { sendTwilioMessage } from "@/actions/communication/client/sendTwilioMessage";
import { sendInfobipMessage } from "@/actions/communication/client/sendInfobipMessage";

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

      // Send Confirmation Email if Deposit meets criteria
      if (newStatus === "CONFIRMED" && booking.client?.email) {
        try {
          const appointmentDateParsed = booking.appointment?.date
            ? moment(booking.appointment.date).format("dddd, MMMM DD, YYYY")
            : "TBD";
          const appointmentStartTime = booking.appointment?.startTime || "TBD";
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
              <div style="background-color: #2563eb; color: white; padding: 24px; text-align: center;">
                <h1 style="margin: 0; font-size: 24px;">Booking Confirmed!</h1>
                <p style="margin: 8px 0 0; opacity: 0.9;">${booking.shop?.company?.name || "Our Shop"}</p>
              </div>
              <div style="padding: 32px 24px;">
                <p style="font-size: 16px; color: #374151; margin-top: 0;">Hi ${booking.client.firstName}, your appointment has been successfully scheduled.</p>
                <div style="background-color: #f3f4f6; border-radius: 6px; padding: 24px; margin: 24px 0;">
                  <p style="margin: 0 0 8px; color: #4b5563;"><strong>Date:</strong> ${appointmentDateParsed}</p>
                  <p style="margin: 0 0 8px; color: #4b5563;"><strong>Time:</strong> ${appointmentStartTime}</p>
                  <p style="margin: 0 0 8px; color: #4b5563;"><strong>Vehicle:</strong> ${booking.vehicle ? `${booking.vehicle.year} ${booking.vehicle.make} ${booking.vehicle.model}` : "N/A"}</p>
                  <p style="margin: 0; color: #4b5563;"><strong>Services:</strong> ${booking.services?.map((s: any) => s.title).join(", ") || "N/A"}</p>
                </div>
                <p style="font-size: 14px; color: #6b7280; margin: 0; text-align: center;">We look forward to seeing you!</p>
              </div>
            </div>
          `;

          await sendInfobipEmail({
            clientId: booking.client.id,
            subject: `Booking Confirmation at ${booking.shop?.company?.name || "Our Shop"}`,
            text: `Hi ${booking.client.firstName}, your appointment on ${appointmentDateParsed} at ${appointmentStartTime} has been successfully scheduled.`,
            html: emailHtml,
          });
        } catch (emailError) {
          console.error("Failed to send deposit booking confirmation Email:", emailError);
        }
      }

      // Send Confirmation SMS if Deposit meets criteria
      if (newStatus === "CONFIRMED" && booking.client?.mobile) {
        try {
          const appointmentDateParsed = booking.appointment?.date
            ? moment(booking.appointment.date).format("dddd, MMMM DD, YYYY")
            : "TBD";
          const appointmentStartTime = booking.appointment?.startTime || "TBD";
          const smsPayload = {
            companyId: booking.shop.companyId,
            clientId: booking.client.id,
            message: `Booking Confirmed: Your deposit was received. Your appointment on ${appointmentDateParsed} at ${appointmentStartTime} at ${booking.shop?.company?.name || "Our Shop"} is confirmed.`,
            attachments: [],
            systemCall: true,
          };

          if (booking.shop?.company?.smsGateway === "TWILIO") {
            await sendTwilioMessage(smsPayload);
          } else if (booking.shop?.company?.smsGateway === "INFOBIP") {
            await sendInfobipMessage(smsPayload);
          }
        } catch (smsError) {
          console.error("Failed to send deposit booking confirmation SMS:", smsError);
        }
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
