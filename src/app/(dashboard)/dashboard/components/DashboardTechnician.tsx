import { getLastClockInOutForUser } from "@/actions/dashboard/clockIn";
import AppointmentListBox from "./box/AppointmentListBox";
import AttendanceButtonsBox from "./box/AttendanceButtonsBox";
import CurrentProjectsBox from "./box/CurrentProjectsBox";
import MonthlyPayoutBox from "./box/MonthlyPayoutBox";
import PerformanceBoxForTechnician from "./box/PerformanceBoxForTechnician";
import TaskListBox from "./box/TaskListBox";
import RecentMessagesBox from "./box/RecentMessagesBox";
import { getCompanyTimezone } from "@/actions/settings/getCompanyTimezone";

export default async function DashboardTechnician() {
  const companyTimezone = await getCompanyTimezone();
  const timezone =
    companyTimezone?.timezone ||
    Intl.DateTimeFormat().resolvedOptions().timeZone;

  let lastClockInOut = await getLastClockInOutForUser({
    timezone: timezone,
  });

  return (
    <div className="flex h-full flex-col gap-x-4 gap-y-8 lg:flex-row lg:items-start">
      {/* col 1 */}
      <div className="flex h-full flex-col justify-around space-y-4 lg:w-[30%]">
        {/* attendance buttons mobile */}
        <div className="block lg:hidden">
          <AttendanceButtonsBox lastClockInOut={lastClockInOut} />
        </div>
        {/* Current Projects */}
        <CurrentProjectsBox />
      </div>

      {/* col 2 */}
      <div className="flex h-full flex-col justify-around space-y-4 lg:w-[25%]">
        {/* task list */}
        <div className="order-2 flex-1 lg:order-none">
          <TaskListBox />
        </div>
        {/* appointments */}
        <div className="order-1 flex-1 lg:order-none">
          <AppointmentListBox />
        </div>
      </div>
      {/* col 3 */}
      <div className=" h-full space-y-4 lg:order-none lg:w-[45%]">
        {/* attendance buttons desktop */}
        <div className="hidden lg:block">
          <AttendanceButtonsBox lastClockInOut={lastClockInOut} />
        </div>

        <div className="#grid #grid-cols-2 flex flex-col lg:flex-row h-[86%] gap-x-2">
          {/* <!--col 1 --> */}
          <div className="order-2 lg:order-none flex h-full w-full lg:w-1/2 flex-col justify-around">
            {/* Performance */}
            <PerformanceBoxForTechnician />
            <MonthlyPayoutBox />
          </div>
          {/* col 2 */}
          <div className="order-1 lg:order-none flex h-full w-full lg:w-1/2 flex-col justify-around space-y-3">
            {" "}
            {/* recent messages */}
            <RecentMessagesBox />
          </div>
        </div>
      </div>
    </div>
  );
}
