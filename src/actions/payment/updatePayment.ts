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
  const existingPayment = await db.payment.findUnique({ where: { id } });

  if (!existingPayment) throw new Error("Payment not found");

  let updatedPayment;

  switch (type) {
    case "CARD":
      updatedPayment = await db.payment.update({
        where: { id },
        data: {
          type,
          date: new Date(date),
          notes,
          amount,
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
      });
      break;

    case "CHECK":
      updatedPayment = await db.payment.update({
        where: { id },
        data: {
          type,
          date: new Date(date),
          notes,
          amount,
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
      });
      break;

    case "CASH":
      updatedPayment = await db.payment.update({
        where: { id },
        data: {
          type,
          date: new Date(date),
          notes,
          amount,
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
      });
      break;

    case "DEPOSIT":
      updatedPayment = await db.payment.update({
        where: { id },
        data: {
          type,
          date: new Date(date),
          notes,
          amount,
          deposit: {
            upsert: {
              create: {
                depositMethod: (additionalData as DepositPaymentData)
                  .depositMethod,
                depositNotes: (additionalData as DepositPaymentData)
                  .depositNotes,
              },
              update: {
                depositMethod: (additionalData as DepositPaymentData)
                  .depositMethod,
                depositNotes: (additionalData as DepositPaymentData)
                  .depositNotes,
              },
            },
          },
        },
      });
      break;

    case "OTHER":
      updatedPayment = await db.payment.update({
        where: { id },
        data: {
          type,
          date: new Date(date),
          notes,
          amount,
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
      });
      break;

    default:
      throw new Error("Invalid payment type");
  }

  // --- recalc invoice ---
  const invoice = await db.invoice.findUnique({
    where: { id: updatedPayment.invoiceId! },
  });

  const previousAmount = Number(existingPayment.amount);
  const newDue =
    Number(invoice!.due) + previousAmount - Number(updatedPayment.amount);

  await db.invoice.update({
    where: { id: invoice!.id },
    data: { due: newDue },
  });

  revalidatePath("/estimate");

  return { type: "success", data: updatedPayment };
}
