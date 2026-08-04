import { convertInvoice } from "@/actions/estimate/invoice/convert";
import { db } from "@/lib/db";
import { sendPaymentReceivedNotification } from "@/lib/notification/payment-notify";
import { findPendingGiftCardPurchasePayment } from "@/services/giftCardPurchasePaymentLink";
import { settleGiftCardPurchasePayment } from "@/services/giftCardPurchaseSettlementService";
import { settleGiftCardReloadPayment } from "@/services/giftCardReloadSettlementService";
import { confirmShopBooking } from "@/services/confirmShopBooking";
import { markWebhookPoison } from "@/workers/recordWebhookFailure";

const parsePaymentNotes = (notes: string | null) => {
  if (!notes) return {} as Record<string, any>;
  try {
    return JSON.parse(notes) as Record<string, any>;
  } catch {
    return {} as Record<string, any>;
  }
};

export async function processStripePayment(eventId: string) {
  const webhookEvent = await db.webhookEvent.findUnique({
    where: { eventId },
  });

  if (!webhookEvent) throw new Error(`WebhookEvent not found: ${eventId}`);
  if (webhookEvent.status === "PROCESSED") return;

  const event = webhookEvent.payload as Record<string, any>;
  const paymentIntent = event?.data?.object;

  // Poison guard: a structurally broken payload fails identically every retry.
  if (!paymentIntent?.metadata?.paymentData) {
    await markWebhookPoison(
      eventId,
      "missing data.object.metadata.paymentData",
    );
    return;
  }
  let paymentData: Record<string, any>;
  try {
    paymentData = JSON.parse(paymentIntent.metadata.paymentData);
  } catch {
    await markWebhookPoison(eventId, "invalid paymentData JSON");
    return;
  }

  console.log("[stripe-worker] processing payment intent:", {
    eventId,
    paymentIntentId: paymentIntent.id,
    payType: paymentData.payType,
    companyId: paymentData.companyId,
    paymentRef: paymentData.paymentRef,
  });

  // Secondary idempotency guard
  const alreadyProcessed = await db.stripePayment.findFirst({
    where: {
      stripePaymentIntentId: paymentIntent.id,
      companyId: paymentData.companyId,
    },
  });

  if (alreadyProcessed) {
    await db.webhookEvent.update({
      where: { eventId },
      data: { status: "PROCESSED", processedAt: new Date() },
    });
    return;
  }

  // ── virtual_shop_deposit ──────────────────────────────────────────────────
  if (
    paymentData.payType === "virtual_shop_deposit" &&
    paymentData.shopBookingId
  ) {
    const result = await confirmShopBooking({
      shopBookingId: paymentData.shopBookingId,
      cashPaid: Number(paymentData.amount),
    });

    const invoiceId = result.invoiceId ?? null;

    await db.$transaction(async (tx) => {
      const depositPayment = await tx.payment.create({
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

      await tx.stripePayment.create({
        data: {
          stripePaymentIntentId: paymentIntent.id,
          companyId: paymentData.companyId,
          paymentId: depositPayment.id,
          invoiceId,
        },
      });

      await tx.webhookEvent.update({
        where: { eventId },
        data: { status: "PROCESSED", processedAt: new Date() },
      });
    });

    return;
  }

  // ── virtual_shop_gift_card ────────────────────────────────────────────────
  if (
    paymentData.payType === "virtual_shop_gift_card" &&
    (paymentData.paymentRef || paymentData.paymentId)
  ) {
    const paymentRef = String(
      paymentData.paymentRef || paymentData.paymentId || "",
    ).trim();
    const companyId = Number(paymentData.companyId);

    console.log("[stripe-worker][gift-card] branch entered:", {
      paymentRef,
      companyId,
      giftCardSource: paymentData.giftCardSource,
    });

    if (!paymentRef) {
      console.log("[stripe-worker][gift-card] no paymentRef, skipping");
      await db.webhookEvent.update({
        where: { eventId },
        data: { status: "PROCESSED", processedAt: new Date() },
      });
      return;
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
        select: { id: true, companyId: true, notes: true },
      });

      const legacyNotes = parsePaymentNotes(legacyPayment?.notes || null);
      const isExpectedSource =
        legacyNotes?.source === giftCardSource ||
        (giftCardSource === "virtual_shop_gift_card" &&
          legacyNotes?.source === "virtual_shop_gift_card_purchase");

      if (legacyPayment && isExpectedSource) {
        await db.$transaction(async (tx) => {
          await tx.stripePayment.create({
            data: {
              stripePaymentIntentId: paymentIntent.id,
              companyId: legacyPayment.companyId,
              paymentId: legacyPayment.id,
              invoiceId: null,
            },
          });
          await tx.webhookEvent.update({
            where: { eventId },
            data: { status: "PROCESSED", processedAt: new Date() },
          });
        });

        if (giftCardSource === "virtual_shop_gift_card_reload") {
          await settleGiftCardReloadPayment(legacyPayment.id);
        }
        return;
      }
    }

    if (!Number.isInteger(companyId) || companyId <= 0) {
      await db.webhookEvent.update({
        where: { eventId },
        data: { status: "PROCESSED", processedAt: new Date() },
      });
      return;
    }

    // Purchase sessions persist their payload at initiate time — link the
    // charge to that row and issue here, so the browser is never load-bearing.
    if (giftCardSource === "virtual_shop_gift_card") {
      const pending = await findPendingGiftCardPurchasePayment(
        paymentRef,
        companyId,
      );

      if (pending) {
        const gatewayAmount = Number(paymentData.amount);

        await db.$transaction(async (tx) => {
          await tx.stripePayment.create({
            data: {
              stripePaymentIntentId: paymentIntent.id,
              companyId,
              paymentId: pending.id,
              invoiceId: null,
            },
          });

          await tx.payment.update({
            where: { id: pending.id },
            data: {
              gateway: "STRIPE",
              date: new Date(),
              ...(Number.isFinite(gatewayAmount) && gatewayAmount > 0
                ? { amount: gatewayAmount }
                : {}),
            },
          });

          await tx.webhookEvent.update({
            where: { eventId },
            data: { status: "PROCESSED", processedAt: new Date() },
          });
        });

        console.log(
          "[stripe-worker][gift-card] linked charge to pending purchase payment:",
          pending.id,
        );

        const settlement = await settleGiftCardPurchasePayment(pending.id);
        console.log("[stripe-worker][gift-card] settlement:", {
          paymentId: pending.id,
          status: settlement.status,
          giftCardId: settlement.giftCardId,
        });

        return;
      }
    }

    const paymentMethodName =
      giftCardSource === "virtual_shop_gift_card_reload"
        ? "Virtual Shop Gift Card Reload"
        : "Virtual Shop Gift Card";

    let paymentMethod = await db.paymentMethod.findFirst({
      where: { companyId, name: paymentMethodName },
    });

    if (!paymentMethod) {
      paymentMethod = await db.paymentMethod.create({
        data: { companyId, name: paymentMethodName },
      });
    }

    const parsedGiftCardId = Number(paymentData.giftCardId);

    let createdPaymentId: number;

    await db.$transaction(async (tx) => {
      const createdPayment = await tx.payment.create({
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
                      Number.isInteger(parsedGiftCardId) && parsedGiftCardId > 0
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
          other: { create: { paymentMethodId: paymentMethod!.id } },
        },
      });

      await tx.stripePayment.create({
        data: {
          stripePaymentIntentId: paymentIntent.id,
          companyId,
          paymentId: createdPayment.id,
          invoiceId: null,
        },
      });

      await tx.webhookEvent.update({
        where: { eventId },
        data: { status: "PROCESSED", processedAt: new Date() },
      });

      createdPaymentId = createdPayment.id;
    });

    console.log("[stripe-worker][gift-card] payment recorded:", {
      paymentId: createdPaymentId!,
      paymentRef,
      giftCardSource,
    });

    if (giftCardSource === "virtual_shop_gift_card_reload") {
      await settleGiftCardReloadPayment(createdPaymentId!);
    } else {
      console.log(
        "[stripe-worker][gift-card] purchase recorded but NOT issued here — waiting for browser to call /confirmation for paymentId:",
        createdPaymentId!,
      );
    }

    return;
  }

  // ── statement ─────────────────────────────────────────────────────────────
  if (paymentData.payType === "statement" && paymentData.statementId) {
    const statement = await db.fleetStatement.findUnique({
      where: { id: paymentData.statementId },
      include: {
        invoice: {
          where: { companyId: paymentData.companyId },
          include: { client: { select: { firstName: true, lastName: true } } },
        },
      },
    });

    if (!statement || !statement.invoice.length) {
      throw new Error(
        `Statement ${paymentData.statementId} not found or has no invoices`,
      );
    }

    const stripeMethod = await db.paymentMethod.findFirst({
      where: {
        companyId: +paymentData.companyId,
        name: { equals: "Stripe", mode: "insensitive" },
      },
    });
    let stripePaymentMethodId = stripeMethod?.id ?? -1;

    const statementTip = parseFloat(paymentData.tip || "0");
    const statementBaseAmount = Number(paymentData.amount);
    const invoicesWithDue = statement.invoice.filter(
      (inv) => inv.due && Number(inv.due) > 0,
    );

    let totalPaid = 0;
    let firstPaymentRecord: { paymentId: number; invoiceId: string } | null =
      null;
    let isFirstPayment = true;

    await db.$transaction(async (tx) => {
      for (const invoice of invoicesWithDue) {
        const paymentAmount = Math.min(
          Number(invoice.due ?? 0),
          statementBaseAmount - totalPaid,
        );
        if (paymentAmount <= 0) break;

        const tipForThisRecord = isFirstPayment ? statementTip : 0;
        isFirstPayment = false;

        let payment;
        if (stripePaymentMethodId === -1) {
          payment = await tx.payment.create({
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
          const newMethod = await tx.paymentMethod.findFirst({
            where: { name: "Stripe", companyId: paymentData.companyId },
          });
          if (newMethod) stripePaymentMethodId = newMethod.id;
        } else {
          payment = await tx.payment.create({
            data: {
              companyId: paymentData.companyId,
              invoiceId: invoice.id,
              amount: paymentAmount,
              tip: tipForThisRecord,
              type: "OTHER",
              date: new Date(),
              other: { create: { paymentMethodId: stripePaymentMethodId } },
            },
          });
        }

        if (!firstPaymentRecord) {
          firstPaymentRecord = { paymentId: payment.id, invoiceId: invoice.id };
        }

        await tx.invoice.update({
          where: { id: invoice.id, companyId: paymentData.companyId },
          data: {
            due: { decrement: paymentAmount },
            totalPayment: { increment: paymentAmount },
          },
        });

        totalPaid += paymentAmount;
      }

      if (firstPaymentRecord) {
        await tx.stripePayment.create({
          data: {
            stripePaymentIntentId: paymentIntent.id,
            companyId: paymentData.companyId,
            paymentId: firstPaymentRecord.paymentId,
            invoiceId: firstPaymentRecord.invoiceId,
          },
        });
      }

      await tx.webhookEvent.update({
        where: { eventId },
        data: { status: "PROCESSED", processedAt: new Date() },
      });
    });

    for (const invoice of invoicesWithDue) {
      if (invoice.type === "Estimate") {
        convertInvoice(invoice.id, paymentData.companyId).catch(console.error);
      }
    }

    const firstInvoice = statement.invoice[0];
    sendPaymentReceivedNotification({
      companyId: paymentData.companyId,
      amount: totalPaid,
      clientName: `${firstInvoice?.client?.firstName} ${firstInvoice?.client?.lastName}`,
      invoiceId: paymentData.statementId,
      isDeposit: false,
    });

    return;
  }

  // ── default: individual invoice/deposit payment ───────────────────────────
  const isDeposit = paymentData.payType === "deposit";
  const tipAmount = parseFloat(paymentData.tip || "0");

  const existingStripeMethod = await db.paymentMethod.findFirst({
    where: {
      companyId: +paymentData.companyId,
      name: { equals: "Stripe", mode: "insensitive" },
    },
  });
  let stripePaymentMethodId = existingStripeMethod?.id ?? -1;

  const findInvoice = await db.invoice.findUnique({
    where: { id: paymentData.invoiceId, companyId: paymentData.companyId },
  });

  let stripeInvoice: any = null;

  await db.$transaction(async (tx) => {
    let payment;

    if (isDeposit) {
      payment = await tx.payment.create({
        data: {
          companyId: paymentData.companyId,
          invoiceId: paymentData.invoiceId,
          amount: paymentData.amount,
          tip: tipAmount,
          type: "DEPOSIT",
          date: new Date(),
          deposit: {
            create: {
              depositMethod: "Stripe",
              depositNotes: "Deposit payment via Stripe",
            },
          },
        },
      });
    } else if (stripePaymentMethodId === -1) {
      payment = await tx.payment.create({
        data: {
          companyId: paymentData.companyId,
          invoiceId: paymentData.invoiceId,
          amount: paymentData.amount,
          tip: tipAmount,
          type: "OTHER",
          date: new Date(),
          other: {
            create: {
              paymentMethod: {
                create: { name: "Stripe", companyId: paymentData.companyId },
              },
            },
          },
        },
      });
    } else {
      payment = await tx.payment.create({
        data: {
          companyId: paymentData.companyId,
          invoiceId: paymentData.invoiceId,
          amount: paymentData.amount,
          tip: tipAmount,
          type: "OTHER",
          date: new Date(),
          other: { create: { paymentMethodId: stripePaymentMethodId } },
        },
      });
    }

    await tx.stripePayment.create({
      data: {
        stripePaymentIntentId: paymentIntent.id,
        companyId: paymentData.companyId,
        paymentId: payment.id,
        invoiceId: paymentData.invoiceId,
      },
    });

    if (findInvoice) {
      if (isDeposit) {
        const currentDue = Number(findInvoice.due ?? 0);
        const depositAmount = Number(paymentData.amount);

        if (currentDue > 0) {
          const amountToCoverDue = Math.min(depositAmount, currentDue);
          const newDue = Math.max(0, currentDue - amountToCoverDue);
          stripeInvoice = await tx.invoice.update({
            where: {
              id: paymentData.invoiceId,
              companyId: paymentData.companyId,
            },
            data: { due: newDue, deposit: { increment: depositAmount } },
            include: {
              client: { select: { firstName: true, lastName: true } },
            },
          });
        } else {
          stripeInvoice = await tx.invoice.update({
            where: {
              id: paymentData.invoiceId,
              companyId: paymentData.companyId,
            },
            data: { deposit: { increment: Number(paymentData.amount) } },
            include: {
              client: { select: { firstName: true, lastName: true } },
            },
          });
        }
      } else {
        const currentDue = Number(findInvoice.due ?? 0);
        const paymentAmount = Number(paymentData.amount ?? 0);
        const amountToApply = Math.min(paymentAmount, currentDue);
        const newDue = Math.max(0, currentDue - amountToApply);
        stripeInvoice = await tx.invoice.update({
          where: {
            id: paymentData.invoiceId,
            companyId: paymentData.companyId,
          },
          data: { due: newDue, totalPayment: { increment: amountToApply } },
          include: { client: { select: { firstName: true, lastName: true } } },
        });
      }
    }

    await tx.webhookEvent.update({
      where: { eventId },
      data: { status: "PROCESSED", processedAt: new Date() },
    });
  });

  if (findInvoice?.type === "Estimate") {
    convertInvoice(paymentData.invoiceId, paymentData.companyId).catch(
      console.error,
    );
  }

  sendPaymentReceivedNotification({
    companyId: paymentData.companyId,
    amount: paymentData.amount,
    clientName: `${stripeInvoice?.client?.firstName} ${stripeInvoice?.client?.lastName}`,
    invoiceId: paymentData.invoiceId,
    isDeposit,
  });
}
