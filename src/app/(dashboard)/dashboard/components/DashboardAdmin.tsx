"use client";
import { getAdminInfo } from "@/actions/dashboard/data/getAdminInfo";
import { useServerGet } from "@/hooks/useServerGet";
import { LeaveRequest, Task as TaskType, User } from "@prisma/client";
import Link from "next/link";
import { FaExternalLinkAlt } from "react-icons/fa";
import Appointments from "./Appointments";
import ChartData from "./ChartData";
import EmployeeLeaveRequests from "./EmployeeLeaveRequests";
import Tasks from "./Tasks";
import { useCompanyTimezone } from "@/hooks/useCompanyTimezone";
// import { useAutoRefreshRoute } from "@/hooks/useAutoRefreshRoute.ts";

const Dashboard = ({
  tasks = [],
  companyUsers = [],
  appointments = [],
  pendingLeaveRequests,
}: {
  refreshTime?: number;
  tasks: TaskType[];
  companyUsers: User[];
  appointments: any;
  pendingLeaveRequests: (LeaveRequest & { user: User })[];
}) => {
  const timezone = useCompanyTimezone();
  const { data } = useServerGet(getAdminInfo, timezone);
  // useAutoRefreshRoute(5000);
  return (
    <div className="flex h-full flex-col gap-x-2 lg:flex-row lg:items-start xl:gap-x-8">
      {/* col 1 */}
      <div className="flex h-full w-full flex-col justify-around space-y-4 lg:w-[23%]">
        {/* sales pipeline */}
        <div className="flex-1 rounded-md p-4 shadow-lg 2xl:px-6">
          <div className="mb-8 flex items-center justify-between">
            <span className="text-xl font-bold">Sales Pipeline</span>{" "}
            <Link href="/dashboard/pipeline/sales/pipeline">
              <FaExternalLinkAlt />
            </Link>
          </div>
          <div className="space-y-3">
            <ChartData
              heading="Leads coming in"
              subHeading="/month"
              number={data?.currentTotalLeads ?? 0}
              noRate={true}
            />
            <ChartData
              heading="Leads Converted"
              number={data?.leadsConvertedData?.current ?? 0}
              isPositive={data?.leadsConvertedData?.growth?.isPositive ?? false}
              rate={data?.leadsConvertedData?.growth?.rate.toFixed(2) ?? 0}
            />
            <ChartData
              heading="Conversion Rate"
              subHeading="Leads Converted/Total Leads"
              number={data?.currentConversionRate.toFixed(2) ?? 0}
              // number={formatNumber(data?.currentConversionRate)?? 0}
              isPositive={data?.conversionRateGrowth.isPositive ?? false}
              rate={data?.conversionRateGrowth.rate.toFixed(2) ?? 0}
              isNumberPercent
            />
          </div>
        </div>
        {/* Shop pipeline */}
        <div className="flex-1 rounded-md p-4 shadow-lg 2xl:px-6">
          <div className="mb-8 flex items-center justify-between">
            <span className="text-xl font-bold">Shop Pipeline</span>{" "}
            <Link href="/dashboard/pipeline/shop/pipeline">
              <FaExternalLinkAlt />
            </Link>
          </div>
          <div className="space-y-3">
            <ChartData
              heading="Total Jobs Pending"
              number={data?.totalJobs?.jobs || 0}
              noRate={true}
            />
            <ChartData
              heading="Ongoing Jobs"
              number={data?.ongoingJobs?.ongoingJobs || 0}
              noRate
            />
            <ChartData
              heading="Completed Jobs"
              number={data?.completedJobs?.completedJobs || 0}
              isPositive={data?.completedJobs?.growth?.isPositive || false}
              rate={data?.completedJobs?.growth?.rate || 0}
            />
          </div>
        </div>
      </div>
      {/* col 2 */}
      <div className="flex h-full w-full flex-col justify-around space-y-4 lg:w-[23%]">
        {/* Revenue */}
        <div className="flex-1 rounded-md p-4 shadow-lg 2xl:px-6">
          <div className="mb-8 flex items-center justify-between">
            <span className="text-xl font-bold">Revenue</span>{" "}
            <Link href="/dashboard/reporting/revenue">
              <FaExternalLinkAlt />
            </Link>
          </div>
          <div className="#px-4">
            <ChartData
              heading="Current Revenue"
              dollarSign={true}
              number={data?.revenue?.revenue || 0}
              isPositive={data?.revenue?.growth?.isPositive || false}
              rate={data?.revenue?.growth?.rate || 0}
            />
            <ChartData
              heading="Expected Revenue"
              dollarSign={true}
              number={data?.expectedRevenue?.revenue || 0}
              noRate
              // isPositive={data?.expectedRevenue?.growth?.isPositive || false}
              // rate={data?.expectedRevenue?.growth?.rate || 0}
            />
          </div>
        </div>
        {/* Inventory */}
        <div className="flex-1 rounded-md p-4 shadow-lg 2xl:px-6">
          <div className="mb-8 flex items-center justify-between">
            <span className="text-xl font-bold">Inventory</span>{" "}
            <Link href="/dashboard/reporting/inventory">
              <FaExternalLinkAlt />
            </Link>
          </div>
          <div className="#px-4">
            <ChartData
              heading="Total Value"
              dollarSign={true}
              number={data?.inventory?.totalValue || 0}
              noRate
            />
            <ChartData
              heading="Current Monthly Total"
              number={data?.inventory?.currentMonthTotal || 0}
              dollarSign={true}
              isPositive={data?.inventory?.growth?.isPositive || false}
              rate={data?.inventory?.growth?.rate || 0}
            />
          </div>
        </div>
        {/* Employee Payout */}
        <div className="flex-1 rounded-md p-4 shadow-lg 2xl:px-6">
          <div className="mb-8 flex items-center justify-between">
            <span className="text-xl font-bold">Employee Payout</span>{" "}
            <Link href="/dashboard/reporting/workforce">
              <FaExternalLinkAlt />
            </Link>
          </div>
          <div className="#px-4">
            <ChartData
              heading="Current Month Payout"
              number={data?.employeePayout?.currentMonthTotal}
              dollarSign
              isPositive={data?.employeePayout?.growth?.isPositive}
              rate={data?.employeePayout?.growth?.rate}
            />
          </div>
        </div>
      </div>

      {/* col 3 */}
      <div className="flex h-full w-full flex-1 flex-col space-y-4 lg:w-[23%]">
        <Appointments appointments={appointments} fullHeight />
      </div>
      {/* col 4*/}
      <div className="flex h-full w-full flex-1 flex-col space-y-4 lg:w-[30%]">
        <Tasks tasks={tasks} companyUsers={companyUsers} />
        <EmployeeLeaveRequests pendingLeaveRequests={pendingLeaveRequests} />
      </div>
    </div>
  );
};

export default Dashboard;
