"use server";

import { db } from "@/lib/db";
import getUser from "@/lib/getUser";
import { sendMailgunEmail } from "./sendMailgunEmail";

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
              (invoice.vehicle.model || "")
          : "No vehicle",
      )
      .replace("<businessName>", invoice?.company?.name || "No business name");
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
        )
        .replace(
          "<businessName>",
          invoice?.company?.name || "No business found",
        ) +
      `\n\nInvoice Link: ${process.env.NEXT_PUBLIC_APP_URL}/public-invoice/${invoice.id}`;

    const res = await sendMailgunEmail({
      clientId: invoice.client.id,
      subject: variabledSubject,
      text: variabledBody || "",
    });

    if (res?.id) {
      await db.mailgunEmail.create({
        data: {
          subject: invoice?.company?.name || "Autoworx",
          text: variabledBody || "",
          emailBy: "Company",
          companyId: invoice.company.id,
          clientId: invoice.client.id,
          messageId: res.id,
        },
      });
    }
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
