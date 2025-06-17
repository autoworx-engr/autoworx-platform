"use client";
import { usePopupStore } from "@/stores/popup";
import { ClockBreak, ClockInOut, Task as TaskType, User } from "@prisma/client";
import { FaExternalLinkAlt } from "react-icons/fa";

import { stopBreak, takeBreak } from "@/actions/dashboard/break";
import { clockIn } from "@/actions/dashboard/clockIn";
import { clockOut } from "@/actions/dashboard/clockOut";
import { getTechnicianInfo } from "@/actions/dashboard/data/getTechnicianInfo";
// import { useAutoRefreshRoute } from "@/hooks/useAutoRefreshRoute.ts";
import { useServerGet } from "@/hooks/useServerGet";
import { successToast } from "@/lib/toast";
import moment from "moment-timezone";
import Link from "next/link";
import { useCallback } from "react";
import Appointments from "./Appointments";
import ChartData from "./ChartData";
import CurrentProjects from "./CurrentProjects";
import RecentMessages from "./RecentMessages";
import Tasks from "./Tasks";
import { useCompanyTimezone } from "@/hooks/useCompanyTimezone";

export function formatDateToCustomString(date: Date) {
  const options = {
    hour: "numeric",
    minute: "numeric",
    hour12: true,
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  //@ts-ignore
  return moment(date).utc().toDate().toLocaleString("en-US", options);
}
export function formatToTimeString(date: Date) {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const amPm = hours >= 12 ? "PM" : "AM";

  // Convert 24-hour format to 12-hour format
  hours = hours % 12 || 12;

  // Format minutes with leading zero if needed
  const formattedMinutes = minutes < 10 ? "0" + minutes : minutes;

  return `${hours.toString().padStart(2, "0")}:${formattedMinutes} ${amPm}`;
}
const DashboardTechnician = ({
  refreshTime,
  tasks = [],
  companyUsers = [],
  appointments = [],
  lastClockInOut,
}: {
  refreshTime: number;
  tasks: TaskType[];
  companyUsers: User[];
  appointments: any;
  lastClockInOut: (ClockInOut & { ClockBreak: ClockBreak[] }) | null;
}) => {
  const { open } = usePopupStore();
  const timezone = useCompanyTimezone();

  const { data: dashboardInfo } = useServerGet(getTechnicianInfo, timezone);

  const hasClockedInToday = lastClockInOut
    ? moment
        .tz(
          lastClockInOut.clockIn,
          lastClockInOut?.timezone ?? moment.tz.guess(),
        )
        .isSame(new Date(), "day")
    : false;
  const hasClockedOutToday = lastClockInOut
    ? lastClockInOut.clockOut &&
      moment
        .tz(
          lastClockInOut.clockOut,
          lastClockInOut?.timezone ?? moment.tz.guess(),
        )
        .isSame(new Date(), "day")
    : false;
  // const { data: messages } = useServerGet(fetchRecentMessages);

  // useAutoRefreshRoute(refreshTime);

  const validBreak = useCallback(
    function (lastClockInOut: ClockInOut & { ClockBreak: ClockBreak[] }) {
      return (
        lastClockInOut &&
        lastClockInOut.ClockBreak?.length > 0 &&
        lastClockInOut.ClockBreak[lastClockInOut.ClockBreak.length - 1] &&
        lastClockInOut?.ClockBreak[lastClockInOut?.ClockBreak?.length - 1].id
      );
    },
    [lastClockInOut],
  );

  return (
    <div className="flex h-full flex-col gap-x-4 gap-y-8 lg:flex-row lg:items-start">
      {/* col 1 */}
      <div className="flex h-full flex-col justify-around space-y-4 lg:w-[30%]">
        {/* Current Projects */}
        <CurrentProjects projects={dashboardInfo?.currentProjects || []} />
      </div>

      {/* col 2 */}
      <div className="flex h-full flex-col justify-around space-y-4 lg:w-[25%]">
        {/* task list */}
        <Tasks tasks={tasks} companyUsers={companyUsers} />
        {/* appointments */}
        <Appointments appointments={appointments} />
      </div>
      {/* col 3 */}
      <div className="order-first h-full space-y-4 lg:order-none lg:w-[45%]">
        {/* attendance buttons */}
        <div className="flex h-[20%] justify-between gap-x-2 rounded-md p-4 shadow-lg xl:p-8">
          <div>
            <button
              onClick={async () => {
                if (!lastClockInOut || lastClockInOut?.clockOut) {
                  const res = await clockIn({
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                  });
                  if (res.success) {
                    successToast("Clocked In Successfully");
                  }
                }
              }}
              className={`h-full rounded ${
                hasClockedInToday
                  ? "cursor-not-allowed bg-gray-400"
                  : !lastClockInOut?.clockOut && lastClockInOut?.clockIn
                    ? "bg-[#03A7A2]"
                    : "bg-[#6571FF]"
              } ${!lastClockInOut?.clockOut && lastClockInOut?.clockIn ? "bg-[#03A7A2]" : "bg-[#6571FF]"} ${!lastClockInOut || lastClockInOut?.clockOut ? "cursor-pointer" : "cursor-default"} px-4 py-4 text-white xl:px-10`}
              disabled={hasClockedInToday}
              title={
                hasClockedInToday ? "You have already clocked in today" : ""
              }
            >
              <span className="font-semibold xl:text-xl">
                {!lastClockInOut?.clockOut && lastClockInOut?.clockIn
                  ? "Clocked-In"
                  : "Clock-In"}
              </span>
              <br />
              {lastClockInOut?.clockIn && !lastClockInOut?.clockOut && (
                <span className="text-xs">
                  {formatDateToCustomString(new Date(lastClockInOut?.clockIn))}
                </span>
              )}
            </button>
          </div>
          <div>
            <button
              onClick={async () => {
                if (lastClockInOut && !lastClockInOut?.clockOut) {
                  const res = await clockOut({
                    clockInOutId: lastClockInOut.id,
                  });
                  if (res.success) {
                    successToast("Clocked Out Successfully");
                  }
                }
              }}
              className={`h-full rounded ${
                hasClockedOutToday
                  ? "cursor-not-allowed bg-gray-400"
                  : "bg-[#6571FF]"
              } bg-[#6571FF] px-4 py-4 text-xl font-semibold text-white xl:px-10 ${lastClockInOut && lastClockInOut?.clockIn && !lastClockInOut?.clockOut ? "cursor-pointer" : "cursor-default"}`}
              disabled={hasClockedOutToday ?? false}
              title={
                hasClockedOutToday ? "You have already clocked out today" : ""
              }
            >
              <span className="font-semibold xl:text-xl">Clock-Out</span>
              <br />
              {/* <span className="text-xs">10:00 AM</span> */}
            </button>
          </div>
          <div>
            {lastClockInOut &&
            lastClockInOut?.ClockBreak[lastClockInOut?.ClockBreak?.length - 1]
              ?.breakEnd === null ? (
              <button
                onClick={async () => {
                  if (lastClockInOut && validBreak(lastClockInOut)) {
                    const res = await stopBreak({
                      clockBreakId:
                        lastClockInOut.ClockBreak[
                          lastClockInOut.ClockBreak.length - 1
                        ].id,
                    });
                    if (res.success) {
                      successToast("Break Ended");
                    }
                  }
                }}
                className={`h-full rounded bg-[#03A7A2] px-4 py-4 font-semibold text-white xl:px-10 xl:text-xl`}
              >
                End Break
              </button>
            ) : (
              <button
                onClick={async () => {
                  if (lastClockInOut && !lastClockInOut?.clockOut) {
                    const res = await takeBreak({
                      clockInOutId: lastClockInOut.id,
                    });
                    if (res?.success) {
                      successToast("Break Started");
                    }
                  }
                }}
                className={`h-full rounded bg-[#6571FF] px-4 py-4 font-semibold text-white xl:px-10 xl:text-xl ${lastClockInOut && !lastClockInOut?.clockOut ? "cursor-pointer" : "cursor-default"}`}
              >
                <span>Break</span> <br />
                <div className="mt-1 flex flex-col">
                  {!lastClockInOut?.clockOut &&
                    lastClockInOut?.ClockBreak.slice(-3).map((Break, ind) => {
                      return (
                        <span
                          key={ind}
                          className="text-[10px] font-light leading-[1.3]"
                        >
                          {formatToTimeString(Break.breakStart)} -{" "}
                          {Break?.breakEnd &&
                            formatToTimeString(Break?.breakEnd)}
                        </span>
                      );
                    })}
                </div>
              </button>
            )}
          </div>
        </div>

        <div className="#grid #grid-cols-2 flex h-[78%] gap-x-2">
          {/* <!--col 1 --> */}
          <div className="flex h-full w-1/2 flex-col justify-around">
            {/* Performance */}
            <div className="flex-1 rounded-md p-4 shadow-lg 2xl:px-6">
              <div className="mb-8 flex items-center justify-between">
                <span className="text-xl font-bold">Performance</span>{" "}
                <Link href="dashboard/reporting/technicianreporting">
                  <span>
                    <FaExternalLinkAlt />
                  </span>
                </Link>
              </div>
              <div className="space-y-3">
                <ChartData
                  heading="Total Jobs"
                  number={dashboardInfo?.performance?.totalJobs?.count || 0}
                  isPositive={
                    dashboardInfo?.performance?.totalJobs?.growth?.isPositive ||
                    false
                  }
                  rate={
                    dashboardInfo?.performance?.totalJobs?.growth?.rate || 0
                  }
                />
                <ChartData
                  heading="On-time Completion Rate"
                  number={
                    dashboardInfo?.performance?.onTimeCompletionRate?.rate || 0
                  }
                  isPositive={
                    dashboardInfo?.performance?.onTimeCompletionRate?.growth
                      ?.isPositive || false
                  }
                  rate={
                    dashboardInfo?.performance?.onTimeCompletionRate?.growth
                      ?.rate || 0
                  }
                  isNumberPercent
                />
                <ChartData
                  heading="Jobs Return Rate"
                  number={dashboardInfo?.performance?.redoJobs?.count || 0}
                  isPositive={
                    dashboardInfo?.performance?.redoJobs?.growth?.isPositive ||
                    false
                  }
                  rate={dashboardInfo?.performance?.redoJobs?.growth?.rate || 0}
                  isNumberPercent
                />
              </div>
            </div>
            <div className="flex-1 rounded-md p-4 shadow-lg xl:p-6">
              <div className="mb-8 flex items-center justify-between">
                <span className="text-xl font-bold">Monthly Payout</span>{" "}
                <Link href="/dashboard/reporting/workforce">
                  <FaExternalLinkAlt />
                </Link>
              </div>
              <div className="space-y-3">
                <ChartData
                  heading="Total Payout"
                  number={dashboardInfo?.monthlyPayout?.totalPayout || 0}
                  isPositive={
                    dashboardInfo?.monthlyPayout?.growth?.isPositive || false
                  }
                  rate={dashboardInfo?.monthlyPayout?.growth?.rate || 0}
                />
                <ChartData
                  heading="Expected Payout"
                  number={dashboardInfo?.monthlyPayout?.pendingPayout || 0}
                  noRate
                />
              </div>
            </div>
          </div>
          {/* col 2 */}
          <div className="flex h-full w-1/2 flex-col justify-around space-y-3">
            {" "}
            {/* recent messages */}
            <RecentMessages />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardTechnician;
