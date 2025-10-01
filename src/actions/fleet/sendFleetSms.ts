"use server";

import { db } from "@/lib/db";
import getUser from "@/lib/getUser";
import { sendTwilioMessage } from "../communication/client/sendTwilioMessage";
import { sendInfobipMessage } from "../communication/client/sendInfobipMessage";

export async function sendFleetSms({ statementId }: { statementId: string }) {
  try {
    console.log("Sending fleet statement sms");
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

    if (fleetStatement && !fleetStatement?.invoice?.[0]?.client?.mobile) {
      return {
        success: false,
        message: "Client does not have an mobile",
      };
    }

    if (!fleetStatement || fleetStatement?.invoice?.length == 0) {
      throw new Error("Fleet statement not found!");
    }

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

    const company = await db.company.findUnique({
      where: { id: user.companyId },
      select: { smsGateway: true },
    });
    try {
      if (company?.smsGateway === "TWILIO") {
        sendTwilioMessage({
          clientId: fleetStatement?.invoice?.[0]?.client?.id!,
          message: variabledBody || "",
          attachments: [],
        });
      } else if (company?.smsGateway === "INFOBIP") {
        sendInfobipMessage({
          clientId: fleetStatement?.invoice?.[0]?.client?.id!,
          message: variabledBody || "",
          attachments: [],
        });
      }
    } catch (error) {
      console.log("🚀 ~ sendFleetSms ~ error:", error);
    }

    return {
      success: true,
    };
  } catch (error) {
    console.log("🚀 ~ sendFleetSms ~ error:", error);
    return {
      success: false,
      message: "Failed to send sms",
    };
  }
}
