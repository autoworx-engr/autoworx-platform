import { db } from "@/lib/db";
import React from "react";
import ReportingStatisticsCard from "../../components/ReportingStatisticsCard";

export default async function Revenue() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [newSubsThisMonth, totalCompanies, activeSubs] = await Promise.all([
    db.platformSubscription.count({
      where: { createdAt: { gte: startOfMonth } },
    }),
    db.company.count(),
    db.platformSubscription.findMany({
      where: { status: "ACTIVE" },
      select: { plan: { select: { price: true } } },
    }),
  ]);

  const totalRevenue = activeSubs.reduce(
    (sum, s) => sum + Number(s.plan?.price ?? 0),
    0,
  );

  return (
    <div className="min-h-screen">
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:w-fit">
        <ReportingStatisticsCard
          title="New Subscriptions"
          statistic={newSubsThisMonth}
        />
        <ReportingStatisticsCard
          title="Total No. of Shops"
          statistic={totalCompanies}
        />
        <ReportingStatisticsCard
          title="Monthly Revenue (USD)"
          statistic={totalRevenue}
        />
      </div>
    </div>
  );
}
