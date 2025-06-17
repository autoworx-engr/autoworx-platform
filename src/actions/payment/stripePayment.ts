"use server";
import { db } from "@/lib/db";
import { env } from "next-runtime-env";
import Stripe from "stripe";

const stripe = new Stripe(
  (process.env.STRIPE_SECRET_KEY || env("STRIPE_SECRET_KEY")) as string,
);
export const createStripePaymentLink = async ({
  companyId,
  invoiceId,
  amount,
}: {
  companyId: number;
  invoiceId: string;
  amount: string;
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
    if (parseFloat(Number(invoice?.due ?? 0).toFixed(2)) < Number(amount)) {
      throw new Error("Amount is greater than due amount");
    }
    if (!company?.stripeAccountId) {
      throw new Error("No stripe account found");
    }
    const session = await stripe.checkout.sessions.create(
      {
        payment_method_types: ["card"],
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `INVOICE-${invoiceId}`,
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
            }),
          },
        },

        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/public-invoice/${invoiceId}?success=true`, // Redirect after successful payment
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/public-invoice/${invoiceId}`, // Redirect after cancellation
      },
      {
        stripeAccount: company.stripeAccountId,
      },
    );

    // await db.invoice.update({
    //   where: {
    //     id: invoiceId,
    //   },
    //   data: {
    //     stripePaymentLink: session.url,
    //   },
    // });
    return { url: session.url };
  } catch (error: any) {
    console.log(error);
    return {
      success: false,
      message: error?.message ?? "Failed to create Stripe Payment Link",
    };
  }
};
