"use client";
// @ts-ignore
import { getAttendanceInfo } from "@/actions/employee/getAttendanceInfo";
// @ts-ignore
import { updateAttendanceTime } from "@/actions/employee/updateAttendanceTime";
import DateRange from "@/app/(dashboard)/dashboard/payments/components/PaymentDateRange";
import AttendanceTableSkeleton from "@/components/ui/AttendanceTableSkeleton";
import { useCompanyTimezone } from "@/hooks/useCompanyTimezone";
import { useServerGet } from "@/hooks/useServerGet";
import { convertDuration, getTotalBreaksValue } from "@/lib/convertDurations";
import { decimalHoursToHHMM } from "@/lib/decimalHoursToHHMM";
import { Info, Pencil, Save, X } from "lucide-react";
import moment from "moment-timezone";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

interface AttendanceRecord {
  id?: number;
  date: Date;
  clockedIn: Date | string;
  clockedOut: Date | string;
  hours: string;
  extraHours: string;
  totalBreaks: string;
}

interface AttendanceData {
  id: number;
  clockedIn: string;
  clockedOut: string;
  hours: string;
  date: string;
  totalBreaks: number;
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

interface EditingState {
  rowIndex: number;
  field: "clockedIn" | "clockedOut";
  value: string;
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

const Dashboard = () => {
  const timezone = useCompanyTimezone();
  const [infoIndex, setInfoIndex] = useState<number | null>(null);
  const [editingState, setEditingState] = useState<EditingState | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [refetch, setRefetch] = useState(0);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [hasManualDateRange, setHasManualDateRange] = useState(false);

  const params = useParams();
  const employeeId = Number(params?.id);

  // Initialize date range when timezone is loaded
  useEffect(() => {
    if (timezone && (!startDate || !endDate)) {
      const weekStart = moment.tz(timezone).startOf("week");
      const weekEnd = moment.tz(timezone).endOf("week");
      setStartDate(weekStart.format("YYYY-MM-DD"));
      setEndDate(weekEnd.format("YYYY-MM-DD"));
    }
  }, [timezone, startDate, endDate]);

  // Modified to include startDate and endDate parameters
  // Only fetch when both dates are available
  const { data: attendanceInfo } = useServerGet(
    getAttendanceInfo,
    employeeId,
    startDate || undefined,
    endDate || undefined,
    refetch,
  );

  const getInfoContent = (label: string): string | undefined => {
    const info = infoData.find((info) => info.metricLabel === label);
    return info?.content;
  };

  const handleEditClick = (
    rowIndex: number,
    field: "clockedIn" | "clockedOut",
  ) => {
    const data = attendanceInfo?.attInfo[rowIndex];
    if (!data || !isEditable(data, field)) return;

    // Clear any previous messages
    setUpdateError(null);
    setUpdateSuccess(null);

    // Get the current value and format it for the time input
    const currentValue = moment.utc(data[field]).tz(timezone).format("HH:mm");
    setEditingState({
      rowIndex,
      field,
      value: currentValue,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingState || !attendanceInfo?.attInfo[editingState.rowIndex])
      return;

    setIsUpdating(true);
    setUpdateError(null);
    setUpdateSuccess(null);

    try {
      const data = attendanceInfo.attInfo[editingState.rowIndex];
      const date = moment.utc(data.date).format("YYYY-MM-DD");

      // Validate time format
      if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(editingState.value)) {
        setUpdateError("Invalid time format. Please use HH:MM format.");
        return;
      }

      // Convert the time back to UTC for storage
      const timeWithDate = moment
        .tz(`${date} ${editingState.value}`, timezone)
        .utc()
        .toDate();

      // Call the backend function
      const result = await updateAttendanceTime(
        employeeId,
        date,
        editingState.field,
        timeWithDate,
        data.id,
      );

      if (result.success) {
        // Refetch the data to get updated information
        setRefetch((prev) => prev + 1);
        setUpdateSuccess("Time updated successfully!");
        setEditingState(null);

        // Clear success message after 3 seconds
        setTimeout(() => setUpdateSuccess(null), 3000);
      } else {
        setUpdateError(result.message || "Failed to update time");
      }
    } catch (error) {
      console.error("Error updating attendance time:", error);
      setUpdateError("An error occurred while updating time");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingState(null);
    setUpdateError(null);
  };

  const handleTimeChange = (value: string) => {
    if (editingState) {
      setEditingState({
        ...editingState,
        value,
      });
      // Clear error when user starts typing
      setUpdateError(null);
    }
  };

  const isEditable = (
    data: AttendanceData | AttendanceRecord,
    field: "clockedIn" | "clockedOut",
  ) => {
    // Check if the field exists and is not a string (like "Absent", "No Show", etc.)
    return (
      data[field] && typeof data[field] !== "string" && data[field] !== null
    );
  };

  const renderTimeCell = (
    data: AttendanceData | AttendanceRecord,
    field: "clockedIn" | "clockedOut",
    rowIndex: number,
  ) => {
    const isCurrentlyEditing =
      editingState?.rowIndex === rowIndex && editingState?.field === field;
    const canEdit = isEditable(data, field);

    if (isCurrentlyEditing) {
      return (
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center justify-center gap-2">
            <input
              type="time"
              value={editingState.value}
              onChange={(e) => handleTimeChange(e.target.value)}
              className="rounded border px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
              disabled={isUpdating}
            />
            <button
              onClick={handleSaveEdit}
              disabled={isUpdating}
              className="flex items-center justify-center text-green-600 hover:text-green-800 disabled:opacity-50"
              title="Save"
            >
              <Save size={14} />
            </button>
            <button
              onClick={handleCancelEdit}
              disabled={isUpdating}
              className="flex items-center justify-center text-red-600 hover:text-red-800 disabled:opacity-50"
              title="Cancel"
            >
              <X size={14} />
            </button>
          </div>
          {updateError && (
            <div className="max-w-[200px] break-words text-xs text-red-500">
              {updateError}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center gap-2">
        <span className="min-w-[80px]">
          {typeof data[field] === "string"
            ? data[field]
            : moment.utc(data[field]).tz(timezone).format("hh:mm A")}
        </span>
        {canEdit && (
          <button
            onClick={() => handleEditClick(rowIndex, field)}
            className="text-blue-600 opacity-0 transition-opacity hover:text-blue-800 group-hover:opacity-100"
            title="Edit time"
          >
            <Pencil size={12} />
          </button>
        )}
      </div>
    );
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
      value: (() => {
        const total = Number(attendanceInfo?.totalHoursWorked) || 0;
        return decimalHoursToHHMM(total);
      })(),

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
    <div className="my-4 box-border flex w-full flex-col lg:w-1/2">
      <h2 className="mb-2 text-xl font-bold">Attendance</h2>
      <div className="relative flex flex-1 w-full flex-col gap-8 rounded-lg border bg-background p-1 lg:p-6">
        <div className="left-3 top-3 w-fit">
          <DateRange
            dateRange={[
              hasManualDateRange && startDate ? new Date(startDate) : null,
              hasManualDateRange && endDate ? new Date(endDate) : null,
            ]}
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

              // Convert the dates to proper format for server
              // When user selects dates from DateRangePicker, they're in local browser time
              // We need to ensure these dates are interpreted correctly by the server
              // Format as YYYY-MM-DD which will be interpreted by the server in company timezone
              // const formattedStartDate = moment
              //   .utc(startDateObj)
              //   .format("YYYY-MM-DD");
              // const formattedEndDate = moment
              //   .utc(endDateObj)
              //   .format("YYYY-MM-DD");
              const formattedStartDate =
                moment(startDateObj).format("YYYY-MM-DD");
              const formattedEndDate = moment(endDateObj).format("YYYY-MM-DD");

              // Update state with the new dates

              setStartDate(formattedStartDate);
              setEndDate(formattedEndDate);
              setHasManualDateRange(true);
            }}
            onCancel={() => {
              // Clear manual filter in UI and keep fallback current week data
              setHasManualDateRange(false);
              if (timezone) {
                const currentWeekStart = moment.tz(timezone).startOf("week");
                const currentWeekEnd = moment.tz(timezone).endOf("week");

                setStartDate(currentWeekStart.format("YYYY-MM-DD"));
                setEndDate(currentWeekEnd.format("YYYY-MM-DD"));
              }
            }}
          />
        </div>

        {/* Success Message */}
        {updateSuccess && (
          <div className="mb-4 rounded border border-green-400 bg-green-100 px-4 py-3 text-green-700">
            {updateSuccess}
          </div>
        )}

        <div className="">
          {/* Show loading state when dates are not initialized or data is not available */}
          {!startDate || !endDate || !attendanceInfo ? (
            <AttendanceTableSkeleton rows={7} />
          ) : (
            <>
              {/* Attendance Table */}
              <div className="min-w-[60%] flex-col gap-4 lg:flex">
                <div className="max-h-[400px] overflow-y-auto">
                  <div className="h-full w-full rounded border">
                    <table className="h-full w-full bg-background text-center text-sm lg:text-base">
                      <thead className="sticky top-0 bg-background">
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
                          // Fix date processing to avoid timezone shifts
                          // If data.date is a string in YYYY-MM-DD format, parse it as local date

                          let dateMoment;
                          if (typeof data.date === "string") {
                            dateMoment = moment.tz(`${data.date}`, timezone);
                          } else {
                            dateMoment = moment.tz(data.date, timezone);
                          }

                          // Get the timezone offset in hours relative to UTC
                          const offsetHours = dateMoment.utcOffset() / 60;

                          let utcMoment = moment.tz(data.date, timezone);
                          if (offsetHours < 0) {
                            utcMoment.add(1, "day");
                          }
                          const dayOfWeek = utcMoment.day();
                          const dayAbbr = daysOfWeek[dayOfWeek];
                          const dayDate = utcMoment.date();

                          const effectiveHours = isNaN(Number(data.hours))
                            ? data.hours
                            : convertDuration(
                                Number(data.hours) - Number(data.totalBreaks),
                              );
                          return (
                            <tr
                              key={index}
                              className={`group ${
                                index % 2 === 0
                                  ? "border-b bg-blue-50"
                                  : "border-b bg-background"
                              }`}
                            >
                              <td className="bg-background px-2 py-2 font-medium sm:px-4">
                                {dayAbbr}-{dayDate}
                              </td>
                              <td className="px-2 py-2 sm:px-4">
                                {renderTimeCell(data, "clockedIn", index)}
                              </td>
                              <td className="px-2 py-2 sm:px-4">
                                {renderTimeCell(data, "clockedOut", index)}
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
                    className="relative flex items-center justify-between gap-4 rounded-xl bg-white/30 p-4 backdrop-blur-md ring-1 ring-slate-900/5 transition duration-300 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-md dark:bg-black/30 dark:ring-white/10 dark:hover:shadow-lg"
                  >
                    <div className="absolute left-2 top-2">
                      <div
                        className="group relative"
                        onMouseEnter={() => setInfoIndex(index)}
                        onMouseLeave={() => setInfoIndex(null)}
                      >
                        <Info className="h-4 w-4 cursor-help text-slate-500 transition duration-300 group-hover:text-slate-700 dark:text-slate-400 dark:group-hover:text-slate-200" />
                        {infoIndex === index && (
                          <div className="absolute left-6 top-0 z-10 min-h-[60px] w-[200px] rounded-lg bg-slate-700/90 p-3 text-sm text-white opacity-0 shadow-lg transition-opacity duration-300 group-hover:opacity-100 dark:bg-slate-800/90">
                            {getInfoContent(metric.label)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="ml-4 w-fit text-base font-bold text-slate-600 dark:text-slate-300">
                      {metric.label}
                    </div>
                    <div className="text-lg font-semibold text-slate-600 dark:text-slate-200">
                      {metric.value}
                    </div>
                    <div
                      className={`mt-1 flex items-center justify-end gap-1 text-sm font-medium ${
                        metric.isPositive ? "text-emerald-500" : "text-rose-500"
                      }`}
                    >
                      {metric.isPositive ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          width="16"
                          height="16"
                          aria-hidden="true"
                          role="img"
                          className="transition duration-300 hover:scale-110"
                        >
                          <path d="M12 8.5l7 7H5l7-7z" fill="currentColor" />
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          width="16"
                          height="16"
                          aria-hidden="true"
                          role="img"
                          className="transition duration-300 hover:scale-110"
                        >
                          <path
                            d="M12 15.5L5 8.5h14l-7 7z"
                            fill="currentColor"
                          />
                        </svg>
                      )}
                      <div className="text-nowrap">{metric.percentage}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
