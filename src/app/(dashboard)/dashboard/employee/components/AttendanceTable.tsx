"use client";
import { CiCircleInfo } from "react-icons/ci";
import { IoMdArrowDropdown, IoMdArrowDropup } from "react-icons/io";
import { FiEdit2, FiSave, FiX } from "react-icons/fi";
// @ts-ignore
import { getAttendanceInfo } from "@/actions/employee/getAttendanceInfo";
// @ts-ignore
import { updateAttendanceTime } from "@/actions/employee/updateAttendanceTime";
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
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
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
              <FiSave size={14} />
            </button>
            <button
              onClick={handleCancelEdit}
              disabled={isUpdating}
              className="flex items-center justify-center text-red-600 hover:text-red-800 disabled:opacity-50"
              title="Cancel"
            >
              <FiX size={14} />
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
      <div className="flex items-center gap-2">
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
            <FiEdit2 size={12} />
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

        {/* Success Message */}
        {updateSuccess && (
          <div className="mb-4 rounded border border-green-400 bg-green-100 px-4 py-3 text-green-700">
            {updateSuccess}
          </div>
        )}

        <div className="">
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
                      const dayOfWeek = moment.utc(data.date).day();
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
