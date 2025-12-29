import { convertInvoicePublic } from "@/actions/estimate/invoice/convert";
import { db } from "@/lib/db";
import { sendPaymentReceivedNotification } from "@/lib/notification/payment-notify";
import { env } from "next-runtime-env";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(
  (process.env.STRIPE_SECRET_KEY || env("STRIPE_SECRET_KEY")) as string
);

/**
 * @swagger
 * /api/stripe/invoice-pay-hook:
 *   post:
 *     summary: Stripe webhook for payment events
 *     tags: [Stripe]
 *     parameters:
 *       - in: header
 *         name: stripe-signature
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json: {}
 *     responses:
 *       200:
 *         description: Webhook processed
 *       400:
 *         description: Missing signature or invalid event
 *       500:
 *         description: Server error
 */
export async function POST(req: NextRequest) {
  let event;
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature found" }, { status: 400 });
  }

  try {
    // Retrieve the raw body for signature verification
    const rawBody = await req.text();

    // Construct the Stripe event
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      (process.env.STRIPE_WEBHOOK_SECRET ||
        env("STRIPE_WEBHOOK_SECRET")) as string
    );

    // Handle specific event types
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object;
      const paymentData = JSON.parse(paymentIntent.metadata.paymentData);

      const alreadyProcessed = await db.stripePayment.findFirst({
        where: {
          stripePaymentIntentId: paymentIntent.id,
          companyId: paymentData.companyId,
        },
      });

      if (alreadyProcessed) {
        return NextResponse.json(
          { message: "Already processed" },
          { status: 200 }
        );
      }

      // Handle fleet statement payments
      if (paymentData.payType === "statement" && paymentData.statementId) {
        // Get all invoices in the statement
        const statement = await db.fleetStatement.findUnique({
          where: {
            id: paymentData.statementId,
          },
          include: {
            invoice: {
              where: {
                companyId: paymentData.companyId,
              },
              include: {
                client: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        });

        if (!statement || !statement.invoice.length) {
          return NextResponse.json(
            { error: "Statement or invoices not found" },
            { status: 400 }
          );
        }

        // Get or create Stripe payment method
        let paymentMethods = await db.paymentMethod.findMany({
          where: {
            companyId: +paymentData.companyId,
          },
        });

        let stripeFound = -1;
        for (let i = 0; i < paymentMethods.length; i++) {
          if (
            paymentMethods[i]?.name?.trim().toLocaleLowerCase() === "stripe"
          ) {
            stripeFound = paymentMethods[i].id;
            break;
          }
        }

        // Process payment for each invoice in the statement
        let totalPaid = 0;
        const invoicesWithDue = statement.invoice.filter(
          (inv) => inv.due && Number(inv.due) > 0
        );

        const paymentRecords = [];

        for (const invoice of invoicesWithDue) {
          const paymentAmount = Math.min(
            Number(invoice.due ?? 0),
            Number(paymentData.amount) - totalPaid
          );

          if (paymentAmount <= 0) break;

          // Create payment record for this invoice
          let stripePayment;
          if (stripeFound === -1) {
            stripePayment = await db.payment.create({
              data: {
                companyId: paymentData.companyId,
                invoiceId: invoice.id,
                amount: paymentAmount,
                type: "OTHER",
                date: new Date(),
                other: {
                  create: {
                    paymentMethod: {
                      create: {
                        name: "Stripe",
                        companyId: paymentData.companyId,
                      },
                    },
                  },
                },
              },
            });
            // Update stripeFound after creating the payment method
            const newPaymentMethod = await db.paymentMethod.findFirst({
              where: {
                name: "Stripe",
                companyId: paymentData.companyId,
              },
            });
            if (newPaymentMethod) {
              stripeFound = newPaymentMethod.id;
            }
          } else {
            stripePayment = await db.payment.create({
              data: {
                companyId: paymentData.companyId,
                invoiceId: invoice.id,
                amount: paymentAmount,
                type: "OTHER",
                date: new Date(),
                other: {
                  create: {
                    paymentMethodId: stripeFound,
                  },
                },
              },
            });
          }

          paymentRecords.push({
            paymentId: stripePayment.id,
            invoiceId: invoice.id,
          });

          // Update invoice
          await db.invoice.update({
            where: {
              id: invoice.id,
              companyId: paymentData.companyId,
            },
            data: {
              due: {
                decrement: paymentAmount,
              },
              totalPayment: {
                increment: paymentAmount,
              },
            },
          });

          // Convert estimate to invoice if needed
          try {
            if (invoice.type === "Estimate") {
              convertInvoicePublic(invoice.id, paymentData.companyId);
            }
          } catch (error) {
            console.log("🚀 ~ convert invoice public ~ error:", error);
          }

          totalPaid += paymentAmount;
        }

        // Create a single stripe payment record for the statement
        // Link it to the first payment record
        if (paymentRecords.length > 0) {
          await db.stripePayment.create({
            data: {
              stripePaymentIntentId: paymentIntent.id,
              companyId: paymentData.companyId,
              paymentId: paymentRecords[0].paymentId,
              invoiceId: paymentRecords[0].invoiceId,
            },
          });
        }

        // Send notification for statement payment
        const firstInvoice = statement.invoice[0];
        sendPaymentReceivedNotification({
          companyId: paymentData.companyId,
          amount: totalPaid,
          clientName: `${firstInvoice?.client?.firstName} ${firstInvoice?.client?.lastName}`,
          invoiceId: paymentData.statementId,
          isDeposit: false,
        });
      } else {
        // Handle individual invoice/estimate payments
        let paymentMethods = await db.paymentMethod.findMany({
          where: {
            companyId: +paymentData.companyId,
          },
        });

        let stripeFound = -1;
        for (let i = 0; i < paymentMethods.length; i++) {
          if (
            paymentMethods[i]?.name?.trim().toLocaleLowerCase() === "stripe"
          ) {
            stripeFound = paymentMethods[i].id;
            break;
          }
        }

        // Determine payment type based on payType from metadata
        const isDeposit = paymentData.payType === "deposit";
        const paymentType = isDeposit ? "DEPOSIT" : "OTHER";

        let stripePayment;
        if (stripeFound === -1) {
          // Create a payment record in the database
          if (isDeposit) {
            stripePayment = await db.payment.create({
              data: {
                companyId: paymentData.companyId,
                invoiceId: paymentData.invoiceId,
                amount: paymentData.amount,
                type: paymentType,
                date: new Date(),
                deposit: {
                  create: {
                    depositMethod: "Stripe",
                    depositNotes: "Deposit payment via Stripe",
                  },
                },
              },
            });
          } else {
            stripePayment = await db.payment.create({
              data: {
                companyId: paymentData.companyId,
                invoiceId: paymentData.invoiceId,
                amount: paymentData.amount,
                type: paymentType,
                date: new Date(),
                other: {
                  create: {
                    paymentMethod: {
                      create: {
                        name: "Stripe",
                        companyId: paymentData.companyId,
                      },
                    },
                  },
                },
              },
            });
          }
        } else {
          // Create a payment record in the database
          if (isDeposit) {
            stripePayment = await db.payment.create({
              data: {
                companyId: paymentData.companyId,
                invoiceId: paymentData.invoiceId,
                amount: paymentData.amount,
                type: paymentType,
                date: new Date(),
                deposit: {
                  create: {
                    depositMethod: "Stripe",
                    depositNotes: "Deposit payment via Stripe",
                  },
                },
              },
            });
          } else {
            stripePayment = await db.payment.create({
              data: {
                companyId: paymentData.companyId,
                invoiceId: paymentData.invoiceId,
                amount: paymentData.amount,
                type: paymentType,
                date: new Date(),
                other: {
                  create: {
                    paymentMethodId: stripeFound,
                  },
                },
              },
            });
          }
        }

        await db.stripePayment.create({
          data: {
            stripePaymentIntentId: paymentIntent.id,
            companyId: paymentData.companyId,
            paymentId: stripePayment.id,
            invoiceId: paymentData.invoiceId,
          },
        });

        const findInvoice = await db.invoice.findUnique({
          where: {
            id: paymentData.invoiceId,
            companyId: paymentData.companyId,
          },
        });

        let stripeInvoice = null;

        if (findInvoice) {
          // Update invoice differently based on payment type
          if (isDeposit) {
            // For deposits, first pay off any due amount, then keep the rest as deposit
            const currentDue = Number(findInvoice.due ?? 0);
            const depositAmount = Number(paymentData.amount);

            if (currentDue > 0) {
              // Deposit can cover part or all of the due amount
              const amountToCoverDue = Math.min(depositAmount, currentDue);
              const remainingDeposit = depositAmount - amountToCoverDue;
              const newDue = Math.max(0, currentDue - amountToCoverDue);

              stripeInvoice = await db.invoice.update({
                where: {
                  id: paymentData.invoiceId,
                  companyId: paymentData.companyId,
                },
                data: {
                  due: newDue,
                  totalPayment: {
                    increment: amountToCoverDue,
                  },
                  deposit: {
                    increment: remainingDeposit,
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
            } else {
              // No due amount, all deposit goes to deposit field
              stripeInvoice = await db.invoice.update({
                where: {
                  id: paymentData.invoiceId,
                  companyId: paymentData.companyId,
                },
                data: {
                  deposit: {
                    increment: depositAmount,
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
            }
          } else {
            // For payments, decrement due and increment totalPayment
            stripeInvoice = await db.invoice.update({
              where: {
                id: paymentData.invoiceId,
                companyId: paymentData.companyId,
              },
              data: {
                due: {
                  decrement: paymentData.amount,
                },
                totalPayment: {
                  increment: paymentData.amount,
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
          }
        }

        try {
          if (findInvoice?.type === "Estimate") {
            convertInvoicePublic(paymentData.invoiceId, paymentData.companyId);
          }
        } catch (error) {
          console.log("🚀 ~ convert invoice public ~ error:", error);
        }

        // Send a notification about the payment/deposit received
        sendPaymentReceivedNotification({
          companyId: paymentData.companyId,
          amount: paymentData.amount,
          clientName: `${stripeInvoice?.client?.firstName} ${stripeInvoice?.client?.lastName}`,
          invoiceId: paymentData.invoiceId,
          isDeposit,
        });
      }
    }

    // Respond to Stripe with a 200 status to acknowledge receipt
    return NextResponse.json({ message: "Webhook received" }, { status: 200 });
  } catch (error: any) {
    console.error("🚀 ~ Webhook Error:", error);
    return NextResponse.json(
      { error: `Webhook Error: ${error?.message}` },
      { status: 400 }
    );
  }
}
