import React from "react";
import ChartData from "../ChartData";
import { getInventory } from "@/actions/dashboard/data/getAdminInfo";
import BoxTitle from "./BoxTitle";
import { getCompanyTimezone } from "@/actions/settings/getCompanyTimezone";
import { cn } from "@/lib/cn";
import { hasRouteAccess } from "@/lib/serverRouteGuard";
import BoxRestricted from "./BoxRestricted";

type TInventoryBoxProps = {
  className?: string;
};

export default async function InventoryBox({ className }: TInventoryBoxProps) {
  // Inventory module gates this widget — checked before fetching so a user
  // without it never runs the stock queries.
  if (!(await hasRouteAccess("/dashboard/inventory"))) {
    return (
      <BoxRestricted title="Inventory" what="inventory" className={className} />
    );
  }

  const companyTimezone = await getCompanyTimezone();
  const timezone =
    companyTimezone?.timezone ||
    Intl.DateTimeFormat().resolvedOptions().timeZone;

  const inventory = await getInventory(timezone);

  // Clean data extraction and parsing
  const totalValue = inventory?.totalValue || 0;
  const currentMonthTotal = inventory?.currentMonthTotal || 0;
  const inventoryGrowthRate = parseFloat(
    (inventory?.growth?.rate ?? 0).toFixed(2),
  );
  const isInventoryPositive = inventory?.growth?.isPositive ?? false;

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
        title="Inventory"
        redirectLink="/dashboard/reporting/inventory?view=inventory"
        className="mb-4 md:mb-6" // Consistent spacing
      />

      {/* Metric Content Area */}
      {/* Using 'flex-col' and relying on ChartData's internal border for separation */}
      <div className="flex flex-col">
        <ChartData
          heading="Total Stock Value" // Enhanced heading for clarity
          subHeading="As of today"
          dollarSign={true}
          number={totalValue}
          noRate={true} // Total value is a static snapshot, growth rate applies to flow
        />

        {/* Separator for visual clarity between metrics */}
        <div className="h-[1px] w-full bg-slate-200/70 dark:bg-slate-700/70 my-3" />

        <ChartData
          heading="Current Monthly Total" // Enhanced heading to represent change/movement
          // subHeading="Value added/removed this month"
          dollarSign={true}
          number={currentMonthTotal}
          // The rate shows the trend of inventory flow vs. last period
          isPositive={isInventoryPositive}
          rate={inventoryGrowthRate}
        />
      </div>
    </div>
  );
}
