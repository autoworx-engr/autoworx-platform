"use server";

import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";
import { CardType, PaymentType } from "@prisma/client";
import { revalidatePath } from "next/cache";

interface CardPaymentData {
  creditCard?: string;
  cardType: CardType;
}

interface CheckPaymentData {
  checkNumber?: string;
}

interface CashPaymentData {
  receivedCash?: string;
}

interface DepositPaymentData {
  depositMethod?: string;
  depositNotes?: string;
}

interface OtherPaymentData {
  paymentMethodId?: number;
}

interface PaymentData {
  id: number;
  type: PaymentType;
  date: Date;
  notes: string;
  amount: number;
  additionalData:
    | CardPaymentData
    | CheckPaymentData
    | CashPaymentData
    | DepositPaymentData
    | OtherPaymentData;
}

export async function updatePayment({
  id,
  type,
  date,
  notes,
  amount,
  additionalData,
}: PaymentData): Promise<ServerAction> {
  console.log("Updating payment:", { id, type, date, notes, amount });

  const existingPayment = await db.payment.findUnique({ where: { id } });
  if (!existingPayment) throw new Error("Payment not found");

  const paymentTypeHandlers = {
    CARD: {
      card: {
        upsert: {
          create: {
            cardType: (additionalData as CardPaymentData).cardType,
            creditCard: (additionalData as CardPaymentData).creditCard,
          },
          update: {
            cardType: (additionalData as CardPaymentData).cardType,
            creditCard: (additionalData as CardPaymentData).creditCard,
          },
        },
      },
    },
    CHECK: {
      check: {
        upsert: {
          create: {
            checkNumber: (additionalData as CheckPaymentData).checkNumber,
          },
          update: {
            checkNumber: (additionalData as CheckPaymentData).checkNumber,
          },
        },
      },
    },
    CASH: {
      cash: {
        upsert: {
          create: {
            receivedCash: (additionalData as CashPaymentData).receivedCash,
          },
          update: {
            receivedCash: (additionalData as CashPaymentData).receivedCash,
          },
        },
      },
    },
    DEPOSIT: {
      deposit: {
        upsert: {
          create: {
            depositMethod: (additionalData as DepositPaymentData).depositMethod,
            depositNotes: (additionalData as DepositPaymentData).depositNotes,
          },
          update: {
            depositMethod: (additionalData as DepositPaymentData).depositMethod,
            depositNotes: (additionalData as DepositPaymentData).depositNotes,
          },
        },
      },
    },
    OTHER: {
      other: {
        upsert: {
          create: {
            paymentMethodId: (additionalData as OtherPaymentData)
              .paymentMethodId,
          },
          update: {
            paymentMethodId: (additionalData as OtherPaymentData)
              .paymentMethodId,
          },
        },
      },
    },
  };

  if (!paymentTypeHandlers[type]) {
    throw new Error("Invalid payment type");
  }

  // UPDATE PAYMENT (Cleaner)
  const updatedPayment = await db.payment.update({
    where: { id },
    data: {
      type,
      date: new Date(date),
      notes,
      amount,
      ...paymentTypeHandlers[type],
    },
  });

  console.log("Updated payment:", updatedPayment);

  // FETCH INVOICE
  const invoice = await db.invoice.findUnique({
    where: { id: updatedPayment.invoiceId! },
  });
  if (!invoice) throw new Error("Invoice not found");

  // FETCH ALL PAYMENTS
  const payments = await db.payment.findMany({
    where: { invoiceId: updatedPayment.invoiceId },
    orderBy: { createdAt: "asc" },
  });

  // RECALCULATE dueAfterPayment
  let cumulativePaid = 0;

  for (const p of payments) {
    cumulativePaid += Number(p.amount);
    const dueAfterPayment = Number(invoice.grandTotal) - cumulativePaid;

    await db.payment.update({
      where: { id: p.id },
      data: { dueAfterPayment },
    });
  }

  // UPDATE INVOICE DUE
  await db.invoice.update({
    where: { id: invoice.id },
    data: {
      due: Number(invoice.grandTotal) - cumulativePaid,
    },
  });

  revalidatePath("/estimate");

  return { type: "success", data: updatedPayment };
}
