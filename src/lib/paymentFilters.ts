import { Prisma } from "@prisma/client";

const GIFT_CARD_SOURCES = [
  "virtual_shop_gift_card",
  "virtual_shop_gift_card_purchase",
  "virtual_shop_gift_card_reload",
];

/**
 * Gift card checkouts create their Payment row up front (at
 * /gift-card-payment/initiate) so the purchase payload survives the redirect
 * to the gateway. Abandoned checkouts therefore leave Payment rows that were
 * never charged — they must not surface in payment lists or revenue totals.
 *
 * A gift card payment counts as real only once a gateway charge is linked to
 * it. Spread this into a Prisma `where` to exclude the rest.
 */
export const excludeUnchargedGiftCardPayments: Prisma.PaymentWhereInput = {
  NOT: {
    AND: [
      {
        OR: GIFT_CARD_SOURCES.map((source) => ({
          notes: { contains: `"source":"${source}"` },
        })),
      },
      { stripePayment: { is: null } },
      { authorizeNetPayment: { is: null } },
    ],
  },
};
