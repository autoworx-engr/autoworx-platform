import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import React from "react";
import ReportingStatisticsCard from "../../components/ReportingStatisticsCard";

export default async function Bugs() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isSuperAdmin) {
    redirect("/dashboard");
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalBugs, bugsThisMonth] = await Promise.all([
    db.bugReport.count(),
    db.bugReport.count({ where: { createdAt: { gte: startOfMonth } } }),
  ]);

  const olderBugsCount = totalBugs - bugsThisMonth;

  return (
    <div className="min-h-screen">
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:w-fit">
        <ReportingStatisticsCard
          title="New Bugs (This Month)"
          statistic={bugsThisMonth}
        />
        <ReportingStatisticsCard
          title="Total Bug Reports"
          statistic={totalBugs}
        />
        <ReportingStatisticsCard
          title="Older Reports"
          statistic={olderBugsCount}
        />
      </div>
    </div>
  );
}
