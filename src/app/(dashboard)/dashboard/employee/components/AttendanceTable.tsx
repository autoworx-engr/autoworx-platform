"use client";
import { CiCircleInfo } from "react-icons/ci";
import { IoMdArrowDropdown, IoMdArrowDropup } from "react-icons/io";
// @ts-ignore
import { getAttendanceInfo } from "@/actions/employee/getAttendanceInfo";
import DateRange from "@/app/(dashboard)/dashboard/payments/components/PaymentDateRange";
import { useServerGet } from "@/hooks/useServerGet";
import {
  convertDuration,
  convertMinutesToHours,
  getTotalBreaksValue,
} from "@/lib/convertDurations";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useCompanyTimezone } from "@/hooks/useCompanyTimezone";
import moment from "moment-timezone";

interface AttendanceData {
  clockedIn: string;
  clockedOut: string;
  hours: string;
}

interface MetricData {
  label: string;
  value: string;
  percentage: string | number;
  isPositive: boolean;
}

interface buttonInfo {
  metricLabel: string;
  content: string;
}

const daysOfWeek = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

//hardcoded data for button info
const infoData: buttonInfo[] = [
  { metricLabel: "Absenteeism", content: "Number of Days Absent" },
  { metricLabel: "Tardiness", content: "Delivered Time - Due Time" },
  {
    metricLabel: "No Show",
    content: "(Total Days Absent/Total Hours Clocked -in) x 100%",
  },
  { metricLabel: "Overtime", content: "Extra Hours Clocked-in" },
  { metricLabel: "Total Hours", content: "Total Hours worked" },
  { metricLabel: "Total Days", content: "Total Days worked" },
];

// Generate an array of dates for the current week
const generateWeekDates = (startDate = new Date()) => {
  const dates = [];
  const start = new Date(startDate);
  start.setDate(start.getDate() - start.getDay()); // Adjust to start of week (Sunday)

  for (let NoOfDays = 0; NoOfDays < 7; NoOfDays++) {
    const date = new Date(start);
    date.setDate(date.getDate() + NoOfDays);
    dates.push(date);
  }
  return dates;
};

const Dashboard = () => {
  const timezone = useCompanyTimezone();
  const [infoIndex, setInfoIndex] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<string>(
    moment.tz(timezone).startOf("week").format("YYYY-MM-DD"),
  );
  const [endDate, setEndDate] = useState<string>(
    moment.tz(timezone).endOf("week").format("YYYY-MM-DD"),
  );

  const params = useParams();
  const employeeId = Number(params?.id);

  // Modified to include startDate and endDate parameters
  const { data: attendanceInfo } = useServerGet(
    getAttendanceInfo,
    employeeId,
    startDate,
    endDate,
  );

  const getInfoContent = (label: string): string | undefined => {
    const info = infoData.find((info) => info.metricLabel === label);
    return info?.content;
  };

  const metricData: MetricData[] = [
    {
      label: "Absenteeism",
      value: `${attendanceInfo?.absentDays || 0} Days`,
      percentage: attendanceInfo?.growthRateAbsentDays?.rate || "0%",
      isPositive: attendanceInfo?.growthRateAbsentDays?.isPositive || false,
    },
    {
      label: "Total Hours",
      value: `${convertMinutesToHours(isNaN(Number(attendanceInfo?.totalHoursWorked)) ? 0 : Number(attendanceInfo?.totalHoursWorked))} Hours`,
      percentage: attendanceInfo?.growthRateTotalHoursWorked?.rate || "0%",
      isPositive:
        attendanceInfo?.growthRateTotalHoursWorked?.isPositive || false,
    },
    {
      label: "Total Days",
      value: `${attendanceInfo?.totalDaysWorked || 0} Days`,
      percentage: attendanceInfo?.growthRateTotalDaysWorked?.rate || "0%",
      isPositive:
        attendanceInfo?.growthRateTotalDaysWorked?.isPositive || false,
    },
  ];

  return (
    <div className="my-4 box-border flex flex-col lg:w-1/2">
      <h2 className="mb-2 text-xl font-bold">Attendance</h2>
      <div className="relative flex h-auto w-full flex-col gap-8 rounded border bg-background p-1 lg:p-6">
        <div className="left-3 top-3 w-fit">
          <DateRange
            onOk={(start: any, end: any) => {
              let startDateObj;
              let endDateObj;

              // Process start date
              if (start && typeof start === "object") {
                // Check if it's a Date object
                if (start instanceof Date) {
                  startDateObj = start;
                } else if (typeof start.toDate === "function") {
                  startDateObj = start.toDate();
                }
                // Try to parse it as a date string
                else if (typeof start.toString === "function") {
                  startDateObj = new Date(start.toString());
                }
              }

              // Process end date
              if (end && typeof end === "object") {
                // Check if it's a Date object
                if (end instanceof Date) {
                  endDateObj = end;
                } else if (typeof end.toDate === "function") {
                  endDateObj = end.toDate();
                }
                // Try to parse it as a date string
                else if (typeof end.toString === "function") {
                  endDateObj = new Date(end.toString());
                }
              }

              // Default to current week if we couldn't parse
              if (!startDateObj || isNaN(startDateObj.getTime())) {
                startDateObj = moment().startOf("week").toDate();
              }

              if (!endDateObj || isNaN(endDateObj.getTime())) {
                endDateObj = moment().endOf("week").toDate();
              }

              // Convert dates to ISO format strings for the server action
              const formattedStartDate =
                moment(startDateObj).format("YYYY-MM-DD");
              const formattedEndDate = moment(endDateObj).format("YYYY-MM-DD");

              // Update state with the new dates
              setStartDate(formattedStartDate);
              setEndDate(formattedEndDate);
            }}
            onCancel={() => {
              // Reset to current week
              const currentWeekStart = moment().startOf("week");
              const currentWeekEnd = moment().endOf("week");

              setStartDate(currentWeekStart.format("YYYY-MM-DD"));
              setEndDate(currentWeekEnd.format("YYYY-MM-DD"));
            }}
          />
        </div>

        <div className="">
          {/* Attendance Table */}
          <div className="min-w-[60%] flex-col gap-4 lg:flex">
            <div className="max-h-[400px] overflow-y-auto">
              <div className="h-full w-full rounded border">
                <table className="h-full w-full bg-background text-center text-sm lg:text-base">
                  <thead>
                    <tr className="border-b">
                      <th className="bg-background px-4 py-2"></th>
                      <th className="px-4 py-2">Time Clocked In</th>
                      <th className="px-4 py-2">Time Clocked Out</th>
                      <th className="hidden justify-center px-4 py-2 lg:flex">
                        Break
                      </th>
                      <th className="px-4 py-2">Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceInfo?.attInfo?.map((data, index) => {
                      const dayOfWeek = moment.utc(data.date).day(); // Correct
                      const dayAbbr = daysOfWeek[dayOfWeek];
                      const dayDate = moment.utc(data.date).date();

                      const effectiveHours = isNaN(Number(data.hours))
                        ? data.hours
                        : convertDuration(
                            Number(data.hours) - Number(data.totalBreaks),
                          );

                      return (
                        <tr
                          key={index}
                          className={
                            index % 2 === 0
                              ? "border-b bg-blue-100"
                              : "border-b"
                          }
                        >
                          <td className="bg-background px-2 py-2 sm:px-4">
                            {dayAbbr}-{dayDate}
                          </td>
                          <td className="px-2 py-2 sm:px-4">
                            {typeof data.clockedIn === "string"
                              ? data.clockedIn
                              : moment
                                  .utc(data.clockedIn)
                                  .tz(timezone)
                                  .format("hh:mm A")}
                          </td>
                          <td className="px-2 py-2 sm:px-4">
                            {typeof data.clockedOut === "string"
                              ? data.clockedOut
                              : moment
                                  .utc(data.clockedOut)
                                  .tz(timezone)
                                  .format("hh:mm A")}
                          </td>
                          <td className="hidden justify-center px-2 py-2 sm:px-4 lg:flex">
                            {getTotalBreaksValue(data.totalBreaks)}
                          </td>
                          <td className="px-2 py-2 lg:px-4">
                            {effectiveHours}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Metrics Section */}
          <div className="mt-10 grid w-full grid-cols-1 gap-4 lg:grid-cols-2">
            {metricData.map((metric, index) => (
              <div
                key={index}
                className="relative flex items-center justify-center gap-4 rounded-lg border border-gray-300 bg-background p-4"
              >
                <div className="absolute left-1 top-1">
                  <div
                    onMouseEnter={() => setInfoIndex(index)}
                    onMouseLeave={() => setInfoIndex(null)}
                  >
                    <CiCircleInfo className="h-3 w-3 cursor-pointer" />
                  </div>
                  {infoIndex === index && (
                    <div
                      style={{ backgroundColor: "rgba(102, 115, 140, 0.9)" }}
                      className="absolute left-5 top-0 z-10 flex h-auto min-h-[60px] w-[200px] items-center justify-center rounded-lg p-2 text-sm text-white"
                    >
                      {getInfoContent(metric.label)}
                    </div>
                  )}
                </div>
                <div className="w-[70%] text-base font-bold text-gray-700">
                  {metric.label}
                </div>
                <div className="w-[60%] text-lg font-semibold text-gray-800">
                  {metric.value}
                </div>
                <div
                  className={`flex items-center gap-1 text-sm font-medium ${metric.isPositive ? "text-green-500" : "text-red-500"}`}
                >
                  <div>
                    {metric.isPositive ? (
                      <IoMdArrowDropup />
                    ) : (
                      <IoMdArrowDropdown />
                    )}
                  </div>
                  <div className="text-nowrap">{metric.percentage}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
