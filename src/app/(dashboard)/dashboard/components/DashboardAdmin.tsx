import AppointmentListBox from "./box/AppointmentListBox";
import EmployeePayoutBox from "./box/EmployeePayoutBox";
import InventoryBox from "./box/InventoryBox";
import ReputationBox from "./box/ReputationBox";
import RevenueBox from "./box/RevenueBox";
import SalesPipelineBox from "./box/SalesPipelineBox";
import ShopPipelineBox from "./box/ShopPipelineBox";
import TaskListBox from "./box/TaskListBox";

const Dashboard = async () => {
  return (
    <div
      className="
        flex w-full min-h-full flex-col gap-4 p-4 lg:flex-row lg:items-stretch xl:gap-6
        bg-slate-50 dark:bg-slate-900/90 overflow-y-auto overflow-x-hidden
      "
    >
      {/* Column 1: Sales & Shop Pipelines (2 items) */}
      <div className="flex w-full flex-col gap-4 lg:w-1/4 xl:w-[23%]">
        <SalesPipelineBox />
        <ShopPipelineBox />
      </div>

      {/* Column 2: Core Metrics - Revenue, Inventory, Payout (3 items)
         Using 'flex-1' on children inside 'flex-col' would equalize height if needed
      */}
      <div className="flex w-full flex-col gap-4 lg:w-1/4 xl:w-[23%]">
        <RevenueBox />
        <InventoryBox />
        <EmployeePayoutBox />
      </div>

      {/* Column 3: Appointments List (1 item - Must stretch) */}
      <div className="flex w-full flex-col gap-4 lg:w-1/4 xl:w-[23%]">
        {/* The list box must use flex-1 to fill the height of the column */}
        <AppointmentListBox />
      </div>

      {/* Column 4: Task List & Reputation (Wider column for list/focal elements) */}
      {/* Left side content */}
      <div className="flex w-full flex-col gap-4 lg:w-1/4 xl:w-[31%] h-full min-h-0">
        <div className="flex-1 min-h-0">
          <TaskListBox />
        </div>
        <div className="flex-1 min-h-0">
          <ReputationBox />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
