"use server";

import { db } from "@/lib/db";
import getUser from "@/lib/getUser";
import { updateNewEmailChatTrack } from "../communication/client/chat-track";
import { sendInfobipEmail } from "../estimate/invoice/sendInfobipEmail";

export async function sendFleetEmail({ statementId }: { statementId: string }) {
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
        fleetStatement?.invoice?.[0].client?.firstName || "No client",
      )
      .replace(
        "<BUSINESS_NAME>",
        fleetStatement?.invoice?.[0]?.client?.company?.name ||
          "No business name",
      );
    const clientName =
      (fleetStatement?.invoice?.[0]?.client?.firstName
        ? fleetStatement?.invoice?.[0]?.client?.firstName
        : fleetStatement?.invoice?.[0]?.client?.lastName) ?? " ";

    // Add fleet statement link
    const fleetStatementLink = `${process.env.NEXT_PUBLIC_APP_URL}/public-invoice/${statementId}?fleet=true`;

    const variabledBody = `Hello ${clientName},\n\nYour fleet statement is ready. Please click the link below to view:\n\n${fleetStatementLink}`;

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
      try {
        await updateNewEmailChatTrack({
          clientId: fleetStatement?.invoice?.[0]?.client.id,
          emailLastMessage: variabledBody || "",
          lastEmailBy: "Company",
        });
      } catch {
        // chat-track failure is non-critical; email was already sent
      }
    }
    return {
      success: true,
    };
  } catch {
    return {
      success: false,
      message: "Failed to send email",
    };
  }
}
