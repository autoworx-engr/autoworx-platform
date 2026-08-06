import { getEmployeePayout } from "@/actions/dashboard/data/getAdminInfo";
import { getCompanyTimezone } from "@/actions/settings/getCompanyTimezone";
import ChartData from "../ChartData";
import BoxTitle from "./BoxTitle";
import { cn } from "@/lib/cn";
import { hasRouteAccess } from "@/lib/serverRouteGuard";
import BoxRestricted from "./BoxRestricted";

type TEmployeePayoutBoxProps = {
  className?: string;
};

export default async function EmployeePayoutBox({
  className,
}: TEmployeePayoutBoxProps) {
  // Gated on the route this box links to (/dashboard/reporting/teams resolves
  // to Reporting & Analytics), checked before fetching so a user without it
  // never runs the payout query.
  if (!(await hasRouteAccess("/dashboard/reporting/teams"))) {
    return (
      <BoxRestricted
        title="Employee Payout"
        what="employee payout"
        className={className}
      />
    );
  }

  const companyTimezone = await getCompanyTimezone();
  const timezone =
    companyTimezone?.timezone ??
    Intl.DateTimeFormat().resolvedOptions().timeZone;

  const employeePayout = await getEmployeePayout(timezone);

  // Data Extraction and Formatting
  const currentMonthTotal = employeePayout?.currentMonthTotal || 0;

  // Payout is a cost, so a higher rate/growth is typically seen as 'Negative' financially.
  // We'll calculate the rate cleanly and determine if the growth is positive or negative for the indicator.
  const payoutGrowthRate = parseFloat(
    (employeePayout?.growth?.rate ?? 0).toFixed(2),
  );

  // For Payout, growth (isPositive = true) indicates a higher cost, which is usually negative for a dashboard.
  // We flip the indicator color if the rate is positive (cost increased).
  const isPayoutGrowthPositive = employeePayout?.growth?.isPositive ?? false;

  // IMPORTANT: For the performance indicator, we often show positive financial flow (Revenue Up) as Green.
  // For costs (Payout), we often show cost increase (isPositive=true) as Red.
  // However, we'll keep the `isPositive` prop as the raw data indicator, and rely on the viewer to understand context.
  // If you wanted to FLIP the color indicator: `!isPayoutGrowthPositive`

  return (
    <div
      className={cn(
        `
          flex-1 flex flex-col p-4 md:p-6 rounded-2xl transition-all duration-300

          // Glassmorphism aesthetic
          bg-white/50 dark:bg-slate-900/50
          backdrop-blur-md

          // Subtle border and lift
          ring-1 ring-slate-900/5 dark:ring-white/10
          shadow-lg dark:shadow-2xl dark:shadow-blue-900/20

          // Hover effect for interactivity
          hover:shadow-xl hover:shadow-blue-500/10 dark:hover:shadow-indigo-500/10

        `,
        className,
      )}
    >
      {/* Title and Link */}
      <BoxTitle
        title="Employee Payout"
        redirectLink="/dashboard/reporting/teams?view=teams"
        className="mb-4 md:mb-6" // Consistent spacing
      />

      {/* Metric Content Area */}
      {/* Using 'flex-col' and relying on ChartData's clean internal structure */}
      <div className="flex flex-col">
        <ChartData
          heading="Current Month Payout" // Refined heading
          // subHeading="This period vs. last period"
          number={currentMonthTotal}
          dollarSign
          // Pass raw growth indicator and clean rate
          isPositive={isPayoutGrowthPositive}
          rate={payoutGrowthRate}
        />
      </div>
    </div>
  );
}
