import { convertInvoice } from "@/actions/estimate/invoice/convert";
import { db } from "@/lib/db";
import { sendPaymentReceivedNotification } from "@/lib/notification/payment-notify";
import { settleGiftCardReloadPayment } from "@/services/giftCardReloadSettlementService";
import { confirmShopBooking } from "@/services/confirmShopBooking";
import { env } from "next-runtime-env";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(
  (process.env.STRIPE_SECRET_KEY || env("STRIPE_SECRET_KEY")) as string,
);

const parsePaymentNotes = (notes: string | null) => {
  if (!notes) return {} as Record<string, any>;

  try {
    return JSON.parse(notes) as Record<string, any>;
  } catch {
    return {} as Record<string, any>;
  }
};

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
        env("STRIPE_WEBHOOK_SECRET")) as string,
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
          { status: 200 },
        );
      }

      // Handle virtual shop deposits — confirm the booking (creates invoice + appointment)
      if (
        paymentData.payType === "virtual_shop_deposit" &&
        paymentData.shopBookingId
      ) {
        const result = await confirmShopBooking({
          shopBookingId: paymentData.shopBookingId,
          cashPaid: Number(paymentData.amount),
        });

        const invoiceId = result.invoiceId ?? null;

        const depositPayment = await db.payment.create({
          data: {
            companyId: paymentData.companyId,
            invoiceId,
            amount: paymentData.amount,
            type: "DEPOSIT",
            date: new Date(),
            deposit: {
              create: {
                depositMethod: "Stripe",
                depositNotes: "Virtual Shop Deposit",
              },
            },
          },
        });

        await db.stripePayment.create({
          data: {
            stripePaymentIntentId: paymentIntent.id,
            companyId: paymentData.companyId,
            paymentId: depositPayment.id,
            invoiceId,
          },
        });

        return NextResponse.json({ success: true, ...result });
      }

      if (
        paymentData.payType === "virtual_shop_gift_card" &&
        (paymentData.paymentRef || paymentData.paymentId)
      ) {
        const paymentRef = String(
          paymentData.paymentRef || paymentData.paymentId || "",
        ).trim();
        const companyId = Number(paymentData.companyId);

        if (!paymentRef) {
          return NextResponse.json(
            { message: "Invalid payment session" },
            { status: 200 },
          );
        }

        const giftCardSource =
          paymentData.giftCardSource === "reload" ||
          paymentData.giftCardSource === "virtual_shop_gift_card_reload"
            ? "virtual_shop_gift_card_reload"
            : "virtual_shop_gift_card";

        const hasLegacyNumericId = /^\d+$/.test(paymentRef);
        if (hasLegacyNumericId) {
          const legacyPaymentId = Number(paymentRef);
          const legacyPayment = await db.payment.findUnique({
            where: { id: legacyPaymentId },
            select: {
              id: true,
              companyId: true,
              notes: true,
            },
          });

          const legacyNotes = parsePaymentNotes(legacyPayment?.notes || null);
          const isExpectedSource =
            legacyNotes?.source === giftCardSource ||
            (giftCardSource === "virtual_shop_gift_card" &&
              legacyNotes?.source === "virtual_shop_gift_card_purchase");

          if (legacyPayment && isExpectedSource) {
            await db.stripePayment.create({
              data: {
                stripePaymentIntentId: paymentIntent.id,
                companyId: legacyPayment.companyId,
                paymentId: legacyPayment.id,
                invoiceId: null,
              },
            });

            const reloadSettlement =
              giftCardSource === "virtual_shop_gift_card_reload"
                ? await settleGiftCardReloadPayment(legacyPayment.id)
                : { status: "not_reload_source" };

            return NextResponse.json(
              {
                message: "Gift card payment recorded",
                reloadSettlement: reloadSettlement.status,
              },
              { status: 200 },
            );
          }
        }

        if (!Number.isInteger(companyId) || companyId <= 0) {
          return NextResponse.json(
            { message: "Invalid company for payment session" },
            { status: 200 },
          );
        }

        const paymentMethodName =
          giftCardSource === "virtual_shop_gift_card_reload"
            ? "Virtual Shop Gift Card Reload"
            : "Virtual Shop Gift Card";

        let paymentMethod = await db.paymentMethod.findFirst({
          where: {
            companyId,
            name: paymentMethodName,
          },
        });

        if (!paymentMethod) {
          paymentMethod = await db.paymentMethod.create({
            data: {
              companyId,
              name: paymentMethodName,
            },
          });
        }

        const parsedGiftCardId = Number(paymentData.giftCardId);

        const createdPayment = await db.payment.create({
          data: {
            companyId,
            amount: Number(paymentData.amount),
            type: "OTHER",
            date: new Date(),
            gateway: "STRIPE",
            notes: JSON.stringify({
              source: giftCardSource,
              paymentRef,
              ...(giftCardSource === "virtual_shop_gift_card_reload"
                ? {
                    reloadData: {
                      giftCardId:
                        Number.isInteger(parsedGiftCardId) &&
                        parsedGiftCardId > 0
                          ? parsedGiftCardId
                          : undefined,
                      code:
                        typeof paymentData.giftCardCode === "string"
                          ? paymentData.giftCardCode.trim().toUpperCase()
                          : undefined,
                      requestedAmount: Number(paymentData.amount),
                    },
                  }
                : {}),
            }),
            other: {
              create: {
                paymentMethodId: paymentMethod.id,
              },
            },
          },
        });

        await db.stripePayment.create({
          data: {
            stripePaymentIntentId: paymentIntent.id,
            companyId,
            paymentId: createdPayment.id,
            invoiceId: null,
          },
        });

        const reloadSettlement =
          giftCardSource === "virtual_shop_gift_card_reload"
            ? await settleGiftCardReloadPayment(createdPayment.id)
            : { status: "not_reload_source" };

        return NextResponse.json(
          {
            message: "Gift card payment recorded",
            reloadSettlement: reloadSettlement.status,
          },
          { status: 200 },
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
            { status: 400 },
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
        // Use base amount (excluding tip) for distributing across invoices
        const statementTip = parseFloat(paymentData.tip || "0");
        const statementBaseAmount = Number(paymentData.amount);
        let totalPaid = 0;
        const invoicesWithDue = statement.invoice.filter(
          (inv) => inv.due && Number(inv.due) > 0,
        );

        const paymentRecords = [];
        let isFirstPayment = true;

        for (const invoice of invoicesWithDue) {
          const paymentAmount = Math.min(
            Number(invoice.due ?? 0),
            statementBaseAmount - totalPaid,
          );

          if (paymentAmount <= 0) break;

          // Store tip on the first payment record only
          const tipForThisRecord = isFirstPayment ? statementTip : 0;
          isFirstPayment = false;

          // Create payment record for this invoice
          let stripePayment;
          if (stripeFound === -1) {
            stripePayment = await db.payment.create({
              data: {
                companyId: paymentData.companyId,
                invoiceId: invoice.id,
                amount: paymentAmount,
                tip: tipForThisRecord,
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
                tip: tipForThisRecord,
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
              convertInvoice(invoice.id, paymentData.companyId);
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
        const tipAmount = parseFloat(paymentData.tip || "0");

        let stripePayment;
        if (stripeFound === -1) {
          // Create a payment record in the database
          if (isDeposit) {
            stripePayment = await db.payment.create({
              data: {
                companyId: paymentData.companyId,
                invoiceId: paymentData.invoiceId,
                amount: paymentData.amount,
                tip: tipAmount,
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
                tip: tipAmount,
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
                tip: tipAmount,
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
                tip: tipAmount,
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
            // For deposits, first pay off any due amount, but always keep the full deposit amount on the invoice
            const currentDue = Number(findInvoice.due ?? 0);
            const depositAmount = Number(paymentData.amount);

            if (currentDue > 0) {
              // Deposit can cover part or all of the due amount
              const amountToCoverDue = Math.min(depositAmount, currentDue);
              const newDue = Math.max(0, currentDue - amountToCoverDue);

              stripeInvoice = await db.invoice.update({
                where: {
                  id: paymentData.invoiceId,
                  companyId: paymentData.companyId,
                },
                data: {
                  due: newDue,
                  // Store the original deposit amount on the invoice
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
            // For normal payments, apply up to the current due and never let due go negative
            const currentDue = Number(findInvoice.due ?? 0);
            const paymentAmount = Number(paymentData.amount ?? 0);
            const amountToApply = Math.min(paymentAmount, currentDue);
            const newDue = Math.max(0, currentDue - amountToApply);

            stripeInvoice = await db.invoice.update({
              where: {
                id: paymentData.invoiceId,
                companyId: paymentData.companyId,
              },
              data: {
                due: newDue,
                totalPayment: {
                  increment: amountToApply,
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
            convertInvoice(paymentData.invoiceId, paymentData.companyId);
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
      { status: 400 },
    );
  }
}
