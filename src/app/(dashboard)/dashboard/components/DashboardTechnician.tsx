import { getLastClockInOutForUser } from "@/actions/dashboard/clockIn";
import { getCompanyTimezone } from "@/actions/settings/getCompanyTimezone";
import AppointmentListBox from "./box/AppointmentListBox";
import AttendanceButtonsBox from "./box/AttendanceButtonsBox";
import CurrentProjectsBox from "./box/CurrentProjectsBox";
import MonthlyPayoutBox from "./box/MonthlyPayoutBox";
import PerformanceBoxForTechnician from "./box/PerformanceBoxForTechnician";
import RecentMessagesBox from "./box/RecentMessagesBox";
import TaskListBox from "./box/TaskListBox";

export default async function DashboardTechnician() {
  const companyTimezone = await getCompanyTimezone();
  const timezone =
    companyTimezone?.timezone ||
    Intl.DateTimeFormat().resolvedOptions().timeZone;

  let lastClockInOut = await getLastClockInOutForUser({
    timezone: timezone,
  });

  return (
    <div className="flex w-full flex-col gap-4 lg:h-full lg:flex-row lg:items-stretch xl:gap-6 2xl:gap-8">
      {/* Col 1: Projects & Attendance (30%) */}
      <div className="flex w-full flex-col gap-4 lg:w-[30%] xl:gap-6 2xl:gap-8">
        {/* attendance buttons mobile */}
        <div className="block lg:hidden">
          <AttendanceButtonsBox lastClockInOut={lastClockInOut} />
        </div>

        {/* Current Projects: Set to flex-1 to fill remaining space */}
        <CurrentProjectsBox />
      </div>

      {/* Col 2: Task & Appointments (25%) */}
      <div className="flex w-full flex-col gap-4 lg:h-full lg:min-h-0 lg:w-[25%] lg:flex-1 xl:gap-6 2xl:gap-8">
        <div className="order-2 lg:order-none lg:min-h-0 lg:flex-1">
          <TaskListBox />
        </div>

        <div className="order-1 lg:order-none lg:min-h-0 lg:flex-1">
          <AppointmentListBox />
        </div>
      </div>

      {/* Col 3: Attendance, Performance, Payout, Messages (45%) */}
      <div className="flex w-full flex-col gap-4 lg:h-full lg:min-h-0 lg:w-[45%] xl:gap-6 2xl:gap-8">
        {/* attendance buttons desktop */}
        <div className="hidden lg:block flex-shrink-0">
          <AttendanceButtonsBox lastClockInOut={lastClockInOut} />
        </div>

        {/* Inner Grid/Layout for Performance/Payout/Messages */}
        <div className="flex flex-col gap-4 lg:min-h-0 lg:flex-1 lg:flex-row lg:overflow-y-auto xl:gap-6 2xl:gap-8">
          {/* Inner Col 1: Performance & Payout (50%) */}

          <div className="flex w-full flex-col gap-4 lg:min-h-0 lg:w-[27%] lg:flex-1 xl:gap-6 2xl:gap-8">
            <div className="lg:min-h-0 lg:flex-1">
              <PerformanceBoxForTechnician />
            </div>
            <div className="lg:min-h-0 lg:flex-1">
              <MonthlyPayoutBox />
            </div>
          </div>
          {/* Inner Col 2: Recent Messages (50%) */}
          {/* This list must stretch to fill the height beside Performance/Payout */}
          <div className="flex w-full flex-col gap-4 lg:min-h-0 lg:w-[27%] lg:flex-1 xl:gap-6 2xl:gap-8">
            <RecentMessagesBox />
          </div>
        </div>
      </div>
    </div>
  );
}
