import { getCompanyTimezone } from "@/actions/settings/getCompanyTimezone";
import ChartData from "../ChartData";
import BoxTitle from "./BoxTitle";
import {
  getExpectedRevenue,
  getRevenue,
} from "@/actions/dashboard/data/getAdminInfo";
import { cn } from "@/lib/cn";

type TRevenueBoxProps = {
  className?: string;
};

export default async function RevenueBox({ className }: TRevenueBoxProps) {
  const companyTimezone = await getCompanyTimezone();
  const timezone =
    companyTimezone?.timezone ||
    Intl.DateTimeFormat().resolvedOptions().timeZone;
  const revenue = await getRevenue(timezone);
  const expectedRevenue = await getExpectedRevenue();

  return (
    <div
      className={cn(
        // Premium Card/Glassmorphism Container Style
        `
          flex-1 p-4 md:p-6 rounded-2xl shadow-xl transition-all duration-300

          // Glassmorphism effect
          bg-white/50 dark:bg-slate-900/50
          backdrop-blur-md

          // Subtle border and shadow for lift
          ring-1 ring-slate-900/5 dark:ring-white/10
          shadow-lg dark:shadow-2xl dark:shadow-blue-900/20
        `,
        className,
      )}
    >
      {/* BoxTitle (Assumed to be clean and simple) */}
      <BoxTitle title="Revenue" redirectLink="/dashboard/reporting/revenue" />

      {/* Metrics Content Area */}
      <div className="pt-2">
        {/* Current Revenue - Highlighting growth */}
        <ChartData
          heading="Current Revenue"
          subHeading="/monthly"
          dollarSign={true}
          number={revenue?.revenue || 0}
          isPositive={revenue?.growth?.isPositive || false}
          rate={revenue?.growth?.rate || 0}
        />

        {/* Separator for visual clarity between metrics */}
        <div className="h-[1px] w-full bg-slate-200/70 dark:bg-slate-700/70 my-3" />

        {/* Expected Revenue - Static metric */}
        <ChartData
          heading="Expected Revenue"
          subHeading="/monthly"
          dollarSign={true}
          number={expectedRevenue?.revenue || 0}
          noRate
        />
      </div>
    </div>
  );
}
