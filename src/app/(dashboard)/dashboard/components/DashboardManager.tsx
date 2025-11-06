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
    // Outer Container: Set items-start/items-stretch and consistent gap
    <div className="flex w-full min-h-full flex-col gap-4 lg:flex-row lg:items-stretch xl:gap-6 2xl:gap-8">
      {/* Col 1: Pipeline Boxes (20%)
        (Sales & Shop)
      */}
      <div className="order-1 flex w-full flex-col gap-4 lg:w-[20%]">
        <SalesPipelineBox />
        <ShopPipelineBox />
      </div>

      {/* Col 2: Task List (20%)
        (The `flex-1` component must stretch to fill height)
      */}
      <div className="order-4 flex w-full flex-col gap-4 lg:order-2 lg:w-[20%]">
        <TaskListBox /> {/* ADDED flex-1 */}
      </div>

      {/* Col 3: Appointments List (20%)
        (The `flex-1` component must stretch to fill height)
      */}
      <div className="order-3 flex w-full flex-col gap-4 lg:w-[20%]">
        <AppointmentListBox /> {/* ADDED flex-1 */}
      </div>

      {/* Col 4: Metrics & Actions (40%)
        (Revenue, Inventory, Payout, Leave Requests)
      */}
      <div className="order-2 flex w-full flex-col gap-4 lg:order-4 lg:w-[40%]">
        {/* Row 1: Revenue & Inventory (Must share space) */}
        <div className="flex flex-col items-start gap-4 lg:flex-row">
          {/* NOTE: We must remove the redundant shadow/padding/rounded classes from the parent and rely on the child component */}
          <RevenueBox className="w-full lg:w-1/2" />
          <InventoryBox className="w-full lg:w-1/2" />
        </div>

        {/* Row 2: Payout */}
        {/* NOTE: Remove redundant styling from parent */}
        <EmployeePayoutBox />

        {/* Row 3: Employee Leave Request */}
        <EmployeeLeaveRequestsBox />
      </div>
    </div>
  );
};

export default DashboardManager;
