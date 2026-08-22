"use server";
import { db } from "@/lib/db";
import { PaymentParams } from "@/lib/payment-gateway";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export const createStripePaymentLink = async ({
  companyId,
  invoiceId,
  statementId,
  shopBookingId,
  paymentId,
  giftCardSource,
  giftCardCode,
  giftCardId,
  amount,
  tip,
  payType,
  redirectUrl,
}: PaymentParams) => {
  try {
    if (!invoiceId && !statementId && !shopBookingId && !paymentId) {
      throw new Error("Invoice, statement, or booking ID is required");
    }
    const company = await db.company.findFirst({
      where: {
        id: companyId,
      },
    });
    const invoice = invoiceId
      ? await db.invoice.findFirst({
          where: {
            id: invoiceId,
          },
        })
      : null;
    // if (!invoice) {
    //   throw new Error("Invoice not found");
    // }

    const statement = statementId
      ? await db.fleetStatement.findFirst({
          where: {
            id: statementId,
          },
        })
      : null;

    const shopBooking = shopBookingId
      ? await db.shopBooking.findUnique({
          where: {
            id: Number(shopBookingId),
          },
          select: {
            invoiceId: true,
          },
        })
      : null;

    // if (!statement) {
    //   throw new Error("Statement not found");
    // }

    // Only validate amount against due amount for payments, not deposits
    if (
      payType === "payment" &&
      parseFloat(Number(invoice?.due ?? 0).toFixed(2)) < Number(amount)
    ) {
      throw new Error("Amount is greater than due amount");
    }

    // Basic amount validation for both payment types
    if (!amount || Number(amount) <= 0) {
      throw new Error("Amount must be greater than 0");
    }

    if (!company?.stripeAccountId) {
      throw new Error("No stripe account found");
    }

    const productName = invoiceId
      ? `INVOICE-${invoiceId}`
      : statementId
        ? `STATEMENT-${statementId}`
        : shopBookingId
          ? `BOOKING-${shopBookingId}`
          : `GIFTCARD-${paymentId}`;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
    const appendQuery = (url: string, query: string) =>
      url.includes("?") ? `${url}&${query}` : `${url}?${query}`;
    const isVirtualShopGiftCardPayment =
      payType === "virtual_shop_gift_card" && Boolean(paymentId);
    const successRedirectBase = redirectUrl
      ? appendQuery(redirectUrl, "success=true")
      : "";
    const successRedirectWithPaymentRef =
      redirectUrl && isVirtualShopGiftCardPayment
        ? appendQuery(successRedirectBase, `paymentRef=${paymentId}`)
        : successRedirectBase;

    const successUrl = redirectUrl
      ? appendQuery(
          successRedirectWithPaymentRef,
          "session_id={CHECKOUT_SESSION_ID}",
        )
      : shopBookingId
        ? appendQuery(appUrl, "success=true")
        : `${appUrl}/public-invoice/${invoiceId ?? statementId}?success=true&type=${payType}${statementId ? "&fleet=true" : ""}`;

    const cancelUrl = redirectUrl
      ? appendQuery(
          redirectUrl,
          isVirtualShopGiftCardPayment
            ? `cancel=true&paymentRef=${paymentId}`
            : "cancel=true",
        )
      : shopBookingId
        ? appendQuery(appUrl, "cancel=true")
        : `${appUrl}/public-invoice/${invoiceId ?? statementId}${statementId ? "?fleet=true" : ""}`;

    const tipAmount = parseFloat(tip || "0");
    const totalCharge = Number(amount) + tipAmount;

    const session = await stripe.checkout.sessions.create(
      {
        payment_method_types: ["card"],
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: productName,
              },
              unit_amount: Math.round(totalCharge * 100),
            },
            quantity: 1,
          },
        ],
        payment_intent_data: {
          metadata: {
            paymentData: shopBookingId
              ? JSON.stringify({
                  companyId,
                  shopBookingId,
                  invoiceId: shopBooking?.invoiceId,
                  amount,
                  tip: tip || "0",
                  payType: "virtual_shop_deposit",
                })
              : paymentId
                ? JSON.stringify({
                    companyId,
                    paymentRef: paymentId,
                    amount,
                    tip: tip || "0",
                    payType: "virtual_shop_gift_card",
                    giftCardSource,
                    giftCardCode,
                    giftCardId,
                  })
                : invoiceId
                  ? JSON.stringify({
                      companyId,
                      invoiceId,
                      amount,
                      tip: tip || "0",
                      payType,
                    })
                  : JSON.stringify({
                      companyId,
                      statementId,
                      amount,
                      tip: tip || "0",
                      payType: "statement",
                    }),
          },
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
      },
      {
        stripeAccount: company.stripeAccountId,
      },
    );

    return { url: session.url };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message ?? "Failed to create Stripe Payment Link",
    };
  }
};
