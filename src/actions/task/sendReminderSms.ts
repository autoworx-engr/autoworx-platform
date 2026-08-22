"use server";

import { db } from "@/lib/db";
import getUser from "@/lib/getUser";
import { sendTwilioMessage } from "../communication/client/sendTwilioMessage";
import { sendInfobipMessage } from "../communication/client/sendInfobipMessage";

export async function sendReminderSms({ invoiceId }: { invoiceId: string }) {
  try {
    console.log("Sending invoice sms");
    const user = await getUser();
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        company: true,
        invoiceItems: {
          include: {
            service: true,
            materials: true,
            labor: true,
          },
        },
        photos: true,
        tasks: true,
        column: true,
        user: true,
        client: true,
        vehicle: true,
      },
    });

    let template = await db.companyEmailTemplate.findFirst({
      where: { companyId: user.companyId },
    });

    if (!template) {
      return {
        success: false,
        message:
          "No Email Template Found. Please create one in Settings > Estimates & Invoice",
      };
    }
    if (!invoice || !invoice.client) {
      throw new Error("Invoice not found");
    }
    const clientName =
      (invoice.client?.firstName
        ? invoice.client?.firstName
        : invoice.client?.lastName) ?? " ";
    let variabledSubject = template.subject
      ?.replace("<CLIENT>", clientName)
      .replace(
        "<VEHICLE>",
        invoice.vehicle
          ? (invoice.vehicle.year || "") +
              " " +
              (invoice.vehicle.make || "") +
              " " +
              (invoice.vehicle.model || "") +
              " " +
              (invoice.vehicle.other || "")
          : "No vehicle",
      );

    let variabledBody =
      template.message
        ?.replace("<CLIENT>", clientName)

        .replace(
          "<VEHICLE>",
          invoice.vehicle
            ? (invoice.vehicle.year || "") +
                " " +
                (invoice.vehicle.make || "") +
                " " +
                (invoice.vehicle.model || "") +
                " " +
                (invoice.vehicle.other || "")
            : "No vehicle Found",
        ) +
      `\n\nInvoice Link: ${process.env.NEXT_PUBLIC_APP_URL}/public-invoice/${invoice.id}`;

    const company = await db.company.findUnique({
      where: { id: user.companyId },
      select: { smsGateway: true },
    });

    try {
      if (company?.smsGateway === "TWILIO") {
        sendTwilioMessage({
          clientId: invoice.client.id,
          message: variabledBody || "",
          attachments: [],
        });
      } else if (company?.smsGateway === "INFOBIP") {
        sendInfobipMessage({
          clientId: invoice.client.id,
          message: variabledBody || "",
          attachments: [],
        });
      }
    } catch (error) {
      console.log("🚀 ~ sendReminderSms ~ error:", error);
    }
    return {
      success: true,
    };
  } catch (error) {
    console.log("🚀 ~ sendReminderSms ~ error:", error);
    return {
      success: false,
      message: "Failed to send sms",
    };
  }
}
