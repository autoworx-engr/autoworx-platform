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
}: {
  companyId: number;
  invoiceId: string;
  amount: string;
  payType: "payment" | "deposit";
}) => {
  try {
    const company = await db.company.findFirst({
      where: {
        id: companyId,
      },
    });
    const invoice = await db.invoice.findFirst({
      where: {
        id: invoiceId,
      },
    });

    if (!invoice) {
      throw new Error("Invoice not found");
    }

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

    const productName = `INVOICE-${invoiceId}`;

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
              unit_amount: Number(amount) * 100, // Amount in cents
            },
            quantity: 1,
          },
        ],
        payment_intent_data: {
          metadata: {
            paymentData: JSON.stringify({
              companyId,
              invoiceId,
              amount,
              payType,
            }),
          },
        },
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/public-invoice/${invoiceId}?success=true&type=${payType}`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/public-invoice/${invoiceId}`,
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
