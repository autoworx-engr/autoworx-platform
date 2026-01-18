"use server";

import { db } from "@/lib/db";

export async function getPlatformPlans() {
  try {
    const plans = await db.platformPlan.findMany({
      where: { isActive: true },
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
          }
        }
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
