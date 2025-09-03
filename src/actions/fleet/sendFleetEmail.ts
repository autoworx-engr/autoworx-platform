"use server";

import { db } from "@/lib/db";
import getUser from "@/lib/getUser";
import { updateNewEmailChatTrack } from "../communication/client/chat-track";
import { sendInfobipEmail } from "../estimate/invoice/sendInfobipEmail";

export async function sendFleetEmail({ statementId }: { statementId: string }) {
  try {
    console.log("Sending fleet statement email");

    const user = await getUser();
    const fleetStatement = await db.fleetStatement.findUnique({
      where: { id: statementId },
      include: {
        invoice: {
          where: {
            type: "Invoice",
          },
          include: {
            vehicle: true,
            client: {
              include: {
                company: true,
              },
            },
          },
        },
      },
    });

    if (fleetStatement && !fleetStatement?.invoice?.[0]?.client?.email) {
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
    if (!fleetStatement || !fleetStatement?.invoice?.[0].client) {
      throw new Error("Fleet statement not found!");
    }

    let variabledSubject = template.subject
      ?.replace(
        "<CLIENT>",
        fleetStatement?.invoice?.[0].client?.firstName || "No client"
      )
      .replace(
        "<BUSINESS_NAME>",
        fleetStatement?.invoice?.[0]?.client?.company?.name ||
          "No business name"
      );
    const clientName =
      (fleetStatement?.invoice?.[0]?.client?.firstName
        ? fleetStatement?.invoice?.[0]?.client?.firstName
        : fleetStatement?.invoice?.[0]?.client?.lastName) ?? " ";
    const invoices = fleetStatement?.invoice || [];

    const tableHeader = `+------------+----------+----------+----------------------------+
| Year       | Make     | Model    | Invoice Link               |
+------------+----------+----------+----------------------------+`;

    const tableRows = invoices.map((inv) => {
      const year = inv.vehicle?.year || "N/A";
      const make = inv.vehicle?.make || "N/A";
      const model = inv.vehicle?.model || "N/A";
      const link = `${process.env.NEXT_PUBLIC_APP_URL}/public-invoice/${inv.id}`;

      // Pad columns to fixed width (align left)
      const pad = (text: string, length: number) =>
        text.length >= length
          ? text.slice(0, length - 1) + "…"
          : text.padEnd(length);

      return `| ${pad(year.toString(), 10)} | ${pad(make, 8)} | ${pad(model, 8)} | ${pad(link, 26)} |`;
    });

    const tableFooter = `+------------+----------+----------+----------------------------+`;

    const table = [tableHeader, ...tableRows, tableFooter].join("\n");

    const variabledBody = `Client: ${clientName}\n\n${table}`;

    const res = await sendInfobipEmail({
      clientId: fleetStatement?.invoice?.[0]?.client.id,
      subject: variabledSubject,
      text: variabledBody || "",
    });

    if (res?.id) {
      await db.mailgunEmail.create({
        data: {
          subject:
            fleetStatement?.invoice?.[0]?.client?.company?.name || "Autoworx",
          text: variabledBody || "",
          emailBy: "Company",
          companyId: fleetStatement?.invoice?.[0]?.client?.company.id,
          clientId: fleetStatement?.invoice?.[0]?.client.id,
          messageId: res.id,
        },
      });
      await updateNewEmailChatTrack({
        clientId: fleetStatement?.invoice?.[0]?.client.id,
        emailLastMessage: variabledBody || "",
        lastEmailBy: "Company",
      });
    }
    return {
      success: true,
    };
  } catch (error) {
    console.log("🚀 ~ send FleetEmail ~ error:", error);
    return {
      success: false,
      message: "Failed to send email",
    };
  }
}
