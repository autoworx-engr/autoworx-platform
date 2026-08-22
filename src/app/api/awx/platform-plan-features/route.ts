import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  assertSuperAdmin,
  requireBillingSession,
} from "@/lib/platform-billing/guards";

const catalogName = "Feature Catalog";

export async function GET() {
  try {
    const session = await requireBillingSession();
    assertSuperAdmin(session);

    const catalogPlan = await db.platformPlan.findUnique({
      where: { name: catalogName },
      include: { features: true },
    });

    if (catalogPlan) {
      return NextResponse.json({
        success: true,
        features: catalogPlan.features.map((feature) => ({
          key: feature.featureKey,
          type: feature.type,
          value: feature.value,
        })),
      });
    }

    const features = await db.planFeature.findMany({
      distinct: ["featureKey"],
      orderBy: { featureKey: "asc" },
    });

    return NextResponse.json({
      success: true,
      features: features.map((feature) => ({
        key: feature.featureKey,
        type: feature.type,
        value: feature.value,
      })),
    });
  } catch (error: any) {
    console.error("❌ Feature catalog error", error);
    const message = error?.message || "Failed to load feature catalog";
    if (message === "Unauthorized") {
      return NextResponse.json({ success: false, message }, { status: 401 });
    }
    if (message === "Forbidden") {
      return NextResponse.json({ success: false, message }, { status: 403 });
    }
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
