"use server";

import { db } from "@/lib/db";
import getUser from "@/lib/getUser";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function createConnectedAccount() {
  try {
    const user = await getUser();

    const account = await stripe.accounts.create({
      type: "express",
      country: "US",
      email: user.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    await db.company.update({
      where: { id: user.companyId },
      data: {
        stripeAccountId: account.id,
      },
    });

    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/payments/stripe/refresh?companyId=${user.companyId}`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/payments`,
      type: "account_onboarding",
    });

    return { success: true, url: accountLink.url };
  } catch (error) {
    console.error("Stripe Connect Error:", error);
    return { success: false, message: "Failed to create Stripe account" };
  }
}

export async function getStripeAccount(companyId: number) {
  try {
    if (!companyId) throw new Error("Company ID not found");
    const company = await db.company.findUnique({
      where: { id: companyId },
    });
    if (!company?.stripeAccountId) {
      return { success: false, message: "Stripe account not found" };
    }
    const account = await stripe.accounts.retrieve(company.stripeAccountId);
    // console.log("🚀 ~ getStripeAccount ~ account:", account);
    // let loginLink;
    // try {
    //   loginLink = await stripe.accounts.createLoginLink(
    //     company.stripeAccountId,
    //   );
    //   console.log("🚀 ~ getStripeAccount ~ loginLink:", loginLink);
    // } catch (error) {}

    return {
      success: true,
      data: account,
      companyId,
      enabled: account.charges_enabled,
    };
  } catch (error: any) {
    // console.error("Stripe Connect Error:", error);
    return {
      success: false,
      message: error?.message ?? "Failed to create Stripe account",
    };
  }
}
