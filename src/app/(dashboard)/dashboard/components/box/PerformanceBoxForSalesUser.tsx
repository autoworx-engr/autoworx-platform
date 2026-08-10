import ChartData from "../ChartData";
import BoxTitle from "./BoxTitle";
import { getCompanyTimezone } from "@/actions/settings/getCompanyTimezone";
import { getConvertedLeadsPerMonth } from "@/actions/dashboard/data/getAdminInfo";
import getUser from "@/lib/getUser";
import { getSalespersonLeads } from "@/actions/dashboard/data/getSalesWinRate";
import { getDateRanges } from "@/actions/dashboard/data/lib";
import { db } from "@/lib/db";
import { getCompanyId } from "@/lib/companyId";
import { cn } from "@/lib/cn"; // Ensure cn utility is imported
import { hasRouteAccess } from "@/lib/serverRouteGuard";
import BoxRestricted from "./BoxRestricted";

export default async function PerformanceBoxForSalesUser() {
  // Gated on the route this box links to — Reporting & Analytics, which for the
  // Sales role is the view-only column. Checked before fetching so a user
  // without it never runs the lead queries.
  if (!(await hasRouteAccess("/dashboard/reporting/teams"))) {
    return (
      <BoxRestricted title="Sales Performance" what="reporting & analytics" />
    );
  }

  const currentUser = await getUser();
  const companyTimezone = await getCompanyTimezone();

  const companyId = await getCompanyId();
  const timezone = companyTimezone?.timezone;
  const leadsConvertedData = await getConvertedLeadsPerMonth(timezone);
  const { currentTotalLeads: salesCurrentTotalLeads, currentConvertedLeads } =
    await getSalespersonLeads(String(currentUser.id));

  // --- Data Processing ---
  const winLossRateRaw =
    salesCurrentTotalLeads > 0
      ? (currentConvertedLeads / salesCurrentTotalLeads) * 100
      : 0;
  const winLossRate = parseFloat(winLossRateRaw.toFixed(2));

  const leadsConvertedRate = parseFloat(
    (leadsConvertedData?.growth?.rate ?? 0).toFixed(2),
  );
  const leadsConvertedIsPositive =
    leadsConvertedData?.growth?.isPositive ?? false;
  // --- End Data Processing ---

  const { currentMonthStart, currentMonthEnd } = getDateRanges(timezone);

  const currentTotalLeads = await db.lead.count({
    where: {
      companyId,
      createdAt: {
        gte: currentMonthStart,
        lte: currentMonthEnd,
      },
    },
  });

  return (
    // Outer Container: Apply full Glassmorphism style and ensure flex-1 stretching
    <div
      className={cn(
        `
          flex flex-1 flex-col p-4 md:p-6 rounded-2xl transition-all duration-300 h-full overflow-y-auto thin-scrollbar

          // Glassmorphism aesthetic (Replaces old shadow-lg)
          bg-white/50 dark:bg-slate-900/50
          backdrop-blur-md

          // Subtle border and lift
          ring-1 ring-slate-900/5 dark:ring-white/10
          shadow-lg dark:shadow-2xl dark:shadow-blue-900/20

          // Hover effect for interactivity
          hover:shadow-xl hover:shadow-blue-500/10 dark:hover:shadow-indigo-500/10
        `,
      )}
    >
      <BoxTitle
        title="Sales Performance"
        redirectLink="/dashboard/reporting/teams"
        className="mb-4 md:mb-6 flex-shrink-0"
      />

      {/* Metrics Container: Use flex-col and justify-around for vertical spacing */}
      <div className="flex h-full flex-col justify-around space-y-4 pt-2">
        {/* Metric 1: Leads coming in (General Company Metric) */}
        <ChartData
          heading="Leads Generated (Company)"
          subHeading="/month"
          number={currentTotalLeads ?? 0}
          noRate={true}
          className="border-b border-slate-200/50 dark:border-slate-800/50 pb-4"
        />

        {/* Metric 2: Leads Converted (Company Metric) */}
        <ChartData
          heading="Leads Converted (Company)"
          number={leadsConvertedData?.current ?? 0}
          isPositive={leadsConvertedIsPositive}
          rate={leadsConvertedRate}
          className="pb-4"
        />

        {/* Metric 3: Win/Loss Rate (Individual Metric - High Emphasis) */}
        <ChartData
          heading="Your Win/Loss Rate" // Emphasize individual performance
          number={winLossRate}
          isNumberPercent
          // Visual Emphasis: Indigo highlight for the most important individual KPI
          className="p-3 rounded-lg border-2 border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-900/20 shadow-md"
          numberClassName="!text-2xl font-extrabold text-indigo-600 dark:text-indigo-300"
          noRate // Assuming Win/Loss rate is the target metric, growth is handled externally if needed
        />

        {/* Metric 4: Employee Pay (Placeholder) */}
        <ChartData
          heading="Estimated Payout"
          number={0}
          dollarSign
          noRate
          subHeading="/Current Period"
          className="border-t border-slate-200/50 dark:border-slate-800/50 pt-4"
        />
      </div>
    </div>
  );
}
