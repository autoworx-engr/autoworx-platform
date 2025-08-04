import AppointmentListBox from "./box/AppointmentListBox";
import PerformanceBoxForSalesUser from "./box/PerformanceBoxForSalesUser";
import RecentMessagesBox from "./box/RecentMessagesBox";
import TaskListBox from "./box/TaskListBox";

export default function DashboardSales() {
  return (
    <div className="flex h-full flex-col gap-x-2 lg:flex-row lg:items-start xl:gap-x-8">
      {/* col 1 */}
      <div className="flex h-full flex-col justify-around space-y-4 lg:w-[25%]">
        {/* task list */}
        <TaskListBox />
      </div>

      {/* col 2 */}
      <div className="flex h-full flex-col justify-around space-y-4 lg:w-[25%]">
        {/* appointments */}
        <AppointmentListBox />
      </div>
      {/* col 3 */}
      <div className="#order-3 order-first h-full space-y-4 lg:order-none lg:w-[20%]">
        {/* Performance */}
        <PerformanceBoxForSalesUser />
      </div>
      {/* col 4 */}
      <div className="flex h-full flex-col justify-around space-y-4 lg:w-[25%]">
        {/* recent messages */}
        <RecentMessagesBox />
      </div>
    </div>
  );
}
