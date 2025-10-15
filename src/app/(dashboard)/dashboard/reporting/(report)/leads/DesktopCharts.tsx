import EstimateBarChartContainer from "./chart/EstimateBarChartContainer";
import InvoicesBarChartContainer from "./chart/InvoicesBarChartContainer";
import LeadsBarChartContainer from "./chart/LeadsBarChartContainer";

type TProps = {
  searchParams: {
    startDate?: string;
    endDate?: string;
  };
};

export default function DesktopCharts({ searchParams }: TProps) {
  return (
    <div className="col-span-2 lg:col-span-3 grid grid-cols-1 gap-x-6 gap-y-10">
      <LeadsBarChartContainer searchParams={searchParams} />
      <EstimateBarChartContainer searchParams={searchParams} />
      <InvoicesBarChartContainer searchParams={searchParams} />
      {/* <SalesActivityChartContainer /> */}
    </div>
  );
}
