import { getLastClockInOutForUser } from "@/actions/dashboard/clockIn";
import AppointmentListBox from "./box/AppointmentListBox";
import AttendanceButtonsBox from "./box/AttendanceButtonsBox";
import CurrentProjectsBox from "./box/CurrentProjectsBox";
import MonthlyPayoutBox from "./box/MonthlyPayoutBox";
import PerformanceBoxForTechnician from "./box/PerformanceBoxForTechnician";
import TaskListBox from "./box/TaskListBox";
import RecentMessagesBox from "./box/RecentMessagesBox";

export default async function DashboardTechnician() {
  const currentTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  let lastClockInOut = await getLastClockInOutForUser({
    timezone: currentTimezone,
  });

  return (
    <div className="flex h-full flex-col gap-x-4 gap-y-8 lg:flex-row lg:items-start">
      {/* col 1 */}
      <div className="flex h-full flex-col justify-around space-y-4 lg:w-[30%]">
        {/* Current Projects */}
        <CurrentProjectsBox />
      </div>

      {/* col 2 */}
      <div className="flex h-full flex-col justify-around space-y-4 lg:w-[25%]">
        {/* task list */}
        <TaskListBox />
        {/* appointments */}
        <AppointmentListBox />
      </div>
      {/* col 3 */}
      <div className="order-first h-full space-y-4 lg:order-none lg:w-[45%]">
        {/* attendance buttons */}
        <AttendanceButtonsBox lastClockInOut={lastClockInOut} />

        <div className="#grid #grid-cols-2 flex h-[78%] gap-x-2">
          {/* <!--col 1 --> */}
          <div className="flex h-full w-1/2 flex-col justify-around">
            {/* Performance */}
            <PerformanceBoxForTechnician />
            <MonthlyPayoutBox />
          </div>
          {/* col 2 */}
          <div className="flex h-full w-1/2 flex-col justify-around space-y-3">
            {" "}
            {/* recent messages */}
            <RecentMessagesBox />
          </div>
        </div>
      </div>
    </div>
  );
}
