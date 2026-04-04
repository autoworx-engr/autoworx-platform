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
      <div className="flex h-full w-full flex-1 flex-col space-y-4 lg:w-[26%]">
        <AppointmentListBox />
      </div>
      {/* col 4*/}
      <div className="flex h-full w-full flex-1 flex-col space-y-4 lg:w-[27%]">
        <div className="flex-1 min-h-0">
          <TaskListBox />
        </div>
<<<<<<< HEAD
        <div className="flex-1 min-h-0">
          <ReputationBox />
=======

        {/* Column 3 */}
        <div className="flex flex-col h-full max-h-[30rem] md:col-span-2 lg:col-span-1 lg:max-h-[90vh]">
          <AppointmentListBox />
        </div>

        {/* Column 4 */}
        <div className="md:col-span-2 lg:col-span-1 lg:max-h-[90vh]">
          <div className="flex flex-col md:flex-row lg:flex-col h-full gap-2 xl:gap-4">
            <div className="flex-1 min-h-[30rem] sm:min-h-0 max-h-[30rem] lg:max-h-[90vh]">
              <TaskListBox />
            </div>
            <div className="flex-1 min-h-0 max-h-[30rem] lg:max-h-[90vh]">
              <ReputationBox />
            </div>
          </div>
>>>>>>> b13cc748f79e5676eb818262729c7aee087e2d7f
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
