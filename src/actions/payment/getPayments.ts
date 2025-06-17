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
  refundedAmount: number;
  refundMethod?: string;
  refundReason?: string;
  refundDate?: Date;
  method: string;
  paid: boolean;
  paymentType: PaymentType;
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
    },
  });

  return payments.map((payment) => {
    return {
      id: payment.id,
      invoiceId: payment.invoiceId as string,
      client: {
        id: payment?.invoice?.client?.id,
        name:
          payment?.invoice?.client?.firstName +
          " " +
          payment?.invoice?.client?.lastName,
      },
      vehicle: `${payment?.invoice?.vehicle?.year || ""} ${payment?.invoice?.vehicle?.make || ""} ${payment?.invoice?.vehicle?.model || ""}`,
      date: payment.date as Date,
      amount: Number(payment.amount),
      refundedAmount: Number(payment.refundedAmount) || 0,
      refundMethod: payment.refundMethod as string,
      refundReason: payment.refundReason ?? undefined,
      refundDate: payment.refundCreatedAt ?? undefined,
      method: getPaymentMethod(payment),
      paid: Number(payment.invoice?.grandTotal) <= Number(payment.amount),
      paymentType: payment.type,
    };
  });
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
