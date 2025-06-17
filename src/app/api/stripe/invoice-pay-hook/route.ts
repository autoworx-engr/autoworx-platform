import { convertInvoicePublic } from "@/actions/estimate/invoice/convert";
import { db } from "@/lib/db"; // Adjust this path to your database utility or Prisma instance
import { sendPaymentReceivedNotification } from "@/lib/notification/payment-notify";
import { env } from "next-runtime-env";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(
  (process.env.STRIPE_SECRET_KEY || env("STRIPE_SECRET_KEY")) as string,
);

export async function POST(req: NextRequest) {
  let event;
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature found" }, { status: 400 });
  }

  try {
    // Retrieve the raw body for signature verification
    const rawBody = await req.text();

    // Construct the Stripe event
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      (process.env.STRIPE_WEBHOOK_SECRET ||
        env("STRIPE_WEBHOOK_SECRET")) as string,
    );

    // Handle specific event types
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object;
      const paymentData = JSON.parse(paymentIntent.metadata.paymentData);

      const alreadyProcessed = await db.stripePayment.findFirst({
        where: {
          stripePaymentIntentId: paymentIntent.id,
          companyId: paymentData.companyId,
        },
      });

      if (alreadyProcessed) {
        return NextResponse.json(
          { message: "Already processed" },
          { status: 200 },
        );
      }


      let paymentMethods = await db.paymentMethod.findMany({
        where: {
          companyId: +paymentData.companyId,
        },
      });

      let stripeFound = -1;
      for (let i = 0; i < paymentMethods.length; i++) {
        if (paymentMethods[i]?.name?.trim().toLocaleLowerCase() === "stripe") {
          stripeFound = paymentMethods[i].id;
          break;
        }
      }
      let stripePayment;
      if (stripeFound === -1) {
        // Create a payment record in the database
        stripePayment = await db.payment.create({
          data: {
            companyId: paymentData.companyId,
            invoiceId: paymentData.invoiceId,
            amount: paymentData.amount,
            type: "OTHER",
            date: new Date(),
            other: {
              create: {
                paymentMethod: {
                  create: {
                    name: "Stripe",
                    companyId: paymentData.companyId,
                  },
                },
              },
            },
          },
        });
      } else {
        // Create a payment record in the database
        stripePayment = await db.payment.create({
          data: {
            companyId: paymentData.companyId,
            invoiceId: paymentData.invoiceId,
            amount: paymentData.amount,
            type: "OTHER",
            date: new Date(),

            other: {
              create: {
                paymentMethodId: stripeFound,
              },
            },
          },
        });
      }

      await db.stripePayment.create({
        data: {
          stripePaymentIntentId: paymentIntent.id,
          companyId: paymentData.companyId,
          paymentId: stripePayment.id,
          invoiceId: paymentData.invoiceId,
        },
      });

      const findInvoice = await db.invoice.findUnique({
        where: {
          id: paymentData.invoiceId,
          companyId: paymentData.companyId,
        },
      });

      let stripeInvoice = null;

      if (findInvoice) {
        stripeInvoice = await db.invoice.update({
          where: {
            id: paymentData.invoiceId,
            companyId: paymentData.companyId,
          },
          data: {
            due: {
              decrement: paymentData.amount,
            },
            totalPayment: {
              increment: paymentData.amount,
            },
          },
          include: {
            client: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        });
      }

      // Update the invoice to mark it as paid

      try {
        if (findInvoice?.type === "Estimate") {
          await convertInvoicePublic(
            paymentData.invoiceId,
            paymentData.companyId,
          );
        }
      } catch (error) {
        console.log("🚀 ~ convert invoice public ~ error:", error);
      }

      // Send a notification about the payment received
      await sendPaymentReceivedNotification({
        companyId: paymentData.companyId,
        amount: paymentData.amount,
        clientName: `${stripeInvoice?.client?.firstName} ${stripeInvoice?.client?.lastName}`,
        invoiceId: paymentData.invoiceId,
      });
    }

    // Respond to Stripe with a 200 status to acknowledge receipt
    return NextResponse.json({ message: "Webhook received" }, { status: 200 });
  } catch (error: any) {
    console.error("🚀 ~ Webhook Error:", error);
    return NextResponse.json(
      { error: `Webhook Error: ${error?.message}` },
      { status: 400 },
    );
  }
}
