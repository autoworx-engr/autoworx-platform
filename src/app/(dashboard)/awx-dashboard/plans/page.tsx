import { db } from "@/lib/db";
import { PlatformPlanManager } from "./PlatformPlanManager";

const page = async () => {
  const plans = await db.platformPlan.findMany({
    include: {
      features: true,
      _count: { select: { subscriptions: true } },
    },
    orderBy: { displayOrder: "asc" },
  });

  const plansData = plans
    .filter((plan) => plan.name !== "Feature Catalog")
    .map((plan) => ({
      ...plan,
      // Convert Decimal to number safely – toFixed avoids floating-point drift
      price: parseFloat(plan.price.toFixed(2)),
    }));

  return <PlatformPlanManager initialPlans={plansData} />;
};

export default page;
