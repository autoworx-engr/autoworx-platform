import { db } from "@/lib/db";
import { convertInvoice } from "@/actions/estimate/invoice/convert";
import { sendPaymentReceivedNotification } from "@/lib/notification/payment-notify";
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

const parseGiftCardPaymentRef = (value: string) => {
  const paymentRef = value.trim().toUpperCase();
  if (!paymentRef || (paymentRef[0] !== "P" && paymentRef[0] !== "R")) {
    return null;
  }

  const companySegment = paymentRef.slice(1, 5);
  const companyId = parseInt(companySegment, 36);

  if (!Number.isInteger(companyId) || companyId <= 0) return null;

  if (paymentRef[0] === "R") {
    const giftCardSegment = paymentRef.slice(5, 9);
    const giftCardId = parseInt(giftCardSegment, 36);
    return {
      paymentRef,
      companyId,
      giftCardId:
        Number.isInteger(giftCardId) && giftCardId > 0 ? giftCardId : undefined,
    };
  }

  return { paymentRef, companyId };
};

const extractAuthorizeNetCustomFields = (payload: any) => {
  const result: Record<string, string> = {};
  const collections = [
    payload?.userFields?.userField,
    payload?.userFields,
    payload?.userField,
    payload?.order?.userFields?.userField,
    payload?.order?.userFields,
    payload?.order?.userField,
  ];

  for (const collection of collections) {
    const fields = Array.isArray(collection)
      ? collection
      : collection
        ? [collection]
        : [];

    for (const field of fields) {
      if (!field || typeof field !== "object") continue;
      const name =
        typeof field.name === "string"
          ? field.name
          : typeof field.fieldName === "string"
            ? field.fieldName
            : "";
      const value =
        typeof field.value === "string"
          ? field.value
          : typeof field.fieldValue === "string"
            ? field.fieldValue
            : "";
      if (name && value) result[name] = value;
    }
  }

  return result;
};

export async function processAuthorizeNetPayment(eventId: string) {
  const webhookEvent = await db.webhookEvent.findUnique({
    where: { eventId },
  });

  if (!webhookEvent) throw new Error(`WebhookEvent not found: ${eventId}`);
  if (webhookEvent.status === "PROCESSED") return;

  const body = webhookEvent.payload as Record<string, any>;
  const payload = body?.payload;

  // Poison guard: a structurally broken payload fails identically every retry.
  if (!payload?.id) {
    await markWebhookPoison(eventId, "missing payload.id");
    return;
  }
  const transactionId = payload.id as string;
  const authAmount = parseFloat(payload.authAmount);
  if (Number.isNaN(authAmount)) {
    await markWebhookPoison(eventId, "non-numeric authAmount");
    return;
  }
  const invoiceNumber = payload.invoiceNumber as string | undefined;

  // Secondary idempotency guard
  const alreadyProcessed = await db.authorizeNetPayment.findFirst({
    where: { transactionId },
  });

  if (alreadyProcessed) {
    await db.webhookEvent.update({
      where: { eventId },
      data: { status: "PROCESSED", processedAt: new Date() },
    });
    return;
  }

  // Parse tip from invoiceNumber suffix
  const tipCentsMatch = invoiceNumber?.match(/-TC(\d+)$/);
  const tipDollarsMatch = !tipCentsMatch
    ? invoiceNumber?.match(/-T([\d.]+)$/)
    : null;
  const tipAmount = tipCentsMatch
    ? parseInt(tipCentsMatch[1], 10) / 100
    : tipDollarsMatch
      ? parseFloat(tipDollarsMatch[1])
      : 0;
  const baseAmount = authAmount - tipAmount;

  if (!invoiceNumber) {
    await db.webhookEvent.update({
      where: { eventId },
      data: { status: "PROCESSED", processedAt: new Date() },
    });
    return;
  }

  // Decode prefix
  const rawInvoiceNumber = invoiceNumber.replace(/-TC?\d[\d.]*$/, "");
  let targetId = rawInvoiceNumber;
  let sourceType:
    | "deposit"
    | "invoice"
    | "statement"
    | "virtual_shop_deposit"
    | "virtual_shop_gift_card_purchase"
    | "virtual_shop_gift_card_reload"
    | "unknown" = "unknown";

  if (rawInvoiceNumber.startsWith("VSB-DEP-")) {
    sourceType = "virtual_shop_deposit";
    targetId = rawInvoiceNumber.substring(8);
  } else if (rawInvoiceNumber.startsWith("VSGCR-")) {
    sourceType = "virtual_shop_gift_card_reload";
    targetId = rawInvoiceNumber.substring(6);
  } else if (rawInvoiceNumber.startsWith("VSGCP-")) {
    sourceType = "virtual_shop_gift_card_purchase";
    targetId = rawInvoiceNumber.substring(6);
  } else if (rawInvoiceNumber.startsWith("VSGC-")) {
    sourceType = "virtual_shop_gift_card_purchase";
    targetId = rawInvoiceNumber.substring(5);
  } else if (rawInvoiceNumber.startsWith("DEP-")) {
    sourceType = "deposit";
    targetId = rawInvoiceNumber.substring(4);
  } else if (rawInvoiceNumber.startsWith("INV-")) {
    sourceType = "invoice";
    targetId = rawInvoiceNumber.substring(4);
  } else if (rawInvoiceNumber.startsWith("STM-")) {
    sourceType = "statement";
    targetId = rawInvoiceNumber.substring(4);
  }

  // ── virtual_shop_deposit ──────────────────────────────────────────────────
  if (sourceType === "virtual_shop_deposit") {
    const result = await confirmShopBooking({
      shopBookingId: targetId,
      cashPaid: authAmount,
    });

    const shopBooking = await db.shopBooking.findUnique({
      where: { id: Number(targetId) },
      include: { shop: true },
    });

    if (!shopBooking || !shopBooking.shop?.companyId) {
      await db.webhookEvent.update({
        where: { eventId },
        data: { status: "PROCESSED", processedAt: new Date() },
      });
      return;
    }

    const companyId = shopBooking.shop.companyId;
    const invoiceId = result.invoiceId ?? null;

    await db.$transaction(async (tx) => {
      const depositPayment = await tx.payment.create({
        data: {
          companyId,
          invoiceId,
          amount: authAmount,
          type: "DEPOSIT",
          date: new Date(),
          gateway: "AUTHORIZE_NET",
          deposit: {
            create: {
              depositMethod: "Authorize.Net",
              depositNotes: "Virtual Shop Deposit",
            },
          },
        },
      });

      await tx.authorizeNetPayment.create({
        data: {
          transactionId,
          companyId,
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

  // ── virtual_shop_gift_card_purchase / reload ──────────────────────────────
  if (
    sourceType === "virtual_shop_gift_card_purchase" ||
    sourceType === "virtual_shop_gift_card_reload"
  ) {
    const paymentRef = String(targetId || "").trim();
    const customFields = extractAuthorizeNetCustomFields(payload);

    if (!paymentRef) {
      await db.webhookEvent.update({
        where: { eventId },
        data: { status: "PROCESSED", processedAt: new Date() },
      });
      return;
    }

    const notesSource =
      sourceType === "virtual_shop_gift_card_reload"
        ? "virtual_shop_gift_card_reload"
        : "virtual_shop_gift_card";

    const paymentMethodName =
      sourceType === "virtual_shop_gift_card_reload"
        ? "Virtual Shop Gift Card Reload"
        : "Virtual Shop Gift Card";

    const hasLegacyNumericId = /^\d+$/.test(paymentRef);
    if (hasLegacyNumericId) {
      const legacyPaymentId = Number(paymentRef);
      const legacyPayment = await db.payment.findUnique({
        where: { id: legacyPaymentId },
        select: { id: true, companyId: true, notes: true },
      });

      const legacyNotes = parsePaymentNotes(legacyPayment?.notes || null);
      const isExpectedSource =
        legacyNotes?.source === notesSource ||
        (notesSource === "virtual_shop_gift_card" &&
          legacyNotes?.source === "virtual_shop_gift_card_purchase");

      if (legacyPayment && isExpectedSource) {
        await db.$transaction(async (tx) => {
          await tx.authorizeNetPayment.create({
            data: {
              transactionId,
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

        if (sourceType === "virtual_shop_gift_card_reload") {
          await settleGiftCardReloadPayment(legacyPayment.id);
        }
        return;
      }
    }

    const parsedRef = parseGiftCardPaymentRef(paymentRef);
    const fallbackCompanyId = Number(customFields.companyId);
    const fallbackGiftCardId = Number(customFields.giftCardId);

    const companyIdFromRef =
      parsedRef?.companyId ||
      (Number.isInteger(fallbackCompanyId) && fallbackCompanyId > 0
        ? fallbackCompanyId
        : null);

    if (!companyIdFromRef) {
      await db.webhookEvent.update({
        where: { eventId },
        data: { status: "PROCESSED", processedAt: new Date() },
      });
      return;
    }

    const reloadGiftCardId =
      parsedRef?.giftCardId ||
      (Number.isInteger(fallbackGiftCardId) && fallbackGiftCardId > 0
        ? fallbackGiftCardId
        : undefined);

    const reloadGiftCardCode =
      typeof customFields.giftCardCode === "string"
        ? customFields.giftCardCode.trim().toUpperCase()
        : undefined;

    let paymentMethod = await db.paymentMethod.findFirst({
      where: { companyId: companyIdFromRef, name: paymentMethodName },
    });

    if (!paymentMethod) {
      paymentMethod = await db.paymentMethod.create({
        data: { companyId: companyIdFromRef, name: paymentMethodName },
      });
    }

    let createdPaymentId: number;

    await db.$transaction(async (tx) => {
      const createdPayment = await tx.payment.create({
        data: {
          companyId: companyIdFromRef,
          amount: authAmount,
          type: "OTHER",
          date: new Date(),
          gateway: "AUTHORIZE_NET",
          notes: JSON.stringify({
            source: notesSource,
            paymentRef: parsedRef?.paymentRef || paymentRef,
            ...(notesSource === "virtual_shop_gift_card_reload"
              ? {
                  reloadData: {
                    giftCardId: reloadGiftCardId,
                    code: reloadGiftCardCode,
                    requestedAmount: authAmount,
                  },
                }
              : {}),
          }),
          other: { create: { paymentMethodId: paymentMethod!.id } },
        },
      });

      await tx.authorizeNetPayment.create({
        data: {
          transactionId,
          companyId: companyIdFromRef,
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

    if (sourceType === "virtual_shop_gift_card_reload") {
      await settleGiftCardReloadPayment(createdPaymentId!);
    }

    return;
  }

  // ── individual invoice payment ─────────────────────────────────────────────
  const invoice = await db.invoice.findUnique({
    where: { id: targetId },
    include: { client: { select: { firstName: true, lastName: true } } },
  });

  if (invoice) {
    const companyId = invoice.companyId;

    const isDepositFromPrefix = sourceType === "deposit";
    const orderDescription =
      (payload.order?.description as string | undefined) ||
      (payload.order?.invoiceDescription as string | undefined) ||
      (payload.description as string | undefined) ||
      "";
    const lowerOrderDescription = orderDescription.toString().toLowerCase();
    const serializedPayload = JSON.stringify(payload || {}).toLowerCase();
    const isDepositHeuristic =
      lowerOrderDescription.includes("deposit") ||
      serializedPayload.includes("deposit payment");
    const isDeposit = isDepositFromPrefix || isDepositHeuristic;
    const paymentType = isDeposit ? "DEPOSIT" : "OTHER";

    let paymentMethod = await db.paymentMethod.findFirst({
      where: { companyId, name: "Authorize.Net" },
    });
    if (!paymentMethod && !isDeposit) {
      paymentMethod = await db.paymentMethod.create({
        data: { name: "Authorize.Net", companyId },
      });
    }

    const currentDue = Number(invoice.due ?? 0);

    await db.$transaction(async (tx) => {
      const payment = isDeposit
        ? await tx.payment.create({
            data: {
              companyId,
              invoiceId: targetId,
              amount: baseAmount,
              tip: tipAmount,
              type: paymentType,
              date: new Date(),
              gateway: "AUTHORIZE_NET",
              deposit: {
                create: {
                  depositMethod: "Authorize.Net",
                  depositNotes: "Deposit payment via Authorize.Net",
                },
              },
            },
          })
        : await tx.payment.create({
            data: {
              companyId,
              invoiceId: targetId,
              amount: baseAmount,
              tip: tipAmount,
              type: paymentType,
              date: new Date(),
              gateway: "AUTHORIZE_NET",
              other: paymentMethod
                ? { create: { paymentMethodId: paymentMethod.id } }
                : undefined,
            },
          });

      await tx.authorizeNetPayment.create({
        data: {
          transactionId,
          companyId,
          paymentId: payment.id,
          invoiceId: targetId,
        },
      });

      if (isDeposit) {
        const depositAmount = baseAmount;
        if (currentDue > 0) {
          const amountToCoverDue = Math.min(depositAmount, currentDue);
          const newDue = Math.max(0, currentDue - amountToCoverDue);
          await tx.invoice.update({
            where: { id: targetId, companyId },
            data: { due: newDue, deposit: { increment: depositAmount } },
          });
        } else {
          await tx.invoice.update({
            where: { id: targetId, companyId },
            data: { deposit: { increment: depositAmount } },
          });
        }
      } else {
        const amountToApply = Math.min(baseAmount, currentDue);
        const newDue = Math.max(0, currentDue - amountToApply);
        await tx.invoice.update({
          where: { id: targetId, companyId },
          data: { due: newDue, totalPayment: { increment: amountToApply } },
        });
      }

      await tx.webhookEvent.update({
        where: { eventId },
        data: { status: "PROCESSED", processedAt: new Date() },
      });
    });

    if (invoice.type === "Estimate") {
      convertInvoice(targetId, companyId).catch(console.error);
    }

    sendPaymentReceivedNotification({
      companyId,
      amount: authAmount,
      clientName: `${invoice.client?.firstName} ${invoice.client?.lastName}`,
      invoiceId: targetId,
      isDeposit,
    });

    return;
  }

  // ── fleet statement payment ───────────────────────────────────────────────
  const statement = await db.fleetStatement.findUnique({
    where: { id: targetId },
    include: {
      invoice: {
        where: { due: { gt: 0 } },
        include: { client: { select: { firstName: true, lastName: true } } },
      },
      Fleet: { include: { client: { select: { companyId: true } } } },
    },
  });

  if (!statement || !statement.invoice.length) {
    await db.webhookEvent.update({
      where: { eventId },
      data: { status: "PROCESSED", processedAt: new Date() },
    });
    return;
  }

  const companyId = statement.Fleet.client.companyId;

  let paymentMethod = await db.paymentMethod.findFirst({
    where: { companyId, name: "Authorize.Net" },
  });
  if (!paymentMethod) {
    paymentMethod = await db.paymentMethod.create({
      data: { name: "Authorize.Net", companyId },
    });
  }

  const invoicesWithDue = statement.invoice;

  let totalPaid = 0;
  let firstPaymentRecord: { paymentId: number; invoiceId: string } | null =
    null;
  let isFirstPayment = true;

  await db.$transaction(async (tx) => {
    for (const inv of invoicesWithDue) {
      const paymentAmount = Math.min(
        Number(inv.due ?? 0),
        baseAmount - totalPaid,
      );
      if (paymentAmount <= 0) break;

      const tipForThisRecord = isFirstPayment ? tipAmount : 0;
      isFirstPayment = false;

      const payment = await tx.payment.create({
        data: {
          companyId,
          invoiceId: inv.id,
          amount: paymentAmount,
          tip: tipForThisRecord,
          type: "OTHER",
          date: new Date(),
          gateway: "AUTHORIZE_NET",
          other: { create: { paymentMethodId: paymentMethod!.id } },
        },
      });

      if (!firstPaymentRecord) {
        firstPaymentRecord = { paymentId: payment.id, invoiceId: inv.id };
      }

      await tx.invoice.update({
        where: { id: inv.id, companyId },
        data: {
          due: { decrement: paymentAmount },
          totalPayment: { increment: paymentAmount },
        },
      });

      totalPaid += paymentAmount;
    }

    if (firstPaymentRecord) {
      await tx.authorizeNetPayment.create({
        data: {
          transactionId,
          companyId,
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

  for (const inv of invoicesWithDue) {
    if (inv.type === "Estimate") {
      convertInvoice(inv.id, companyId).catch(console.error);
    }
  }

  const firstInvoice = statement.invoice[0];
  sendPaymentReceivedNotification({
    companyId,
    amount: totalPaid,
    clientName: `${firstInvoice?.client?.firstName} ${firstInvoice?.client?.lastName}`,
    invoiceId: targetId,
    isDeposit: false,
  });
}
