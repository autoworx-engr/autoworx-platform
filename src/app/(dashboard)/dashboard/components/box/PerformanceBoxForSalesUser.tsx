import ChartData from "../ChartData";
import BoxTitle from "./BoxTitle";
import { getCompanyTimezone } from "@/actions/settings/getCompanyTimezone";
import { getConvertedLeadsPerMonth } from "@/actions/dashboard/data/getAdminInfo";
import getUser from "@/lib/getUser";
import { getSalespersonLeads } from "@/actions/dashboard/data/getSalesWinRate";
import { getDateRanges } from "@/actions/dashboard/data/lib";
import { db } from "@/lib/db";
import { getCompanyId } from "@/lib/companyId";

export default async function PerformanceBoxForSalesUser() {
  const currentUser = await getUser();
  const companyTimezone = await getCompanyTimezone();

  const companyId = await getCompanyId();
  const timezone = companyTimezone?.timezone;
  const leadsConvertedData = await getConvertedLeadsPerMonth(timezone);
  const { currentTotalLeads: salesCurrentTotalLeads, currentConvertedLeads } =
    await getSalespersonLeads(String(currentUser.id));

  const winLossRate =
    salesCurrentTotalLeads > 0
      ? (currentConvertedLeads / salesCurrentTotalLeads) * 100
      : 0;

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
    <div className="h-full rounded-md p-4 shadow-lg 2xl:px-6">
      <BoxTitle title="Performance" redirectLink="/dashboard/reporting/teams" />
      <div className="flex h-[80%] flex-col justify-around space-y-3">
        <ChartData
          heading="Leads coming in"
          subHeading="/month"
          number={currentTotalLeads ?? 0}
          noRate={true}
        />
        <ChartData
          heading="Leads Converted"
          number={leadsConvertedData?.current ?? 0}
          isPositive={leadsConvertedData?.growth?.isPositive ?? false}
          rate={leadsConvertedData?.growth?.rate.toFixed(2) ?? 0}
        />
        <ChartData
          heading="Win/Loss Rate"
          number={winLossRate?.toFixed(2) ?? 0}
          isNumberPercent
        />
        <ChartData heading="Employee Pay" number={0} dollarSign />
      </div>
    </div>
  );
}
