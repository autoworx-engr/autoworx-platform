"use server";
import { db } from "@/lib/db";
import { PaymentParams } from "@/lib/payment-gateway";
import { env } from "next-runtime-env";
import Stripe from "stripe";

const stripe = new Stripe(
  (process.env.STRIPE_SECRET_KEY || env("STRIPE_SECRET_KEY")) as string,
);

export const createStripePaymentLink = async ({
  companyId,
  invoiceId,
  statementId,
  shopBookingId,
  amount,
  payType,
  redirectUrl,
}: PaymentParams) => {
  try {
    if (!invoiceId && !statementId && !shopBookingId) {
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
        : `BOOKING-${shopBookingId}`;

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || env("NEXT_PUBLIC_APP_URL") || "";
    const appendQuery = (url: string, query: string) =>
      url.includes("?") ? `${url}&${query}` : `${url}?${query}`;

    const successUrl = redirectUrl
      ? appendQuery(redirectUrl, "success=true")
      : shopBookingId
        ? appendQuery(appUrl, "success=true")
        : `${appUrl}/public-invoice/${invoiceId ?? statementId}?success=true&type=${payType}${statementId ? "&fleet=true" : ""}`;

    const cancelUrl = redirectUrl
      ? appendQuery(redirectUrl, "cancel=true")
      : shopBookingId
        ? appendQuery(appUrl, "cancel=true")
        : `${appUrl}/public-invoice/${invoiceId ?? statementId}${statementId ? "?fleet=true" : ""}`;

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
              unit_amount: Math.round(Number(amount) * 100),
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
                  payType: "virtual_shop_deposit",
                })
              : invoiceId
                ? JSON.stringify({
                    companyId,
                    invoiceId,
                    amount,
                    payType,
                  })
                : JSON.stringify({
                    companyId,
                    statementId,
                    amount,
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
