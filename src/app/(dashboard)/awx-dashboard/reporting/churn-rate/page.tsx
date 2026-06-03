import { db } from "@/lib/db";
import React from "react";
import ReportingStatisticsCard from "../../components/ReportingStatisticsCard";

export default async function ChurnRate() {
  const [cancelledCount, totalCount] = await Promise.all([
    db.platformSubscription.count({ where: { status: "CANCELED" } }),
    db.platformSubscription.count(),
  ]);

  const churnRatePct =
    totalCount > 0 ? Math.round((cancelledCount / totalCount) * 100) : 0;

  return (
    <div className="min-h-screen">
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:w-fit">
        <ReportingStatisticsCard
          title="Cancelled Subscriptions"
          statistic={cancelledCount}
        />
        <ReportingStatisticsCard
          title="Churn Rate (%)"
          statistic={churnRatePct}
        />
      </div>
    </div>
  );
}
