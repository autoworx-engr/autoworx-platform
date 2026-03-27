import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { errorHandler } from "@/error-boundary/globalErrorHandler";

/**
 * @swagger
 * /api/virtual-shop/gift-card-settings/public:
 *   get:
 *     summary: Retrieve aggregated public gift card settings
 *     description: Fetch the global gift card settings, templates, promos, and company shop information for a public storefront via its subdomain slug.
 *     tags:
 *       - Virtual Shop Gift
 *     parameters:
 *       - in: query
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: The subdomain slug of the storefront.
 *     responses:
 *       200:
 *         description: Successfully retrieved public aggregated gift card settings.
 *       400:
 *         description: Missing slug.
 *       404:
 *         description: Shop or Settings not found.
 *       500:
 *         description: Internal server error.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return NextResponse.json(
        { success: false, message: "Missing slug parameter" },
        { status: 400 },
      );
    }

    const shop = await db.shop.findUnique({
      where: { slug },
      select: { 
        companyId: true, 
        storeName: true,
        logoUrl: true,
        bannerUrl: true,
        company: {
          select: { id: true, name: true, phone: true, email: true }
        }
      },
    });

    if (!shop) {
      return NextResponse.json(
        { success: false, message: "Shop not found" },
        { status: 404 },
      );
    }

    const companyId = shop.companyId;

    const [settings, templates, promos] = await Promise.all([
      db.giftCardSetting.findUnique({ where: { companyId } }),
      db.giftCardTemplate.findMany({ where: { companyId, isActive: true } }),
      db.giftCardPromo.findMany({ where: { companyId, isActive: true } }),
    ]);

    if (!settings) {
      return NextResponse.json(
        { success: false, message: "Gift card settings not found for this shop" },
        { status: 404 },
      );
    }

    const presetAmounts = (settings.presetAmounts as number[]) || [];

    const aggregatedSettings = {
      shop: {
        storeName: shop.storeName,
        logoUrl: shop.logoUrl,
        bannerUrl: shop.bannerUrl,
        company: shop.company,
      },
      designs: templates.map((t) => ({
        id: t.id.toString(),
        name: t.name,
        imageUrl: t.imageUrl,
        enabled: t.isActive,
        isDefault: t.isDefault,
      })),
      amountPresets: {
        preset1: presetAmounts[0] || 50,
        preset2: presetAmounts[1] || 100,
        preset3: presetAmounts[2] || 200,
        showPresets: presetAmounts.length > 0,
        customEnabled: settings.allowCustomAmount,
        customMin: Number(settings.minCustomAmount) || 25,
        customMax: Number(settings.maxCustomAmount) || 2000,
      },
      delivery: {
        textEnabled: settings.allowSmsDelivery,
        emailEnabled: settings.allowEmailDelivery,
        defaultMethod: settings.defaultDelivery?.toLowerCase() || "email",
        scheduledSendEnabled: settings.allowScheduledSend,
      },
      discounts: promos.map((p) => ({
        id: p.id.toString(),
        code: p.code,
        type: p.type === "Percentage" ? "percent" : "fixed",
        value: Number(p.value),
        expiryDate: p.expireDate ? p.expireDate.toISOString() : "",
        usageLimit: p.usageLimit || 0,
        usedCount: p.timesUsed || 0,
      })),
      policies: {
        termsUrl: settings.termsAndConditions || "#terms",
        privacyUrl: settings.privacyPolicy || "#privacy",
      },
    };

    return NextResponse.json(
      { success: true, data: aggregatedSettings },
      { status: 200 },
    );
  } catch (error: any) {
    const formattedError = errorHandler(error);
    return NextResponse.json(
      { success: false, message: formattedError.message },
      { status: formattedError.statusCode || 500 },
    );
  }
}
