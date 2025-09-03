"use server";

import { db } from "@/lib/db";
import getUser from "@/lib/getUser";
import { sendInfobipEmail } from "./sendInfobipEmail";

export async function sendInvoiceEmail({ invoiceId }: { invoiceId: string }) {
  try {
    console.log("Sending invoice email");

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

    if (!invoice?.client?.email) {
      return {
        success: false,
        message: "Client does not have an email",
      };
    }

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
              (invoice.vehicle.model || "") +
              " " +
              (invoice.vehicle.other || "")
          : "No vehicle"
      )
      .replace("<BUSINESS_NAME>", invoice?.company?.name || "No business name");
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
                (invoice.vehicle.model || "") +
                " " +
                (invoice.vehicle.other || "")
            : "No vehicle Found"
        )
        .replace(
          "<BUSINESS_NAME>",
          invoice?.company?.name || "No business found"
        ) +
      `\n\n${process.env.NEXT_PUBLIC_APP_URL}/public-invoice/${invoice.id}`;

    const res = await sendInfobipEmail({
      clientId: invoice.client.id,
      subject: variabledSubject,
      text: variabledBody || "",
    });

    return {
      success: true,
    };
  } catch (error) {
    console.log("🚀 ~ sendInvoiceEmail ~ error:", error);
    return {
      success: false,
      message: "Failed to send email",
    };
  }
}
