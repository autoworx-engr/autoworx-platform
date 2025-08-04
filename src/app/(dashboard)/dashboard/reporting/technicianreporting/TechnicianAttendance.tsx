"use client";
// @ts-ignore
import { getAttendanceInfo } from "@/actions/employee/getAttendanceInfo";
import DateRange from "@/app/(dashboard)/dashboard/payments/components/PaymentDateRange";
import { useServerGet } from "@/hooks/useServerGet";
import { convertDuration } from "@/lib/convertDurations";
import moment from "moment";
import { useState } from "react";

const daysOfWeek = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

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

const TechnicianAttendance = ({ currentUserId }: { currentUserId: string }) => {
  const [weekDates, setWeekDates] = useState(generateWeekDates());

  const { data: attendanceInfo } = useServerGet(
    getAttendanceInfo,
    Number(currentUserId),
  );

  return (
    <div className="my-4 box-border flex flex-col lg:w-full">
      <h2 className="mb-2 text-xl font-bold">Attendance</h2>
      <div className="relative flex h-auto w-full flex-col gap-8 rounded border bg-background p-1 lg:p-6">
        <div className="left-3 top-3 w-fit">
          <DateRange
            onOk={(start: any, end: any) => {
              let startDate;
              if (start && typeof start === "object") {
                // Check if it's a Date object
                if (start instanceof Date) {
                  startDate = start;
                } else if (typeof start.toDate === "function") {
                  startDate = start.toDate();
                }
                // Try to parse it as a date string
                else if (typeof start.toString === "function") {
                  startDate = new Date(start.toString());
                }
              }
              // Default to current date if we couldn't parse
              if (!startDate || isNaN(startDate.getTime())) {
                startDate = new Date();
              }

              setWeekDates(generateWeekDates(startDate));
            }}
            onCancel={() => {
              setWeekDates(generateWeekDates());
            }}
          />
        </div>

        <div className="">
          {/* Attendance Table */}
          <div className="min-w-[60%] flex-col gap-4 lg:flex">
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
                    const effectiveHours = isNaN(Number(data.hours))
                      ? data.hours
                      : convertDuration(
                          Number(data.hours) - Number(data.totalBreaks),
                        );
                    return (
                      <tr
                        key={index}
                        className={
                          index % 2 === 0 ? "border-b bg-blue-100" : "border-b"
                        }
                      >
                        <td className="bg-background px-2 py-2 sm:px-4">
                          {daysOfWeek[index]}-{weekDates[index].getDate()}
                        </td>
                        <td className="px-2 py-2 sm:px-4">
                          {moment.isDate(data.clockedIn)
                            ? moment(data.clockedIn).format("hh:mm A")
                            : data.clockedIn}
                        </td>
                        <td className="px-2 py-2 sm:px-4">
                          {moment.isDate(data?.clockedOut)
                            ? moment(data?.clockedOut).format("hh:mm A")
                            : data?.clockedOut}
                        </td>
                        <td className="hidden justify-center px-2 py-2 sm:px-4 lg:flex">
                          {data.totalBreaks}
                        </td>
                        <td className="px-2 py-2 lg:px-4">{effectiveHours}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TechnicianAttendance;
