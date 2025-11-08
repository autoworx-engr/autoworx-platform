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
    <div className="flex h-full flex-col gap-4 lg:flex-row xl:gap-x-8 bg-slate-50 dark:bg-slate-900/90 overflow-y-auto overflow-x-hidden">
      {/* col 1 */}
      <div className="flex h-full w-full flex-col justify-around space-y-4 lg:w-[23%]">
        {/* sales pipeline */}
        <SalesPipelineBox />
        {/* Shop pipeline */}
        <ShopPipelineBox />
      </div>
      {/* col 2 */}
      <div className="flex h-full w-full flex-col justify-around space-y-4 lg:w-[23%]">
        {/* Revenue */}
        <RevenueBox />
        {/* Inventory */}
        <InventoryBox />
        {/* Employee Payout */}
        <EmployeePayoutBox />
      </div>

      {/* col 3 */}
      <div className="flex h-full w-full flex-1 flex-col space-y-4 lg:w-[23%]">
        <AppointmentListBox />
      </div>
      {/* col 4*/}
      <div className="flex h-full w-full flex-1 flex-col space-y-4 lg:w-[30%]">
        <TaskListBox />
        <ReputationBox />
      </div>
    </div>
  );
};

export default Dashboard;
