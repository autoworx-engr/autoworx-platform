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
    <div className="max-h-[90vh] w-full bg-[#f8fafc] p-4 dark:bg-[#0f172a]">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:gap-4 items-stretch">
        
        {/* Column 1 */}
        <div className="flex flex-col gap-2 xl:gap-4 max-h-[90vh]">
          <SalesPipelineBox />
          <ShopPipelineBox />
        </div>

        {/* Column 2 */}
        <div className="flex flex-col gap-2 xl:gap-4 max-h-[90vh]">
          <RevenueBox />
          <InventoryBox />
          <EmployeePayoutBox />
        </div>

        {/* Column 3 */}
        <div className="flex flex-col h-full max-h-[90vh]">
          <AppointmentListBox />
        </div>

        {/* Column 4 */}
        <div className="md:col-span-full lg:col-span-1 max-h-[90vh]">
          <div className="flex flex-col md:flex-row lg:flex-col h-full gap-2 xl:gap-4">
            <div className="flex-1 min-h-0 max-h-[90vh]">
              <TaskListBox />
            </div>
            <div className="flex-1 min-h-0 max-h-[90vh]">
              <ReputationBox />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
