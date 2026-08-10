"use server";

import { db } from "@/lib/db";
import {
  assertCompanyAccess,
  requireBillingSession,
} from "@/lib/platform-billing/guards";

export async function getPlatformPlans(companyId?: number) {
  try {
    const session = await requireBillingSession();

    const where: any = { isActive: true };

    if (typeof companyId === "number") {
      assertCompanyAccess(session, companyId);
      where.OR = [{ companyId: null }, { companyId }];
    } else if (!session.user.isSuperAdmin) {
      where.OR = [{ companyId: null }, { companyId: session.user.companyId }];
    }

    const plans = await db.platformPlan.findMany({
      where,
      orderBy: { displayOrder: "asc" },
      include: {
        features: true,
      },
    });

    return {
      success: true,
      data: plans,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to fetch plans",
    };
  }
}

export async function getCurrentSubscription(companyId: number) {
  try {
    const session = await requireBillingSession();
    assertCompanyAccess(session, companyId);

    const subscription = await db.platformSubscription.findUnique({
      where: { companyId },
      include: {
        plan: true,
        billingCustomer: {
          include: {
            paymentMethods: {
              where: { isDefault: true },
            },
            invoices: {
              orderBy: { createdAt: "desc" },
            },
          },
        },
      },
    });

    return {
      success: true,
      data: subscription,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to fetch subscription",
    };
  }
}
