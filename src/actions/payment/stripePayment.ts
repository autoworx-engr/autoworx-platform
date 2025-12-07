"use server";
import { db } from "@/lib/db";
import { env } from "next-runtime-env";
import Stripe from "stripe";

const stripe = new Stripe(
  (process.env.STRIPE_SECRET_KEY || env("STRIPE_SECRET_KEY")) as string
);

export const createStripePaymentLink = async ({
  companyId,
  invoiceId,
  amount,
  payType,
  statementId,
}: {
  companyId: number;
  invoiceId?: string;
  statementId?: string;
  amount: string;
  payType: "payment" | "deposit" | "statement";
}) => {
  try {
    if (!invoiceId && !statementId) {
      throw new Error("Invoice not found");
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
      : `STATEMENT-${statementId}`;

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
            paymentData: invoiceId
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
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/public-invoice/${invoiceId ?? statementId}?success=true&type=${payType}${statementId ? "&fleet=true" : ""}`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/public-invoice/${invoiceId ?? statementId}${statementId ? "?fleet=true" : ""}`,
      },
      {
        stripeAccount: company.stripeAccountId,
      }
    );

    return { url: session.url };
  } catch (error: any) {
    console.log(error);
    return {
      success: false,
      message: error?.message ?? "Failed to create Stripe Payment Link",
    };
  }
};
