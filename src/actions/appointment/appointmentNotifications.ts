"use server";
import { sendInfobipEmail } from "../estimate/invoice/sendInfobipEmail";
import { sendInfobipMessage } from "../communication/client/sendInfobipMessage";
import { sendTwilioMessage } from "../communication/client/sendTwilioMessage";
import { Client, Vehicle } from "@prisma/client";
import moment from "moment-timezone";

type CompanyInfo = {
  timezone: string | null;
  name: string | null;
  address: string | null;
  phone: string | null;
  smsGateway: string | null;
};

export async function sendAppointmentConfirmation({
  client,
  vehicle,
  company,
  confirmationEmailTemplate,
  confirmationEmailTemplateStatus,
  appointmentDate,
  appointmentStartTime,
}: {
  client: Partial<Client> | null;
  vehicle: Partial<Vehicle> | null;
  company: CompanyInfo | null;
  confirmationEmailTemplate: { subject: string; message: string | null } | null;
  confirmationEmailTemplateStatus: boolean;
  appointmentDate: string | undefined;
  appointmentStartTime: string | undefined;
}) {
  if (
    !confirmationEmailTemplate ||
    !confirmationEmailTemplateStatus ||
    !client?.id
  )
    return;

  const formattedDate = moment(
    `${appointmentDate}T${appointmentStartTime}:00`,
  ).format("dddd, MMMM DD, h:mm A");

  const clientName = client.firstName || client.lastName || "";
  const vehicleStr = [
    vehicle?.year,
    vehicle?.make,
    vehicle?.model,
    vehicle?.other,
  ]
    .filter(Boolean)
    .join(" ");

  let subject = (confirmationEmailTemplate.subject ?? "")
    .replace("<VEHICLE>", vehicleStr)
    .replace("<CLIENT>", clientName);

  let message = (confirmationEmailTemplate.message ?? "")
    .replace("<VEHICLE>", vehicleStr)
    .replace("<CLIENT>", clientName)
    .replace("<DATE>", formattedDate)
    .replace("<BUSINESS_NAME>", company?.name ?? "")
    .replace("<PHONE>", company?.phone ?? "")
    .replace("<ADDRESS>", company?.address ?? "");

  try {
    await sendInfobipEmail({ clientId: client.id, subject, text: message });
  } catch (error) {
    console.error("sendInfobipEmail error:", error);
  }

  try {
    if (company?.smsGateway === "TWILIO") {
      await sendTwilioMessage({
        clientId: client.id,
        message,
        attachments: [],
      });
    } else if (company?.smsGateway === "INFOBIP") {
      await sendInfobipMessage({
        clientId: client.id,
        message,
        attachments: [],
      });
    }
  } catch (error) {
    console.error("SMS send error:", error);
  }
}
