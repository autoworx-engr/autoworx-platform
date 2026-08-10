import {
  buildGiftCardPurchaseContext,
  giftCardPurchaseSchema,
  issueGiftCardFromContext,
} from "@/services/giftCardPurchaseService";
import { db } from "@/lib/db";
import { TransactionType } from "@prisma/client";

interface PurchaseSettlementResult {
  status:
    | "issued"
    | "already_issued"
    | "not_purchase_source"
    | "pending_payment"
    | "payment_not_found"
    | "missing_purchase_data"
    | "invalid_purchase_data"
    | "payment_company_mismatch"
    | "insufficient_paid_amount";
  giftCardId?: number;
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

export async function settleGiftCardPurchasePayment(
  paymentId: number,
): Promise<PurchaseSettlementResult> {
  if (!Number.isInteger(paymentId) || paymentId <= 0) {
    return { status: "payment_not_found" };
  }

  return db.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        companyId: true,
        amount: true,
        notes: true,
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
    if (
      paymentNotes?.source !== "virtual_shop_gift_card" &&
      paymentNotes?.source !== "virtual_shop_gift_card_purchase"
    ) {
      return { status: "not_purchase_source" };
    }

    const isPaid = Boolean(
      payment.stripePayment || payment.authorizeNetPayment,
    );
    if (!isPaid) {
      return { status: "pending_payment" };
    }

    const referenceId = `PAYMENT-${payment.id}`;

    const existingIssue = await tx.giftCardTransaction.findFirst({
      where: {
        type: TransactionType.ISSUE,
        referenceId,
      },
      select: {
        giftCardId: true,
        amount: true,
      },
    });

    if (existingIssue) {
      if (!paymentNotes?.giftCardId) {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            notes: JSON.stringify({
              ...paymentNotes,
              giftCardId: existingIssue.giftCardId,
            }),
          },
        });
      }

      return {
        status: "already_issued",
        giftCardId: existingIssue.giftCardId,
        amount: Number(existingIssue.amount),
      };
    }

    const purchaseDataRaw = paymentNotes?.purchaseData;
    // Everything below here means the customer was charged but will NOT get a
    // card without intervention — always log loudly.
    if (!purchaseDataRaw) {
      console.error(
        "[gift-card][settlement] PAID BUT NOT ISSUED — missing purchaseData:",
        paymentId,
      );
      return { status: "missing_purchase_data" };
    }

    const parsedPurchaseInput =
      giftCardPurchaseSchema.safeParse(purchaseDataRaw);
    if (!parsedPurchaseInput.success) {
      console.error(
        "[gift-card][settlement] PAID BUT NOT ISSUED — invalid purchaseData:",
        paymentId,
        parsedPurchaseInput.error.errors,
      );
      return { status: "invalid_purchase_data" };
    }

    const purchaseInput = parsedPurchaseInput.data;
    const context = await buildGiftCardPurchaseContext(tx, purchaseInput);

    if (context.shop.companyId !== payment.companyId) {
      console.error(
        "[gift-card][settlement] PAID BUT NOT ISSUED — company mismatch:",
        {
          paymentId,
          paymentCompanyId: payment.companyId,
          shopCompanyId: context.shop.companyId,
        },
      );
      return { status: "payment_company_mismatch" };
    }

    const paidAmount = Number(payment.amount || 0);
    if (paidAmount + 0.01 < context.finalAmount) {
      console.error(
        "[gift-card][settlement] PAID BUT NOT ISSUED — insufficient amount:",
        { paymentId, paidAmount, finalAmount: context.finalAmount },
      );
      return { status: "insufficient_paid_amount" };
    }

    const issuedGiftCard = await issueGiftCardFromContext(
      tx,
      purchaseInput,
      context,
      {
        referenceId,
      },
    );

    console.log("[gift-card][settlement] issued:", {
      paymentId,
      giftCardId: issuedGiftCard.giftCardId,
      amount: issuedGiftCard.amount,
    });

    return {
      status: "issued",
      giftCardId: issuedGiftCard.giftCardId,
      amount: issuedGiftCard.amount,
    };
  });
}
