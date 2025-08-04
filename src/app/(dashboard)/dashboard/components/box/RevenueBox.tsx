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
    <div className={cn("flex-1 rounded-md p-4 shadow-lg 2xl:px-6", className)}>
      <BoxTitle title="Revenue" redirectLink="/dashboard/reporting/revenue" />
      <div className="#px-4">
        <ChartData
          heading="Current Revenue"
          dollarSign={true}
          number={revenue?.revenue || 0}
          isPositive={revenue?.growth?.isPositive || false}
          rate={revenue?.growth?.rate || 0}
        />
        <ChartData
          heading="Expected Revenue"
          dollarSign={true}
          number={expectedRevenue?.revenue || 0}
          noRate
          // isPositive={data?.expectedRevenue?.growth?.isPositive || false}
          // rate={data?.expectedRevenue?.growth?.rate || 0}
        />
      </div>
    </div>
  );
}
