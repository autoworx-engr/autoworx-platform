"use server";

import moment from "moment";
import { sendInfobipEmail } from "@/actions/estimate/invoice/sendInfobipEmail";
import { sendTwilioMessage } from "@/actions/communication/client/sendTwilioMessage";
import { sendInfobipMessage } from "@/actions/communication/client/sendInfobipMessage";

export interface SendBookingConfirmationParams {
  client: {
    id: number;
    firstName: string | null;
    email?: string | null;
    mobile?: string | null;
  };
  shop: {
    companyId: number;
    company?: {
      name: string | null;
      smsGateway: string | null;
    } | null;
  };
  appointment: {
    date: Date | string | null;
    startTime: string | null;
  };
  vehicle?: {
    year: string | number | null;
    make: string | null;
    model: string | null;
  } | null;
  services?: {
    title: string;
  }[] | null;
  isDeposit?: boolean;
}

/**
 * Reusable action to dispatch a Booking Confirmation notification (SMS or Email).
 * As per current logic, SMS is prioritized. If SMS fails or mobile is missing,
 * it falls back to Email (via `else if`).
 */
export async function sendBookingConfirmation({
  client,
  shop,
  appointment,
  vehicle,
  services,
  isDeposit = false,
}: SendBookingConfirmationParams) {
  const appointmentDateParsed = appointment?.date
    ? moment(appointment.date).format("dddd, MMMM DD, YYYY")
    : "TBD";
  const appointmentStartTime = appointment?.startTime || "TBD";

  const shopName = shop.company?.name || "Our Shop";
  const vehicleStr = vehicle
    ? `${vehicle.year} ${vehicle.make} ${vehicle.model}`
    : "N/A";
  const servicesStr = services?.length
    ? services.map((s) => s.title).join(", ")
    : "N/A";

  const baseSmsMessage = `Your appointment on ${appointmentDateParsed} at ${appointmentStartTime} at ${shopName} is confirmed.`;
  const smsMessage = isDeposit
    ? `Booking Confirmed: Your deposit was received. ${baseSmsMessage}`
    : `Booking Confirmed: ${baseSmsMessage}`;

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #2563eb; color: white; padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">Booking Confirmed!</h1>
        <p style="margin: 8px 0 0; opacity: 0.9;">${shopName}</p>
      </div>
      <div style="padding: 32px 24px;">
        <p style="font-size: 16px; color: #374151; margin-top: 0;">Hi ${client.firstName || "Customer"}, your appointment has been successfully scheduled.</p>
        <div style="background-color: #f3f4f6; border-radius: 6px; padding: 24px; margin: 24px 0;">
          <p style="margin: 0 0 8px; color: #4b5563;"><strong>Date:</strong> ${appointmentDateParsed}</p>
          <p style="margin: 0 0 8px; color: #4b5563;"><strong>Time:</strong> ${appointmentStartTime}</p>
          <p style="margin: 0 0 8px; color: #4b5563;"><strong>Vehicle:</strong> ${vehicleStr}</p>
          <p style="margin: 0; color: #4b5563;"><strong>Services:</strong> ${servicesStr}</p>
        </div>
        <p style="font-size: 14px; color: #6b7280; margin: 0; text-align: center;">We look forward to seeing you!</p>
      </div>
    </div>
  `;

  if (client?.mobile) {
    try {
      const smsPayload = {
        companyId: shop.companyId,
        clientId: client.id,
        message: smsMessage,
        attachments: [],
        systemCall: true,
      };

      if (shop.company?.smsGateway === "TWILIO") {
        await sendTwilioMessage(smsPayload);
      } else if (shop.company?.smsGateway === "INFOBIP") {
        await sendInfobipMessage(smsPayload);
      }
    } catch (smsError) {
      console.error("Failed to send booking confirmation SMS:", smsError);
    }
  } else if (client?.email) {
    try {
      await sendInfobipEmail({
        clientId: client.id,
        subject: `Booking Confirmation at ${shopName}`,
        text: `Hi ${client.firstName || "Customer"}, your appointment on ${appointmentDateParsed} at ${appointmentStartTime} has been successfully scheduled.`,
        html: emailHtml,
      });
    } catch (emailError) {
      console.error("Failed to send booking confirmation Email:", emailError);
    }
  }
}
