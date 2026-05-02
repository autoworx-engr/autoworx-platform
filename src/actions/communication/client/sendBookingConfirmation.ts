"use server";

import moment from "moment";
import { sendInfobipEmail } from "@/actions/estimate/invoice/sendInfobipEmail";
import { sendTwilioMessage } from "@/actions/communication/client/sendTwilioMessage";
import { sendInfobipMessage } from "@/actions/communication/client/sendInfobipMessage";
import { generateBookingConfirmationEmailHtml } from "@/lib/emails-template/booking-confirmation";

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
  services?:
    | {
        title: string;
      }[]
    | null;
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

  const emailHtml = generateBookingConfirmationEmailHtml({
    shopName,
    appointmentDate: appointmentDateParsed,
    appointmentTime: appointmentStartTime,
    vehicleStr,
    servicesStr,
    clientFirstName: client.firstName,
  });

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
