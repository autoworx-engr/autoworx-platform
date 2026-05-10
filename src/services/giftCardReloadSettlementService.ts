import { db } from "@/lib/db";
import { TransactionType } from "@prisma/client";

interface ReloadSettlementResult {
  status:
    | "applied"
    | "already_applied"
    | "not_reload_source"
    | "pending_payment"
    | "missing_metadata"
    | "gift_card_not_found"
    | "gift_card_not_active"
    | "invalid_amount"
    | "payment_not_found";
  giftCardId?: number;
  balance?: number;
  amount?: number;
}

const parseNotes = (notes: string | null) => {
  if (!notes) return {} as Record<string, any>;

  try {
    return JSON.parse(notes) as Record<string, any>;
  } catch {
    return {} as Record<string, any>;
  }
};

const normalizeCode = (value: unknown) =>
  typeof value === "string" ? value.trim().toUpperCase() : "";

export async function settleGiftCardReloadPayment(
  paymentId: number,
): Promise<ReloadSettlementResult> {
  if (!Number.isInteger(paymentId) || paymentId <= 0) {
    return { status: "payment_not_found" };
  }

  return db.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        amount: true,
        notes: true,
        companyId: true,
        stripePayment: {
          select: { id: true },
        },
        authorizeNetPayment: {
          select: { id: true },
        },
      },
    });

    if (!payment) {
      return { status: "payment_not_found" };
    }

    const paymentNotes = parseNotes(payment.notes);
    if (paymentNotes?.source !== "virtual_shop_gift_card_reload") {
      return { status: "not_reload_source" };
    }

    const isPaid = Boolean(
      payment.stripePayment || payment.authorizeNetPayment,
    );
    if (!isPaid) {
      return { status: "pending_payment" };
    }

    const reloadAmount = Number(payment.amount || 0);
    if (!Number.isFinite(reloadAmount) || reloadAmount <= 0) {
      return { status: "invalid_amount" };
    }

    const metadataGiftCardId = Number(paymentNotes?.reloadData?.giftCardId);
    const metadataCode = normalizeCode(paymentNotes?.reloadData?.code);

    const cardMatchers = [
      ...(Number.isInteger(metadataGiftCardId) && metadataGiftCardId > 0
        ? [{ id: metadataGiftCardId }]
        : []),
      ...(metadataCode ? [{ code: metadataCode }] : []),
    ];

    if (!cardMatchers.length) {
      return { status: "missing_metadata" };
    }

    const giftCard = await tx.issuedGiftCard.findFirst({
      where: {
        companyId: payment.companyId,
        OR: cardMatchers,
      },
      select: {
        id: true,
        status: true,
        currentBalance: true,
        purchaserName: true,
      },
    });

    if (!giftCard) {
      return { status: "gift_card_not_found" };
    }

    if (giftCard.status !== "ACTIVE") {
      return {
        status: "gift_card_not_active",
        giftCardId: giftCard.id,
        balance: Number(giftCard.currentBalance),
      };
    }

    const referenceId = `PAYMENT-${payment.id}`;

    const existingReload = await tx.giftCardTransaction.findFirst({
      where: {
        giftCardId: giftCard.id,
        type: TransactionType.RELOAD,
        referenceId,
      },
      select: {
        id: true,
        amount: true,
      },
    });

    if (existingReload) {
      if (!paymentNotes?.reloadApplied) {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            notes: JSON.stringify({
              ...paymentNotes,
              reloadApplied: true,
              reloadedGiftCardId: giftCard.id,
              purchaserName: giftCard.purchaserName || undefined,
            }),
          },
        });
      }

      return {
        status: "already_applied",
        giftCardId: giftCard.id,
        balance: Number(giftCard.currentBalance),
        amount: Number(existingReload.amount),
      };
    }

    const nextBalance = Number(giftCard.currentBalance) + reloadAmount;

    const updatedCard = await tx.issuedGiftCard.update({
      where: { id: giftCard.id },
      data: {
        currentBalance: nextBalance,
        status: "ACTIVE",
      },
      select: {
        id: true,
        currentBalance: true,
      },
    });

    await tx.giftCardTransaction.create({
      data: {
        giftCardId: giftCard.id,
        type: TransactionType.RELOAD,
        amount: reloadAmount,
        balanceAfter: nextBalance,
        referenceId,
        notes: "Reloaded via gift card payment webhook auto-settlement",
      },
    });

    await tx.payment.update({
      where: { id: payment.id },
      data: {
        notes: JSON.stringify({
          ...paymentNotes,
          reloadApplied: true,
          reloadedGiftCardId: giftCard.id,
          purchaserName: giftCard.purchaserName || undefined,
        }),
      },
    });

    return {
      status: "applied",
      giftCardId: updatedCard.id,
      balance: Number(updatedCard.currentBalance),
      amount: reloadAmount,
    };
  });
}
