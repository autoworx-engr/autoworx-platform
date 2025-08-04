import AppointmentListBox from "./box/AppointmentListBox";
import EmployeeLeaveRequestsBox from "./box/EmployeeLeaveRequestsBox";
import EmployeePayoutBox from "./box/EmployeePayoutBox";
import InventoryBox from "./box/InventoryBox";
import RevenueBox from "./box/RevenueBox";
import SalesPipelineBox from "./box/SalesPipelineBox";
import ShopPipelineBox from "./box/ShopPipelineBox";
import TaskListBox from "./box/TaskListBox";
// import { useAutoRefreshRoute } from "@/hooks/useAutoRefreshRoute.ts";

const DashboardManager = () => {
  return (
    <div className="flex h-full flex-col gap-x-2 lg:flex-row lg:items-start 2xl:gap-x-8">
      {/* col 1 */}
      <div className="order-1 flex h-full flex-col justify-around space-y-3 lg:w-[20%]">
        {/* sales pipeline */}
        <SalesPipelineBox />
        {/* Shop pipeline */}
        <ShopPipelineBox />
      </div>
      {/* col 2 */}
      <div className="order-4 flex h-full flex-col justify-around space-y-3 lg:order-2 lg:w-[20%]">
        {/* task list */}
        <TaskListBox />
      </div>

      {/* col 3 */}
      <div className="order-3 flex h-full flex-col justify-around space-y-3 lg:w-[20%]">
        {/* appointments */}
        <AppointmentListBox />
      </div>
      {/* col 4*/}
      <div className="order-2 flex h-full flex-col justify-around space-y-4 lg:order-4 lg:w-[40%]">
        <div className="flex flex-col items-start gap-4 lg:flex-row">
          {/* Revenue */}
          <RevenueBox className="w-full rounded-md p-4 shadow-lg lg:w-1/2 2xl:px-6" />
          {/* Inventory */}
          <InventoryBox className="w-full rounded-md p-4 shadow-lg lg:w-1/2 2xl:px-6" />
        </div>
        {/* Employee Payout */}
        <EmployeePayoutBox className="rounded-md p-4 shadow-lg 2xl:px-6" />
        {/* employee leave request */}
        <EmployeeLeaveRequestsBox />
      </div>
    </div>
  );
};

export default DashboardManager;
