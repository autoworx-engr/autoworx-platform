"use server";

import { authOptions } from "@/authOptions";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";
import { makeFleetStatementPaymentValidationSchema } from "@/validations/schemas/fleet/statement.validation";
import { CardType, PaymentType } from "@prisma/client";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

export async function makeFleetStatementPayment(data: {
  statementId: string;
  amount: number;
  paymentMethod: PaymentType;
  notes?: string;
  date?: Date;
  checkNumber?: string;
  creditCard?: string;
  cardType?: CardType;
  paymentMethodId?: number;
  receivedCash?: string;
}): Promise<ServerAction | TErrorHandler> {
  try {
    // Validate input
    await makeFleetStatementPaymentValidationSchema.parseAsync(data);

    const session = await getServerSession(authOptions);
    const companyId = session?.user.companyId;
    const userId = session?.user.id;

    if (!companyId || !userId) {
      throw new Error("Authentication required");
    }

    // Get fleet statement with unpaid invoices
    const statement = await db.fleetStatement.findFirst({
      where: {
        id: data.statementId,
        Fleet: {
          client: {
            companyId: companyId,
          },
        },
      },
      include: {
        Fleet: {
          include: {
            client: true,
          },
        },
        invoice: {
          where: {
            due: {
              gt: 0, // Only unpaid invoices
            },
          },
          orderBy: {
            createdAt: "asc", // Pay older invoices first
          },
        },
      },
    });

    if (!statement) {
      throw new Error("Fleet statement not found");
    }

    if (statement.invoice.length === 0) {
      throw new Error("No unpaid invoices found in this statement");
    }

    const paymentDate = data.date ?? new Date();

    // Use integer cents throughout to avoid float precision errors
    const toInt = (v: number | null | undefined) =>
      Math.round(Number(v ?? 0) * 100);

    const totalDueCents = statement.invoice.reduce(
      (sum, invoice) => sum + toInt(Number(invoice.due)),
      0,
    );
    const paymentAmountCents = toInt(data.amount);

    if (paymentAmountCents > totalDueCents) {
      throw new Error(
        `Payment amount ($${data.amount}) exceeds total due amount ($${totalDueCents / 100})`,
      );
    }

    // Process payment by distributing amount across invoices
    const result = await db.$transaction(
      async (tx) => {
        let remainingCents = paymentAmountCents;
        const paymentsCreated = [];

        for (const invoice of statement.invoice) {
          if (remainingCents <= 0) break;

          const invoiceDueCents = toInt(Number(invoice.due));
          const paymentCents = Math.min(remainingCents, invoiceDueCents);
          const paymentAmount = paymentCents / 100;

          if (paymentCents > 0) {
            let payment;

            switch (data.paymentMethod) {
              case "CARD":
                payment = await tx.payment.create({
                  data: {
                    invoiceId: invoice.id,
                    type: "CARD",
                    date: paymentDate,
                    notes:
                      data.notes || `Fleet statement payment - ${statement.id}`,
                    amount: paymentAmount,
                    companyId: companyId,
                    card:
                      data.creditCard && data.cardType
                        ? {
                            create: {
                              creditCard: data.creditCard,
                              cardType: data.cardType,
                            },
                          }
                        : undefined,
                  },
                  include: { card: true },
                });
                break;

              case "CHECK":
                payment = await tx.payment.create({
                  data: {
                    invoiceId: invoice.id,
                    type: "CHECK",
                    date: paymentDate,
                    notes:
                      data.notes || `Fleet statement payment - ${statement.id}`,
                    amount: paymentAmount,
                    companyId: companyId,
                    check: data.checkNumber
                      ? { create: { checkNumber: data.checkNumber } }
                      : undefined,
                  },
                  include: { check: true },
                });
                break;

              case "CASH":
                payment = await tx.payment.create({
                  data: {
                    invoiceId: invoice.id,
                    type: "CASH",
                    date: paymentDate,
                    notes:
                      data.notes || `Fleet statement payment - ${statement.id}`,
                    amount: paymentAmount,
                    companyId: companyId,
                    cash: {
                      create: {
                        receivedCash:
                          data.receivedCash ?? paymentAmount.toString(),
                      },
                    },
                  },
                  include: { cash: true },
                });
                break;

              case "OTHER":
                payment = await tx.payment.create({
                  data: {
                    invoiceId: invoice.id,
                    type: "OTHER",
                    date: paymentDate,
                    notes:
                      data.notes || `Fleet statement payment - ${statement.id}`,
                    amount: paymentAmount,
                    companyId: companyId,
                    other: data.paymentMethodId
                      ? { create: { paymentMethodId: data.paymentMethodId } }
                      : undefined,
                  },
                  include: { other: true },
                });
                break;

              default:
                throw new Error("Invalid payment method");
            }

            // Compute updated totals in integer cents to avoid float drift
            const newTotalPaymentCents =
              toInt(Number(invoice.totalPayment)) + paymentCents;
            const newDueCents =
              toInt(Number(invoice.grandTotal)) - newTotalPaymentCents;

            await tx.invoice.update({
              where: { id: invoice.id },
              data: {
                totalPayment: newTotalPaymentCents / 100,
                due: Math.max(0, newDueCents / 100),
                type: "Invoice",
                convertedAt:
                  invoice.type === "Estimate"
                    ? new Date()
                    : invoice.convertedAt,
              },
            });

            paymentsCreated.push(payment);
            remainingCents -= paymentCents;
          }
        }

        return {
          paymentsCreated,
          totalPaid: data.amount,
          remainingAmount: remainingCents / 100,
        };
      },
      {
        timeout: 15000, // 15 seconds
        maxWait: 6000, // 6 seconds
      },
    );

    revalidatePath("/dashboard/fleet");

    return {
      type: "success",
      message: `Payment of $${data.amount} processed successfully across ${result.paymentsCreated.length} invoice(s)`,
      data: result,
    };
  } catch (error: unknown) {
    return errorHandler(error);
  }
}
