import LeadsBarChartContainer from "./chart/LeadsBarChartContainer";
import EstimateBarChartContainer from "./chart/EstimateBarChartContainer";
import InvoicesBarChartContainer from "./chart/InvoicesBarChartContainer";
import SalesActivityChartContainer from "./chart/SalesActivityChartContainer";
import { getCompanyTimezone } from "@/actions/settings/getCompanyTimezone";

type TProps = {
  searchParams: {
    startDate?: string;
    endDate?: string;
  };
};

export default function DesktopCharts({ searchParams }: TProps) {
  return (
    <div className="col-span-2 grid grid-cols-2 gap-x-6 gap-y-10">
      <LeadsBarChartContainer searchParams={searchParams} />
      <EstimateBarChartContainer searchParams={searchParams} />
      <InvoicesBarChartContainer searchParams={searchParams} />
      <SalesActivityChartContainer />
    </div>
  );
}
