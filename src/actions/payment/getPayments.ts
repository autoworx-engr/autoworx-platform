"use server";

import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { PaymentType } from "@prisma/client";

export interface ReturnPayment {
  id: number;
  invoiceId: string;
  client: {
    id?: number;
    name?: string;
  };
  vehicle?: string;
  date: Date;
  amount: number;
  tip: number;
  refundedAmount: number;
  refundMethod?: string;
  refundReason?: string;
  refundDate?: Date;
  method: string;
  paid: boolean;
  paymentType: PaymentType;
  cashReceived?: string | null;
}

export async function getPayments(): Promise<ReturnPayment[]> {
  const companyId = await getCompanyId();

  const payments = await db.payment.findMany({
    where: {
      companyId,
    },
    include: {
      invoice: {
        include: {
          vehicle: true,
          client: true,
        },
      },
      card: true,
      cash: true,
      check: true,
      other: {
        include: {
          paymentMethod: true,
        },
      },
      deposit: true,
      stripePayment: {
        select: {
          id: true,
        },
      },
      authorizeNetPayment: {
        select: {
          id: true,
        },
      },
    },
    orderBy: {
      date: "desc",
    },
  });

  const filteredPayments = payments.filter((payment) => {
    const notes = parsePaymentNotes(payment.notes);
    const source = notes?.source;

    const isGiftCardSource =
      source === "virtual_shop_gift_card" ||
      source === "virtual_shop_gift_card_purchase" ||
      source === "virtual_shop_gift_card_reload";

    if (!isGiftCardSource) {
      return true;
    }

    return Boolean(payment.stripePayment || payment.authorizeNetPayment);
  });

  return filteredPayments.map((payment) => {
    const notes = parsePaymentNotes(payment.notes);

    const invoiceClientName =
      `${payment?.invoice?.client?.firstName || ""} ${payment?.invoice?.client?.lastName || ""}`.trim();
    const fallbackClientName =
      typeof notes?.purchaserName === "string"
        ? notes.purchaserName
        : typeof notes?.purchaseData?.purchaserName === "string"
          ? notes.purchaseData.purchaserName
          : undefined;

    const clientName = invoiceClientName || fallbackClientName || undefined;
    const fallbackClientId = Number(notes?.purchaserClientId);

    return {
      id: payment.id,
      invoiceId: payment.invoiceId || "",
      client: {
        id:
          payment?.invoice?.client?.id ||
          (Number.isInteger(fallbackClientId) ? fallbackClientId : undefined),
        name: clientName,
      },
      vehicle: `${payment?.invoice?.vehicle?.year || ""} ${payment?.invoice?.vehicle?.make || ""} ${payment?.invoice?.vehicle?.model || ""} ${payment?.invoice?.vehicle?.other || ""}`,
      date: (payment.date || payment.createdAt) as Date,
      amount: Number(payment.amount),
      tip: Number(payment.tip) || 0,
      refundedAmount: Number(payment.refundedAmount) || 0,
      refundMethod: payment.refundMethod as string,
      refundReason: payment.refundReason ?? undefined,
      refundDate: payment.refundCreatedAt ?? undefined,
      method: getPaymentMethod(payment),
      paid: payment.invoice
        ? Number(payment.invoice?.grandTotal) <= Number(payment.amount)
        : true,
      paymentType: payment.type,
      cashReceived: payment.cash?.receivedCash || null,
    };
  });
}

function parsePaymentNotes(
  notes: string | null | undefined,
): Record<string, any> {
  if (!notes) return {};
  try {
    return JSON.parse(notes);
  } catch {
    return {};
  }
}

function getPaymentMethod(payment: any) {
  if (payment.card) {
    return "Card";
  } else if (payment.cash) {
    return "Cash";
  } else if (payment.check) {
    return "Cheque";
  } else if (payment.other) {
    return payment.other.paymentMethod?.name;
  } else if (payment.type === "DEPOSIT") {
    return "Deposit";
  } else {
    return "Unknown";
  }
}
