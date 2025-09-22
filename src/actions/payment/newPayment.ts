"use server";

import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { sendPaymentReceivedNotification } from "@/lib/notification/payment-notify";
import { updateInvoiceAutomationTrigger } from "@/service/invoice-automation-trigger/api";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";
import { createPaymentValidationSchema } from "@/validations/schemas/payment/payment.validation";
import { CardType, InvoiceType, PaymentType } from "@prisma/client";
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

interface OtherPaymentData {
  paymentMethodId?: number;
  amount?: number;
}

interface DepositPaymentData {
  depositMethod?: string;
  depositNotes?: string;
}
interface PaymentData {
  invoiceId: string;
  type: PaymentType;
  date: Date;
  notes: string;
  amount: number;
  additionalData:
    | CardPaymentData
    | CheckPaymentData
    | CashPaymentData
    | OtherPaymentData
    | DepositPaymentData;
}

export async function newPayment({
  invoiceId,
  type,
  date,
  notes,
  amount,
  additionalData,
}: PaymentData): Promise<ServerAction | TErrorHandler> {
  try {
    const companyId = await getCompanyId();

    await createPaymentValidationSchema.parseAsync({
      invoiceId,
      type,
      date,
      notes,
      amount,
      additionalData,
    });

    // transaction use for payment process
    const { newPayment, invoice } = await db.$transaction(
      async tx => {
        // get all the product materials
        let newPayment;

        switch (type) {
          case "CARD":
            newPayment = await tx.payment.create({
              data: {
                companyId,
                invoiceId,
                date: new Date(date),
                notes,
                amount,
                type: "CARD",
                card: {
                  create: {
                    cardType: (additionalData as CardPaymentData).cardType,
                    creditCard: (additionalData as CardPaymentData).creditCard,
                  },
                },
              },
              include: {
                card: true,
              },
            });
            break;

          case "CHECK":
            newPayment = await tx.payment.create({
              data: {
                companyId,
                invoiceId,
                date: new Date(date),
                notes,
                amount,
                type: "CHECK",
                check: {
                  create: {
                    checkNumber: (additionalData as CheckPaymentData)
                      .checkNumber,
                  },
                },
              },
              include: {
                check: true,
              },
            });
            break;

          case "CASH":
            newPayment = await tx.payment.create({
              data: {
                companyId,
                invoiceId,
                date: new Date(date),
                notes,
                amount,
                type: "CASH",
                cash: {
                  create: {
                    receivedCash: (additionalData as CashPaymentData)
                      .receivedCash,
                  },
                },
              },
              include: {
                cash: true,
              },
            });
            break;

          case "OTHER":
            newPayment = await tx.payment.create({
              data: {
                companyId,
                invoiceId,
                date: new Date(date),
                notes,
                amount,
                type: "OTHER",
                other: {
                  create: {
                    paymentMethodId: (additionalData as OtherPaymentData)
                      .paymentMethodId,
                  },
                },
              },
              include: {
                other: {
                  include: {
                    paymentMethod: true,
                  },
                },
              },
            });

            break;

          case "DEPOSIT":
            // Update the invoice with the deposit amount, method, and notes
            newPayment = await tx.payment.create({
              data: {
                companyId,
                invoiceId,
                date: new Date(date),
                notes,
                amount,
                type: "DEPOSIT",
                deposit: {
                  create: {
                    depositMethod: (additionalData as DepositPaymentData)
                      .depositMethod,
                    depositNotes: (additionalData as DepositPaymentData)
                      .depositNotes,
                  },
                },
              },
            });

            await tx.invoice.update({
              where: { id: invoiceId },
              data: {
                deposit: {
                  increment: amount,
                },
                totalPayment: {
                  decrement: amount,
                },
              },
            });
            break;

          default:
            throw new Error("Invalid payment type");
        }

        // update the invoice
        let invoice = await tx.invoice.update({
          where: {
            id: invoiceId,
          },
          data: {
            type: InvoiceType.Invoice,
            due: {
              decrement: amount,
            },
            totalPayment: {
              increment: amount,
            },
          },
          include: {
            client: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        });

        sendPaymentReceivedNotification({
          companyId,
          clientName:
            invoice?.client?.firstName + " " + invoice?.client?.lastName,
          amount: amount,
          invoiceId: invoice.id,
        });

        // invoice automation trigger
        updateInvoiceAutomationTrigger({
          companyId: invoice?.companyId!,
          invoiceId: invoice?.id!,
          columnId: invoice?.columnId!,
          type: invoice?.type!,
        });

        return { newPayment, invoice };
      },
      {
        timeout: 15000, // 15 seconds
        maxWait: 6000, // 6 seconds
      }
    );

    revalidatePath("/dashboard/estimate/edit");

    return {
      type: "success",
      message: "Payment successfully created",
      data: newPayment,
    };
  } catch (err) {
    const formattedError = errorHandler(err);
    console.log({ error: formattedError.errorSource });
    return formattedError;
  }
}
