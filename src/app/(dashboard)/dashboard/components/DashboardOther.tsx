import { getLastClockInOutForUser } from "@/actions/dashboard/clockIn";
// import { useAutoRefreshRoute } from "@/hooks/useAutoRefreshRoute.ts";
import AppointmentListBox from "./box/AppointmentListBox";
import AttendanceButtonsBox from "./box/AttendanceButtonsBox";
import RecentMessagesBox from "./box/RecentMessagesBox";
import { getCompanyTimezone } from "@/actions/settings/getCompanyTimezone";

export default async function DashboardOther() {
  const companyTimezone = await getCompanyTimezone();
  const timezone = companyTimezone?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

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
      <div className="flex h-full flex-col justify-around space-y-4 lg:w-[30%]">
        {/* appointments */}
        <AppointmentListBox />
        {/* task list */}
        <AppointmentListBox />
      </div>
      {/* col 3 */}
      <div className="#justify-around order-first flex h-full flex-col space-y-4 lg:order-none lg:w-[40%]">
        {/* attendance buttons */}
        <AttendanceButtonsBox lastClockInOut={lastClockInOut} />
      </div>
    </div>
  );
}
