import { db } from "@/lib/db";

const parseNotes = (notes: string | null) => {
  if (!notes) return {} as Record<string, any>;

  try {
    return JSON.parse(notes) as Record<string, any>;
  } catch {
    return {} as Record<string, any>;
  }
};

const isPurchaseSource = (source: unknown) =>
  source === "virtual_shop_gift_card" ||
  source === "virtual_shop_gift_card_purchase";

/**
 * Finds the pending Payment row created by /gift-card-payment/initiate for a
 * given paymentRef — i.e. a gift card purchase that carries the purchase
 * payload in its notes but is not yet linked to a gateway charge.
 *
 * Returns null when no such row exists (legacy sessions started before the
 * payload was persisted server-side), letting callers fall back to creating
 * the Payment themselves.
 */
export async function findPendingGiftCardPurchasePayment(
  paymentRef: string,
  companyId: number,
): Promise<{ id: number } | null> {
  const ref = String(paymentRef || "").trim();
  if (!ref) return null;

  const candidates = await db.payment.findMany({
    where: {
      notes: { contains: `"paymentRef":"${ref}"` },
      stripePayment: { is: null },
      authorizeNetPayment: { is: null },
    },
    orderBy: { id: "desc" },
    take: 5,
    select: { id: true, companyId: true, notes: true },
  });

  for (const candidate of candidates) {
    const notes = parseNotes(candidate.notes);
    if (notes?.paymentRef !== ref) continue;
    if (!isPurchaseSource(notes?.source)) continue;
    if (!notes?.purchaseData) continue;

    if (
      Number.isInteger(companyId) &&
      companyId > 0 &&
      candidate.companyId !== companyId
    ) {
      console.error(
        "[gift-card][link] paymentRef matched a different company — ignoring:",
        {
          paymentRef: ref,
          paymentCompanyId: candidate.companyId,
          gatewayCompanyId: companyId,
        },
      );
      continue;
    }

    return { id: candidate.id };
  }

  return null;
}
