import { getLastClockInOutForUser } from "@/actions/dashboard/clockIn";
// import { useAutoRefreshRoute } from "@/hooks/useAutoRefreshRoute.ts";
import AppointmentListBox from "./box/AppointmentListBox";
import AttendanceButtonsBox from "./box/AttendanceButtonsBox";
import RecentMessagesBox from "./box/RecentMessagesBox";
import { getCompanyTimezone } from "@/actions/settings/getCompanyTimezone";
import TaskListBox from "./box/TaskListBox";

export default async function DashboardOther() {
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
        {/* recent messages */}
        <RecentMessagesBox />
      </div>

      {/* col 2 */}
      <div className="flex h-full w-full flex-1 flex-col gap-4 lg:w-[25%] min-h-0">
        <div className="order-2 flex-1 min-h-0 lg:order-none">
          <TaskListBox />
        </div>

        <div className="order-1 flex-1 min-h-0 lg:order-none">
          <AppointmentListBox />
        </div>
      </div>
      {/* col 3 */}
      <div className="#justify-around order-first flex h-full flex-col space-y-4 lg:order-none lg:w-[40%]">
        {/* attendance buttons */}
        <AttendanceButtonsBox lastClockInOut={lastClockInOut} />
      </div>
    </div>
  );
}
