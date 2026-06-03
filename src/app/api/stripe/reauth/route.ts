import { db } from "@/lib/db";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

/**
 * @swagger
 * /api/stripe/reauth:
 *   get:
 *     summary: Get Stripe reauth URL
 *     tags: [Stripe]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Redirects to Stripe account onboarding
 *       400:
 *         description: Missing Company ID or account not found
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");

  if (!companyId) {
    return Response.json(
      { success: false, message: "Missing Company ID" },
      { status: 400 },
    );
  }
  const company = await db.company.findUnique({
    where: {
      id: +companyId,
    },
  });
  if (!company?.stripeAccountId) {
    return Response.json(
      { success: false, error: "Stripe account not found" },
      { status: 400 },
    );
  }
  try {
    const accountLink = await stripe.accountLinks.create({
      account: company.stripeAccountId,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/payments/stripe/refresh?companyId=${companyId}`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/payments`,
      type: "account_onboarding",
    });

    // return Response.json({ url: accountLink.url });
    return Response.redirect(accountLink.url);
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 400 });
  }
}
