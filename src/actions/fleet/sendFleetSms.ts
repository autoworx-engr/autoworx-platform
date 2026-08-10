"use server";

import { db } from "@/lib/db";
import getUser from "@/lib/getUser";
import { sendTwilioMessage } from "../communication/client/sendTwilioMessage";
import { sendInfobipMessage } from "../communication/client/sendInfobipMessage";

export async function sendFleetSms({ statementId }: { statementId: string }) {
  try {
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

    // Add fleet statement link
    const fleetStatementLink = `${process.env.NEXT_PUBLIC_APP_URL}/public-invoice/${statementId}?fleet=true`;

    const variabledBody = `Hello ${clientName},\n\nYour fleet statement is ready. Please click the link below to view:\n\n${fleetStatementLink}`;

    const company = await db.company.findUnique({
      where: { id: user.companyId },
      select: { smsGateway: true },
    });
    if (company?.smsGateway === "TWILIO") {
      await sendTwilioMessage({
        clientId: fleetStatement?.invoice?.[0]?.client?.id!,
        message: variabledBody || "",
        attachments: [],
      });
    } else if (company?.smsGateway === "INFOBIP") {
      await sendInfobipMessage({
        clientId: fleetStatement?.invoice?.[0]?.client?.id!,
        message: variabledBody || "",
        attachments: [],
      });
    }

    return {
      success: true,
    };
  } catch {
    return {
      success: false,
      message: "Failed to send sms",
    };
  }
}
