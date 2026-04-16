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
  checkNumber?: string;
  creditCard?: string;
  cardType?: CardType;
  paymentMethodId?: number;
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

    // Calculate total due amount
    const totalDue = statement.invoice.reduce(
      (sum, invoice) => sum + Number(invoice.due || 0),
      0,
    );

    if (data.amount > totalDue) {
      throw new Error(
        `Payment amount ($${data.amount}) exceeds total due amount ($${totalDue})`,
      );
    }

    // Process payment by distributing amount across invoices
    const result = await db.$transaction(
      async (tx) => {
        let remainingAmount = data.amount;
        const paymentsCreated = [];

        for (const invoice of statement.invoice) {
          if (remainingAmount <= 0) break;

          const invoiceDue = Number(invoice.due || 0);
          const paymentAmount = Math.min(remainingAmount, invoiceDue);

          if (paymentAmount > 0) {
            // Create payment record based on payment method
            let payment;

            switch (data.paymentMethod) {
              case "CARD":
                payment = await tx.payment.create({
                  data: {
                    invoiceId: invoice.id,
                    type: "CARD",
                    date: new Date(),
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
                  include: {
                    card: true,
                  },
                });
                break;

              case "CHECK":
                payment = await tx.payment.create({
                  data: {
                    invoiceId: invoice.id,
                    type: "CHECK",
                    date: new Date(),
                    notes:
                      data.notes || `Fleet statement payment - ${statement.id}`,
                    amount: paymentAmount,
                    companyId: companyId,
                    check: data.checkNumber
                      ? {
                          create: {
                            checkNumber: data.checkNumber,
                          },
                        }
                      : undefined,
                  },
                  include: {
                    check: true,
                  },
                });
                break;

              case "CASH":
                payment = await tx.payment.create({
                  data: {
                    invoiceId: invoice.id,
                    type: "CASH",
                    date: new Date(),
                    notes:
                      data.notes || `Fleet statement payment - ${statement.id}`,
                    amount: paymentAmount,
                    companyId: companyId,
                    cash: {
                      create: {
                        receivedCash: paymentAmount.toString(),
                      },
                    },
                  },
                  include: {
                    cash: true,
                  },
                });
                break;

              case "OTHER":
                payment = await tx.payment.create({
                  data: {
                    invoiceId: invoice.id,
                    type: "OTHER",
                    date: new Date(),
                    notes:
                      data.notes || `Fleet statement payment - ${statement.id}`,
                    amount: paymentAmount,
                    companyId: companyId,
                    other: data.paymentMethodId
                      ? {
                          create: {
                            paymentMethodId: data.paymentMethodId,
                          },
                        }
                      : undefined,
                  },
                  include: {
                    other: true,
                  },
                });
                break;

              default:
                throw new Error("Invalid payment method");
            }

            // Update invoice totals
            const newTotalPayment =
              Number(invoice.totalPayment || 0) + paymentAmount;
            const newDue = Number(invoice.grandTotal || 0) - newTotalPayment;

            await tx.invoice.update({
              where: { id: invoice.id },
              data: {
                totalPayment: newTotalPayment,
                due: Math.max(0, newDue), // Ensure due doesn't go negative
                type: "Invoice", // Ensure invoice is converted to Invoice type when payment is made
                convertedAt:
                  invoice.type === "Estimate"
                    ? new Date()
                    : invoice.convertedAt,
              },
            });

            paymentsCreated.push(payment);
            remainingAmount -= paymentAmount;
          }
        }

        return {
          paymentsCreated,
          totalPaid: data.amount,
          remainingAmount,
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
  } catch (error: any) {
    console.error("Error processing fleet statement payment:", error);
    return errorHandler(error);
  }
}
