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
  const existingPayment = await db.payment.findUnique({
    where: { id },
    include: {
      deposit: true,
      Refund: true, // ** Include refunds to check if payment has been refunded**
    },
  });

  if (!existingPayment) throw new Error("Payment not found");

  const originalAmount = Number(existingPayment.amount);
  const originalType = existingPayment.type;
  const isOriginalDeposit = originalType === "DEPOSIT";
  const isNewDeposit = type === "DEPOSIT";

  // ** Calculate total refunded amount**
  const totalRefunded = existingPayment.Refund.reduce(
    (sum, refund) => sum + Number(refund.amount),
    0,
  );

  // ** Validate that new amount is not less than refunded amount**
  if (amount < totalRefunded) {
    throw new Error(
      `Cannot reduce payment amount below refunded amount ($${totalRefunded.toFixed(
        2,
      )})`,
    );
    // return {
    //   type: "globalError",
    //   message: `Cannot reduce payment amount below refunded amount ($${totalRefunded.toFixed(2)})`,
    //   errorSource: [],
    // };
  }

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

  // Use transaction to ensure atomicity
  await db.$transaction(async (tx) => {
    // UPDATE PAYMENT
    const updatedPayment = await tx.payment.update({
      where: { id },
      data: {
        type,
        date: new Date(date),
        notes,
        amount,
        ...paymentTypeHandlers[type],
      },
    });

    // FETCH INVOICE
    const invoice = await tx.invoice.findUnique({
      where: { id: updatedPayment.invoiceId! },
    });
    if (!invoice) throw new Error("Invoice not found");

    // Handle deposit field changes in invoice
    if (isOriginalDeposit && isNewDeposit) {
      // Editing deposit amount - adjust invoice deposit
      const depositDifference = amount - originalAmount;
      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          deposit: {
            increment: depositDifference,
          },
        },
      });
    } else if (isOriginalDeposit && !isNewDeposit) {
      // Converting deposit to regular payment
      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          deposit: {
            decrement: originalAmount,
          },
          totalPayment: {
            increment: amount,
          },
        },
      });
    } else if (!isOriginalDeposit && isNewDeposit) {
      // Converting regular payment to deposit
      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          totalPayment: {
            decrement: originalAmount,
          },
          deposit: {
            increment: amount,
          },
        },
      });
    } else {
      // Regular payment edit - adjust totalPayment
      const paymentDifference = amount - originalAmount;
      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          totalPayment: {
            increment: paymentDifference,
          },
        },
      });
    }

    // FETCH ALL PAYMENTS for recalculation
    const payments = await tx.payment.findMany({
      where: { invoiceId: updatedPayment.invoiceId },
      orderBy: { createdAt: "asc" },
      include: {
        Refund: true, // ** Include refunds in calculation**
      },
    });

    // RECALCULATE dueAfterPayment for all payments
    let cumulativePaid = 0;
    let cumulativeDeposit = 0;

    for (const p of payments) {
      // ** Subtract refunds from the payment amount**
      const paymentRefunds = p.Refund.reduce(
        (sum, refund) => sum + Number(refund.amount),
        0,
      );
      const netPaymentAmount = Number(p.amount) - paymentRefunds;

      if (p.type === "DEPOSIT") {
        cumulativeDeposit += netPaymentAmount;
      } else {
        cumulativePaid += netPaymentAmount;
      }

      // Calculate due after this payment (considering refunds)
      const dueAfterPayment =
        Number(invoice.grandTotal) - (cumulativeDeposit + cumulativePaid);

      await tx.payment.update({
        where: { id: p.id },
        data: { dueAfterPayment },
      });
    }

    // UPDATE INVOICE DUE (final calculation with all refunds)
    const finalDue =
      Number(invoice.grandTotal) - (cumulativeDeposit + cumulativePaid);
    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        due: finalDue,
      },
    });
  });

  // ** Revalidate ALL paths that display payment/invoice data**
  revalidatePath("/estimate");
  revalidatePath("/dashboard/estimate/edit");
  revalidatePath("/dashboard/estimate/view");
  revalidatePath("/dashboard/clients");
  revalidatePath("/dashboard/client");
  revalidatePath("/dashboard/payments");

  return { type: "success", data: { id, type, amount } };
}
