import React from "react";
import ChartData from "../ChartData";
import { getInventory } from "@/actions/dashboard/data/getAdminInfo";
import BoxTitle from "./BoxTitle";
import { getCompanyTimezone } from "@/actions/settings/getCompanyTimezone";
import { cn } from "@/lib/cn";

type TInventoryBoxProps = {
  className?: string;
};

export default async function InventoryBox({ className }: TInventoryBoxProps) {
  const companyTimezone = await getCompanyTimezone();
  const timezone =
    companyTimezone?.timezone ||
    Intl.DateTimeFormat().resolvedOptions().timeZone;
  const inventory = await getInventory(timezone);
  return (
    <div className={cn("flex-1 rounded-md p-4 shadow-lg 2xl:px-6", className)}>
      <BoxTitle
        title="Inventory"
        redirectLink="/dashboard/reporting/inventory"
      />
      <div className="#px-4">
        <ChartData
          heading="Total Value"
          dollarSign={true}
          number={inventory?.totalValue || 0}
          noRate
        />
        <ChartData
          heading="Current Monthly Total"
          number={inventory?.currentMonthTotal || 0}
          dollarSign={true}
          isPositive={inventory?.growth?.isPositive || false}
          rate={inventory?.growth?.rate || 0}
        />
      </div>
    </div>
  );
}
