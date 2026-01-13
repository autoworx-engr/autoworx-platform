"use client";
// @ts-ignore
import { getAttendanceInfo } from "@/actions/employee/getAttendanceInfo";
import DateRange from "@/app/(dashboard)/dashboard/payments/components/PaymentDateRange";
import AttendanceTableSkeleton from "@/components/ui/AttendanceTableSkeleton";
import { useCompanyTimezone } from "@/hooks/useCompanyTimezone";
import { useServerGet } from "@/hooks/useServerGet";
import { convertDuration } from "@/lib/convertDurations";
import moment from "moment-timezone";
import { useEffect, useState } from "react";

const daysOfWeek = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

const TechnicianAttendance = ({ currentUserId }: { currentUserId: string }) => {
  const timezone = useCompanyTimezone();
  const [refetch, setRefetch] = useState(0);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Initialize date range when timezone is loaded
  useEffect(() => {
    if (timezone && (!startDate || !endDate)) {
      const weekStart = moment.tz(timezone).startOf("week");
      const weekEnd = moment.tz(timezone).endOf("week");
      setStartDate(weekStart.format("YYYY-MM-DD"));
      setEndDate(weekEnd.format("YYYY-MM-DD"));
    }
  }, [timezone, startDate, endDate]);

  // Only fetch when both dates are available
  const { data: attendanceInfo } = useServerGet(
    getAttendanceInfo,
    Number(currentUserId),
    startDate || undefined,
    endDate || undefined,
    refetch
  );
  console.log("🚀 ~ TechnicianAttendance ~ attendanceInfo:", attendanceInfo);

  return (
    <div className="my-4 box-border flex flex-col lg:w-full z-10">
      <h2 className="mb-2 text-xl font-bold">Attendance</h2>
      <div className="relative flex h-auto w-full flex-col gap-8 rounded border bg-background p-1 lg:p-6">
        <div className="left-3 top-3 w-fit">
          <DateRange
            onOk={(start: any, end: any) => {
              let startDateObj: Date;
              let endDateObj: Date;

              // Process start date
              if (start instanceof Date) {
                startDateObj = start;
              } else if (
                start &&
                typeof start === "object" &&
                typeof start.toDate === "function"
              ) {
                startDateObj = start.toDate();
              } else if (start && typeof start.toString === "function") {
                startDateObj = new Date(start.toString());
              } else {
                startDateObj = moment.tz(timezone).startOf("week").toDate();
              }

              // Process end date
              if (end instanceof Date) {
                endDateObj = end;
              } else if (
                end &&
                typeof end === "object" &&
                typeof end.toDate === "function"
              ) {
                endDateObj = end.toDate();
              } else if (end && typeof end.toString === "function") {
                endDateObj = new Date(end.toString());
              } else {
                endDateObj = moment.tz(timezone).endOf("week").toDate();
              }

              // Validate the parsed dates
              if (isNaN(startDateObj.getTime())) {
                startDateObj = moment.tz(timezone).startOf("week").toDate();
              }

              if (isNaN(endDateObj.getTime())) {
                endDateObj = moment.tz(timezone).endOf("week").toDate();
              }

              // Format as YYYY-MM-DD which will be interpreted by the server in company timezone
              const formattedStartDate =
                moment(startDateObj).format("YYYY-MM-DD");
              const formattedEndDate = moment(endDateObj).format("YYYY-MM-DD");

              // Update state with the new dates
              setStartDate(formattedStartDate);
              setEndDate(formattedEndDate);
            }}
            onCancel={() => {
              // Reset to current week
              if (timezone) {
                const currentWeekStart = moment.tz(timezone).startOf("week");
                const currentWeekEnd = moment.tz(timezone).endOf("week");

                setStartDate(currentWeekStart.format("YYYY-MM-DD"));
                setEndDate(currentWeekEnd.format("YYYY-MM-DD"));
              }
            }}
          />
        </div>

        <div className="">
          {/* Show loading state when dates are not initialized or data is not available */}
          {!startDate || !endDate || !attendanceInfo ? (
            // <div className="flex h-40 items-center justify-center">
            //   <div className="text-gray-500">Loading attendance data...</div>
            // </div>

            <AttendanceTableSkeleton rows={7} />
          ) : (
            <>
              {/* Attendance Table */}
              <div className="min-w-[60%] flex-col gap-4 lg:flex">
                <div className="h-full w-full rounded border">
                  <table className="h-full w-full bg-background text-center text-sm lg:text-base">
                    <thead>
                      <tr className="border-b">
                        <th className="bg-background px-4 py-2">Date</th>
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
                        // Parse the date in the company timezone
                        let dateMoment;
                        if (typeof data.date === "string") {
                          // If string, parse it as-is in the company timezone
                          dateMoment = moment.tz(data.date, timezone);
                        } else {
                          // If Date object, extract just the date portion to avoid timezone shifts
                          // The server sends dates as UTC midnight, so we parse as UTC and extract the date
                          // const utcDate = moment.utc(data.date);
                          // dateMoment = moment.tz(
                          //   {
                          //     year: utcDate.year(),
                          //     month: utcDate.month(),
                          //     date: utcDate.date(),
                          //   },
                          //   timezone
                          // );
                          // FIX: Parse as-is without shifting time
                          // The 'true' parameter keeps the same date values when converting timezone
                          dateMoment = moment(data.date).tz(timezone, true);
                        }

                        const dayOfWeek = dateMoment.day();
                        const dayAbbr = daysOfWeek[dayOfWeek];
                        const dayDate = dateMoment.date();

                        const effectiveHours = isNaN(Number(data.hours))
                          ? data.hours
                          : convertDuration(
                              Math.max(
                                0,
                                Number(data.hours) - Number(data.totalBreaks)
                              )
                            );

                        const totalBreaks = isNaN(Number(data.totalBreaks))
                          ? data.totalBreaks
                          : convertDuration(Number(data.totalBreaks));

                        return (
                          <tr
                            key={index}
                            className={
                              index % 2 === 0
                                ? "border-b bg-blue-100"
                                : "border-b"
                            }
                          >
                            <td className="bg-background px-2 py-2 sm:px-4 font-medium">
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
                              {typeof data?.clockedOut === "string"
                                ? data?.clockedOut
                                : moment
                                    .utc(data?.clockedOut)
                                    .tz(timezone)
                                    .format("hh:mm A")}
                            </td>
                            <td className="hidden justify-center px-2 py-2 sm:px-4 lg:flex">
                              {/* {data.totalBreaks } */}
                              {/* convert duration */}
                              {totalBreaks}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TechnicianAttendance;
