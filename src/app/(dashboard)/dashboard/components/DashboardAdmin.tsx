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
    <div className="min-h-screen w-full bg-[#f8fafc] p-4 sm:p-0 dark:bg-[#0f172a]">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:gap-4 items-stretch">
        
        <div className="flex flex-col gap-4 xl:gap-6">
          <SalesPipelineBox />
          <ShopPipelineBox />
        </div>

        <div className="flex flex-col gap-4 xl:gap-6">
          <RevenueBox />
          <InventoryBox />
          <EmployeePayoutBox />
        </div>

        <div className="flex flex-col">
          <AppointmentListBox />
        </div>

        <div className="md:col-span-full lg:col-span-1">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-1 lg:h-full xl:gap-6">
            <div className="flex flex-col h-full">
              <TaskListBox />
            </div>
            <div className="flex flex-col h-full">
              <ReputationBox />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
