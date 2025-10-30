"use client";
import { useServerGet } from "@/hooks/useServerGet";
import PayoutCard from "../../employee/components/PayoutCard";
import PerformanceTable from "./PerformanceTable";
import { getSalesReportData } from "./getSalesReport";
import { useCompanyTimezone } from "@/hooks/useCompanyTimezone";

export default function Page() {
  const timezone = useCompanyTimezone();

  const { data } = useServerGet(getSalesReportData, timezone);
  if (!data) {
    return <div>Loading...</div>;
  }
  const {
    previousCommission,
    currentCommission,
    allCommission,
    growthRatePrevious,
    growthRateCurrent,
    employeeId,
  } = data || {};

  return (
    <>
      <h1 className="mx-2 my-4 text-2xl font-bold md:mx-0">Sales Reporting</h1>
      <div className="mx-2 flex flex-col gap-4 lg:flex-row">
        <PayoutCard
          title="Previous Month Payout"
          amount={previousCommission}
          percentage={growthRatePrevious.rate}
          increased={growthRatePrevious.isPositive}
        />
        <PayoutCard
          title="Current Month Payout"
          amount={currentCommission}
          percentage={growthRateCurrent.rate}
          increased={growthRateCurrent.isPositive}
        />
        <PayoutCard title="YTD Payout" amount={allCommission} />
      </div>
      <PerformanceTable employeeId={employeeId} />
    </>
  );
}
