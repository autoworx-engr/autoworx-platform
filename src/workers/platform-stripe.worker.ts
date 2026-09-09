import { getPlatformStripeClient } from "@/lib/platform-billing/stripe/client";
import type Stripe from "stripe";
import { handleInvoiceEvent } from "./platform-stripe/invoice-sync";
import {
  handleCustomerDefaultPaymentMethodChanged,
  handlePaymentMethodAttached,
  handlePaymentMethodDetached,
} from "./platform-stripe/payment-method-sync";
import {
  handleCheckoutCompleted,
  handleSubscriptionDeleted,
  upsertSubscriptionFromStripe,
} from "./platform-stripe/subscription-sync";

export async function processPlatformStripeEvent(webhookEvent: {
  id: number;
  payload: unknown;
}) {
  const event = webhookEvent.payload as Stripe.Event;

  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(
        event.data.object as Stripe.Checkout.Session,
      );
      break;
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      // Stripe does not guarantee event order, and a pg-boss retry can land
      // minutes late — so the payload may describe a state that has already
      // been superseded, and writing it verbatim can resurrect a cancelled
      // subscription. Re-read the subscription and sync current truth, which
      // makes this handler order-independent.
      const fromPayload = event.data.object as Stripe.Subscription;
      const fresh = await getPlatformStripeClient().subscriptions.retrieve(
        fromPayload.id,
      );
      await upsertSubscriptionFromStripe(fresh, webhookEvent.id);
      break;
    }
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;
    case "invoice.paid":
    case "invoice.payment_failed":
      await handleInvoiceEvent(
        event.data.object as Stripe.Invoice,
        webhookEvent.id,
      );
      break;
    case "payment_method.attached":
      await handlePaymentMethodAttached(
        event.data.object as Stripe.PaymentMethod,
      );
      break;
    case "customer.updated":
      await handleCustomerDefaultPaymentMethodChanged(
        event.data.object as Stripe.Customer,
      );
      break;
    case "payment_method.detached":
      await handlePaymentMethodDetached(
        event.data.object as Stripe.PaymentMethod,
      );
      break;
    default:
      break;
  }
}
