"use server";

import { sendMessage } from "@/actions/communication/client/sendMessage";
import { db } from "@/lib/db";
import getUser from "@/lib/getUser";

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

    let variabledSubject = template.subject
      ?.replace("<CLIENT>", invoice.client?.firstName || "No client")
      .replace(
        "<VEHICLE>",
        invoice.vehicle
          ? (invoice.vehicle.year || "") +
              " " +
              (invoice.vehicle.make || "") +
              " " +
              (invoice.vehicle.model || "")
          : "No vehicle",
      );
    const clientName =
      (invoice.client?.firstName
        ? invoice.client?.firstName
        : invoice.client?.lastName) ?? " ";
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
                (invoice.vehicle.model || "")
            : "No vehicle Found",
        ) +
      `\n\nInvoice Link: ${process.env.NEXT_PUBLIC_APP_URL}/public-invoice/${invoice.id}`;
    const res = await sendMessage({
      clientId: invoice.client.id,
      // subject: variabledSubject,
      message: variabledBody || "",
      attachments: [],
    });
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
