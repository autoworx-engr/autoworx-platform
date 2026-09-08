"use server";

import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { sendPaymentReceivedNotification } from "@/lib/notification/payment-notify";
import { updateInvoiceAutomationTrigger } from "@/service/invoice-automation-trigger/api";
import { updateTagAutomationTrigger } from "@/service/tag-automation-trigger/api";
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
  companyId?: number;
  /**
   * Recording a payment normally converts the estimate into an invoice. Pass
   * false to leave the record as an estimate — used when the inventory is too
   * low to fulfil it, where only the payment itself should go through.
   */
  convertToInvoice?: boolean;
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
  companyId,
  convertToInvoice = true,
}: PaymentData): Promise<ServerAction | TErrorHandler> {
  try {
    let cId = companyId;

    if (cId == null) {
      cId = await getCompanyId();
    }

    if (!cId) {
      throw new Error("Company ID could not be resolved");
    }

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
      async (tx) => {
        const currentInvoice = await tx.invoice.findUnique({
          where: { id: invoiceId },
          select: {
            due: true,
            type: true,
            workOrderCreatedAt: true,
            column: { select: { title: true } },
          },
        });

        if (!currentInvoice) {
          throw new Error("Invoice not found");
        }

        const currentDue = Number(currentInvoice.due || 0);
        const dueAfterPayment = currentDue - amount;

        // get all the product materials
        let newPayment;

        switch (type) {
          case "CARD":
            newPayment = await tx.payment.create({
              data: {
                companyId: cId,
                invoiceId,
                date: new Date(date),
                notes,
                amount,
                dueAfterPayment,
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
                companyId: cId,
                invoiceId,
                date: new Date(date),
                notes,
                amount,
                dueAfterPayment,
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
                companyId: cId,
                invoiceId,
                date: new Date(date),
                notes,
                amount,
                dueAfterPayment,
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
                companyId: cId,
                invoiceId,
                date: new Date(date),
                notes,
                amount,
                dueAfterPayment,
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
                companyId: cId,
                invoiceId,
                date: new Date(date),
                notes,
                amount,
                dueAfterPayment,
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

        // Paying an estimate converts it to an invoice, and an invoice belongs
        // in "In Progress" — the same column/type invariant every other path
        // enforces (see estimate/invoice/create.ts and updateInvoiceStatus.ts).
        // Only a "Pending" estimate is moved; anything already further along
        // keeps the column it is in.
        const isConverting =
          convertToInvoice && currentInvoice.type === InvoiceType.Estimate;
        const inProgressColumn =
          isConverting && currentInvoice.column?.title === "Pending"
            ? await tx.column.findFirst({
                where: { title: "In Progress", type: "shop", companyId: cId },
                select: { id: true },
              })
            : null;

        // update the invoice
        let invoice = await tx.invoice.update({
          where: {
            id: invoiceId,
          },
          data: {
            // `undefined` leaves the column alone, so an estimate the
            // inventory can't cover stays an estimate.
            type: convertToInvoice ? InvoiceType.Invoice : undefined,
            // A missing "In Progress" column must not fail the payment, so
            // this stays `undefined` and the invoice keeps its column.
            columnId: inProgressColumn?.id,
            // "In Progress" means it is a work order, and it must not look
            // delivered.
            ...(inProgressColumn
              ? {
                  isWorkOrder: true,
                  workOrderCreatedAt:
                    currentInvoice.workOrderCreatedAt ?? new Date(),
                  deliveredAt: null,
                }
              : {}),
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

        return { newPayment, invoice };
      },
      {
        timeout: 15000, // 15 seconds
        maxWait: 6000, // 6 seconds
      },
    );

    // Fire side effects only after the transaction has committed successfully,
    // so a later rollback can't leave a notification/automation-trigger sent
    // for a payment that never actually persisted.
    sendPaymentReceivedNotification({
      companyId: cId,
      clientName:
        `${invoice?.client?.firstName} ${invoice?.client?.lastName ?? ""}`.trim(),
      amount: amount,
      invoiceId: invoice.id,
    }).catch((err) =>
      console.error("sendPaymentReceivedNotification failed", err),
    );

    // invoice automation trigger
    updateInvoiceAutomationTrigger({
      companyId: invoice?.companyId!,
      invoiceId: invoice?.id!,
      columnId: invoice?.columnId!,
      type: invoice?.type!,
    }).catch((err) =>
      console.error("updateInvoiceAutomationTrigger failed", err),
    );

    updateTagAutomationTrigger({
      columnId: invoice?.columnId!,
      companyId: invoice?.companyId!,
      pipelineType: "SHOP",
      conditionType: "post_tag",
      invoiceId: invoice?.id!,
    }).catch((err) => console.error("updateTagAutomationTrigger failed", err));

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
