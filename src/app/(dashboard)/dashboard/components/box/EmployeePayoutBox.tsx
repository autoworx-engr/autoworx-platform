import { getEmployeePayout } from "@/actions/dashboard/data/getAdminInfo";
import { getCompanyTimezone } from "@/actions/settings/getCompanyTimezone";
import ChartData from "../ChartData";
import BoxTitle from "./BoxTitle";
import { cn } from "@/lib/cn";

type TEmployeePayoutBoxProps = {
  className?: string;
};

export default async function EmployeePayoutBox({
  className,
}: TEmployeePayoutBoxProps) {
  const companyTimezone = await getCompanyTimezone();
  const timezone =
    companyTimezone?.timezone ??
    Intl.DateTimeFormat().resolvedOptions().timeZone;
  const employeePayout = await getEmployeePayout(timezone);
  return (
    <div className={cn("flex-1 rounded-md p-4 shadow-lg 2xl:px-6", className)}>
      <BoxTitle
        title="Employee Payout"
        redirectLink="/dashboard/reporting/teams"
      />
      <div className="#px-4">
        <ChartData
          heading="Current Month Payout"
          number={employeePayout?.currentMonthTotal}
          dollarSign
          isPositive={employeePayout?.growth?.isPositive}
          rate={employeePayout?.growth?.rate}
        />
      </div>
    </div>
  );
}
