import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const session = await getServerSession(authOptions);
  const companyId = session?.user.companyId;

  if (!companyId) {
    throw new Error("Company ID is required to create an email template.");
  }
  const code = searchParams.get("code");
  if (!code)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/payments`,
    );

  try {
    const response = await fetch("https://connect.stripe.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_secret: process.env.STRIPE_SECRET_KEY!,
        code,
        grant_type: "authorization_code",
      }),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error_description);

    // Store `stripe_user_id` in your database (this is the connected account ID)
    await db.company.update({
      where: { id: companyId },
      data: { stripeAccountId: data.stripe_user_id },
    });

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/payments`,
    );
  } catch (error) {
    console.error("Stripe OAuth Error:", error);
    return NextResponse.json(
      { error: "Failed to connect Stripe" },
      { status: 500 },
    );
  }
}
