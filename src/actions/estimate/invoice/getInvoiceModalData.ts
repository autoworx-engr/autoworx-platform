"use server";

import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";

export async function getInvoiceModalData(id: string) {
  try {
    const session = await getServerSession(authOptions);
    const companyId = session?.user.companyId;

    let invoice = await db.invoice.findFirst({
      where: { id },
      include: {
        company: true,
        invoiceItems: {
          include: {
            service: {
              include: {
                Technician: true,
              },
            },
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
        Refund: true,
        payments: {
          include: {
            card: true,
            check: true,
            cash: true,
            other: {
              include: {
                paymentMethod: true,
              },
            },
            deposit: true,
            Refund: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (invoice && companyId && invoice.companyId !== companyId) {
      const requestLink = await db.requestEstimate.findFirst({
        where: {
          invoiceId: id,
          OR: [
            { senderCompanyId: companyId },
            { receiverCompanyId: companyId },
          ],
        },
        select: { id: true },
      });
      if (!requestLink) {
        invoice = null;
      }
    }

    const twilioCredential = await db.twilioCredentials.findFirst({
      where: {
        companyId: invoice?.companyId,
      },
    });

    const infobipConfig = await db.infobipConfig.findFirst({
      where: {
        companyId: invoice?.companyId,
      },
    });

    const twilioCredentials = twilioCredential || infobipConfig || null;

    return {
      invoice: JSON.parse(JSON.stringify(invoice)),
      twilioCredentials,
    };
  } catch (error) {
    console.error("[getInvoiceModalData] Failed to fetch invoice data:", error);
    throw error;
  }
}
