import { getLastClockInOutForUser } from "@/actions/dashboard/clockIn";
import AppointmentListBox from "./box/AppointmentListBox";
import AttendanceButtonsBox from "./box/AttendanceButtonsBox";
import CurrentProjectsBox from "./box/CurrentProjectsBox";
import MonthlyPayoutBox from "./box/MonthlyPayoutBox";
import PerformanceBoxForTechnician from "./box/PerformanceBoxForTechnician";
import TaskListBox from "./box/TaskListBox";
import RecentMessagesBox from "./box/RecentMessagesBox";
import { getCompanyTimezone } from "@/actions/settings/getCompanyTimezone";
import { cn } from "@/lib/cn"; // Assuming you have cn utility

export default async function DashboardTechnician() {
  const companyTimezone = await getCompanyTimezone();
  const timezone =
    companyTimezone?.timezone ||
    Intl.DateTimeFormat().resolvedOptions().timeZone;

  let lastClockInOut = await getLastClockInOutForUser({
    timezone: timezone,
  });

  return (
    // Outer Container: Use consistent gap and ensure vertical stretching (items-stretch is default in flex)
    <div className="flex w-full min-h-full flex-col gap-4 lg:flex-row lg:items-stretch xl:gap-6 2xl:gap-8">
      {/* Col 1: Projects & Attendance (30%) */}
      <div className="flex w-full flex-col gap-4 lg:w-[30%]">
        {/* attendance buttons mobile */}
        <div className="block lg:hidden">
          <AttendanceButtonsBox lastClockInOut={lastClockInOut} />
        </div>

        {/* Current Projects: Set to flex-1 to fill remaining space */}
        <CurrentProjectsBox className="flex-1" />
      </div>

      {/* Col 2: Task & Appointments (25%) */}
      {/* Ensure both lists stretch equally using flex-1 */}
      <div className="flex w-full flex-col gap-4 lg:w-[25%]">
        {/* task list: Use flex-1 to stretch vertically */}
        <div className="order-2 flex-1 lg:order-none">
          <TaskListBox className="flex-1" />
        </div>

        {/* appointments: Use flex-1 to stretch vertically */}
        <div className="order-1 flex-1 lg:order-none">
          <AppointmentListBox className="flex-1" />
        </div>
      </div>

      {/* Col 3: Attendance, Performance, Payout, Messages (45%) */}
      <div className="flex w-full flex-col gap-4 lg:w-[45%]">
        {/* attendance buttons desktop */}
        <div className="hidden lg:block flex-shrink-0">
          <AttendanceButtonsBox lastClockInOut={lastClockInOut} />
        </div>

        {/* Inner Grid/Layout for Performance/Payout/Messages */}
        <div className="flex flex-1 flex-col gap-4 lg:flex-row">
          {/* Inner Col 1: Performance & Payout (50%) */}
          <div className="order-2 flex w-full flex-col gap-4 lg:order-none lg:w-1/2">
            <PerformanceBoxForTechnician />
            <MonthlyPayoutBox />
          </div>

          {/* Inner Col 2: Recent Messages (50%) */}
          {/* This list must stretch to fill the height beside Performance/Payout */}
          <div className="order-1 flex w-full flex-col gap-4 lg:order-none lg:w-1/2">
            <RecentMessagesBox className="flex-1" /> {/* ADDED flex-1 */}
          </div>
        </div>
      </div>
    </div>
  );
}
