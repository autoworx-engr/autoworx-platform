"use client";

import { assignAppointmentDate } from "@/actions/appointment/assignAppointmentDate";
import { updateTask } from "@/actions/task/dragTask";
import { Tooltip, TooltipContent } from "@/components/Tooltip";
import { useCompanyTimezone } from "@/hooks/useCompanyTimezone";
import { cn } from "@/lib/cn";
import { TASK_COLOR } from "@/lib/consts";
import { useCalendarStore } from "@/stores/calendarStore";
import { usePopupStore } from "@/stores/popup";
import type {
  AppointmentFull,
  CalendarAppointment,
  CalendarTask,
} from "@/types/db";
import {
  formatDate,
  formatTime,
  updateTimeSpace,
} from "@/utils/taskAndActivity";
import type {
  CalendarSettings,
  Client,
  EmailTemplate,
  Task,
  User,
  Vehicle,
} from "@prisma/client";
import mergeRefs from "merge-refs";
import moment from "moment-timezone";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDrop } from "react-dnd";
import DraggableTaskTooltip from "../components/day/draggable/DraggableTaskTooltip";
import { useAutoScrollWhileDragging } from "./useAutoScrollWhileDragging";
import {
  getWeekInfoFromWeekStr,
  getWeekStartNumber,
} from "./utils.DateSelector";
import { SquarePen } from "lucide-react";

function useWeek(settings: CalendarSettings) {
  const { week } = useCalendarStore();
  const weekStart = settings?.weekStart || "Sunday"; // Use weekStart from settings
  const weekStartNumber = getWeekStartNumber(weekStart);

  moment.updateLocale("en", {
    week: {
      dow: weekStartNumber, // Set the start of the week
    },
  });

  const parsedWeek = moment(week, "YYYY-[W]WW");
  return parsedWeek.isValid() ? parsedWeek : moment();
}
// Generate the hourly rows
const hourlyRows = Array.from({ length: 24 }, (_, i) => {
  const emptyCells = Array.from({ length: 7 }, () => "");
  if (i === 0) {
    return ["12 AM", ...emptyCells];
  } else if (i < 12) {
    return [`${i} AM`, ...emptyCells]; // 1 AM to 11 AM
  } else if (i === 12) {
    return ["12 PM", ...emptyCells]; // Noon
  } else if (i < 24) {
    return [`${i - 12} PM`, ...emptyCells]; // 1 PM to 11 PM
  } else {
    return ["12 AM", ...emptyCells]; // Midnight of the next day
  }
});

function getNext7Days(startDayName: string, today: Date) {
  const weekStartNumber = getWeekStartNumber(startDayName);

  moment.updateLocale("en", {
    week: {
      dow: weekStartNumber, // Set the start of the week
    },
  });

  const startOfWeek = moment(today).startOf("week");
  const days = Array.from({ length: 7 }, (_, i) =>
    moment(startOfWeek).add(i, "days").toDate()
  );

  return days.map((day) => ({
    dayName: moment(day).format("dddd"),
    date: moment(day).format("YYYY-MM-DD"),
  }));
}

export default function Week({
  tasks,
  companyUsers,
  tasksWithoutTime,
  appointments,
  appointmentsFull,
  customers,
  vehicles,
  settings,
  templates,
}: {
  tasks: CalendarTask[];
  companyUsers: User[];
  tasksWithoutTime: Task[];
  appointments: CalendarAppointment[];
  appointmentsFull: AppointmentFull[];
  customers: Client[];
  vehicles: Vehicle[];
  settings: CalendarSettings;
  templates: EmailTemplate[];
}) {
  const [scrollPosition, setScrollPosition] = useState(0);
  const [loading, setLoading] = useState(false);
  const [draggedOverRow, setDraggedOverRow] = useState<{
    r: number;
    c: number;
  } | null>(null);
  const [screenSize, setScreenSize] = useState({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
  });

  const { open } = usePopupStore();
  const timezone = useCompanyTimezone();
  const router = useRouter();

  const { setDate, setNavigating } = useCalendarStore();

  const [{ canDrop, isOver }, dropRef] = useDrop({
    accept: ["task", "tag", "appointment"],
    drop: (item, monitor) => {
      // Update your state here
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }) as [{ canDrop: boolean; isOver: boolean }, any];

  // Handle responsive layout
  useEffect(() => {
    const handleResize = () => {
      setScreenSize({
        isMobile: window.innerWidth < 640,
        isTablet: window.innerWidth >= 640 && window.innerWidth < 1024,
        isDesktop: window.innerWidth >= 1024,
      });
    };

    // Initial check
    handleResize();

    // Add event listener
    window.addEventListener("resize", handleResize);

    // Clean up
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const weekStartNumber = getWeekStartNumber(settings?.weekStart || "Sunday");
    moment.updateLocale("en", {
      week: {
        dow: weekStartNumber, // Set the start of the week
      },
    });
  }, [settings?.weekStart]);

  useEffect(() => {
    const handleScroll = () => {
      setScrollPosition(dropRef.current!.scrollTop);
    };

    dropRef.current && dropRef.current.addEventListener("scroll", handleScroll);

    return () => {
      dropRef.current &&
        dropRef.current.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const week = useWeek(settings);
  const today = week.toDate();

  const weekStart = settings?.weekStart || "Sunday";
  const parentRef = useRef<HTMLDivElement>(null);

  // for drag scroll
  useAutoScrollWhileDragging(parentRef);

  const clientTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Get the days of the week based on the weekStart
  const days = useMemo(() => {
    const weekInfo = getWeekInfoFromWeekStr(
      week.format("YYYY-[W]WW"),
      weekStart
    );
    const startOfWeek = moment(weekInfo.startDate);

    const daysInWeek = [];
    for (let i = 0; i < 7; i++) {
      const currentDay = moment(startOfWeek).add(i, "days");
      daysInWeek.push({
        dayName: currentDay.format("dddd"),
        date: currentDay.format("YYYY-MM-DD"),
      });
    }

    return daysInWeek;
  }, [week, weekStart]);

  // Generate the all-day row
  const allDayRow = [
    "",
    // Generate the days of the week with the date
    ...days.map((day) => {
      const date = moment(day.date); // Use moment for consistent formatting
      const isToday = moment().isSame(date, "day"); // Check if the date is today

      return (
        <div
          key={day.dayName}
          className={cn(
            "relative flex flex-col items-center justify-center px-1 py-2",
            isToday && "font-medium text-[#6571FF]"
          )}
        >
          {/* Day name */}
          <span className="text-sm font-medium text-gray-700 sm:text-base md:text-[17px]">
            {screenSize.isMobile
              ? date.format("ddd") // Short day name (e.g., Mon)
              : screenSize.isTablet
                ? date.format("ddd") // Short day name (e.g., Mon)
                : date.format("dddd")}{" "}
          </span>

          {/* Date number */}
          <div
            className={cn(
              "my-0.5 flex h-8 w-8 items-center justify-center rounded-full",
              isToday
                ? "bg-[#6571FF] text-white"
                : "text-[#797979] hover:bg-gray-200"
            )}
          >
            <span className="text-sm sm:text-base">{date.format("D")}</span>{" "}
            {/* Day of the month */}
          </div>

          {/* Month name - smaller and subtle */}
          {/* Uncomment if needed */}
          {/* <span className="text-xs text-gray-500">
            {date.format("MMM")} {/* Short month name (e.g., Jan) */}
          {/* </span> */}
        </div>
      );
    }),
  ];

  // Combine the all-day row and the hourly rows into a single array
  const rows = [allDayRow, ...hourlyRows];

  // Filter out the tasks that are within the current week
  const events = useMemo<
    ((
      | (CalendarTask & { type: "task" })
      | (CalendarAppointment & { type: "appointment" })
    ) & {
      rowStartIndex: number;
      rowEndIndex: number;
      columnIndex: number;
      type: "task" | "appointment";
    })[]
  >(() => {
    // Get the start and end of the current week
    const startOfWeek = moment.utc(days[0].date);
    const endOfWeek = moment.utc(days[days.length - 1].date);

    return [
      ...tasks.map((task) => ({ ...task, type: "task" as any })),
      ...appointments.map((appointment) => ({
        ...appointment,
        type: "appointment" as any,
      })),
    ]
      .filter((task) => {
        const taskDate = moment.utc(task.date as any);
        return taskDate.isBetween(startOfWeek, endOfWeek, "day", "[]");
      })
      .map((event) => {
        const taskDate = moment.utc(event.date as any);
        const taskDayName = taskDate.format("dddd");
        const weekStartDayName = startOfWeek.format("dddd");
        const findTaskDayIndex = days.findIndex(
          (day) => day.dayName === taskDayName
        );
        const findWeekStartDayIndex = days.findIndex(
          (day) => day.dayName === weekStartDayName
        );
        const columnIndex = findTaskDayIndex - findWeekStartDayIndex;

        // Convert the taskStartTime and taskEndTime to a format like "1 PM" or "11 AM"
        const taskStartTime = moment(event.startTime, "HH:mm").format("h A");
        const taskEndTime = moment(event.endTime, "HH:mm").format("h A");

        // Find the rowStartIndex and rowEndIndex by looping over the hourlyRows
        const rowStartIndex = hourlyRows.findIndex((row) =>
          row.includes(taskStartTime)
        );
        const rowEndIndex = hourlyRows.findIndex((row) =>
          row.includes(taskEndTime)
        );

        return { ...event, columnIndex, rowStartIndex, rowEndIndex };
      });
  }, [tasks, appointments, week, days]);
  async function handleDrop(
    event: React.DragEvent,
    rowIndex: number,
    columnIndex: number,
    rowTime: string
  ) {
    if (rowTime === "All Day" || columnIndex === 0) return;
    const startTime = formatTime(hourlyRows[rowIndex - 1]?.[0]);
    const endTime = formatTime(hourlyRows[rowIndex][0]);

    const findDate = days.find((day, index) => index === columnIndex - 1);
    const date = formatDate(new Date(findDate?.date!));
    // Get the task type
    const attributeData = event.dataTransfer.getData("text/plain").split("|");
    const type = attributeData[0];

    if (type === "tag") {
      const tag = event.dataTransfer.getData("text/plain").split("|")[1];

      // TODO: add tag to the task
    } else if (type === "task") {
      // Get the id of the task from the dataTransfer object
      const taskId = parseInt(attributeData[1]);
      // Find the task in your state
      const taskFoundWithoutTime = tasksWithoutTime.find(
        (task) => task.id == taskId
      );
      const oldTask = tasks.find((task) => task.id === taskId);
      if (taskFoundWithoutTime) {
        // TODO: Add task to database
        await updateTask({
          id: taskFoundWithoutTime.id,
          date: date ? new Date(date) : new Date(),
          startTime: oldTask?.startTime || startTime,
          endTime: oldTask?.endTime || endTime,
          timezone: timezone,
        });
      } else {
        const { newStartTime, newEndTime } = updateTimeSpace(
          oldTask?.startTime as string,
          oldTask?.endTime as string,
          rowTime
        );
        // TODO:
        await updateTask({
          id: oldTask?.id!,
          date: new Date(date),
          startTime: newStartTime,
          endTime: newEndTime,
          timezone: timezone,
        });
      }
    } else if (type === "appointment") {
      // Get the id of the appointment from the dataTransfer object
      const appointmentId = parseInt(attributeData[1]);
      // Find the appointment in your state
      const oldAppointment = appointments.find(
        (appointment) => appointment.id === appointmentId
      );
      const { newStartTime, newEndTime } = updateTimeSpace(
        oldAppointment?.startTime as string,
        oldAppointment?.endTime as string,
        rowTime
      );
      if (oldAppointment) {
        await assignAppointmentDate({
          id: oldAppointment.id,
          date,
          startTime: newStartTime,
          endTime: newEndTime,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
      }
    }
  }
  // event sorted by type
  const sortedEvents = events.slice().sort((a, b) => {
    const aRowStartIndex = a.rowStartIndex;
    const aRowEndIndex = a.rowEndIndex;
    const aBigIndex = aRowEndIndex - aRowStartIndex;
    const bRowStartIndex = b.rowStartIndex;
    const bRowEndIndex = b.rowEndIndex;
    const bBigIndex = bRowEndIndex - bRowStartIndex;
    if (a.type === "appointment" && b.type !== "appointment") {
      return -1;
    }
    if (a.type !== "appointment" && b.type === "appointment") {
      return 1;
    }
    if (a.type === "appointment" && b.type === "appointment") {
      return bBigIndex - aBigIndex;
    }

    return aBigIndex - bBigIndex;
  });

  const containerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const scrollToStartTime = () => {
      if (containerRef.current) {
        const startTimeIndex = rows.findIndex((row) => {
          if (typeof row[0] !== "string") return false;
          const rowTime = formatTime(row[0]);
          return rowTime === settings?.dayStart;
        });

        if (startTimeIndex !== -1) {
          const scrollPosition = startTimeIndex * 75;
          containerRef.current.scrollTo({
            top: scrollPosition,
            behavior: "smooth",
          });
        }
      }
    };

    scrollToStartTime();
  }, [rows, settings?.dayStart]);

  function handleAddTaskModalOpen(columnIndex: number, rowTime: string) {
    const date = formatDate(
      new Date(
        today.setDate(today.getDate() - today.getDay() + columnIndex - 1)
      )
    );
    const startTime = formatTime(rowTime);
    open("ADD_TASK", { date, startTime, companyUsers });
  }
  return (
    <>
      <div
        className="relative mt-3 h-[90%] overflow-auto border-neutral-200"
        // style={{
        //   backgroundColor: isOver ? "rgba(0, 0, 0, 0.1)" : "transparent",
        // }}
        ref={mergeRefs(dropRef, parentRef, containerRef)}
      >
        {rows.map((row: any, rowIndex: number) => {
          const rowTime = row[0];
          const formattedRowTime = formatTime(rowTime);
          const dateRangeForBgChanger =
            formattedRowTime >= settings?.dayStart &&
            formattedRowTime <= settings?.dayEnd;
          return (
            <div
              className={cn(
                "relative flex h-[71px] justify-end border-neutral-200",
                rowIndex !== rows.length - 1 && "",
                rowIndex === 0 && "sticky top-0 z-10"
              )}
              key={rowIndex}
            >
              {row.map((column: any, columnIndex: number) => {
                const isHeaderCell = columnIndex === 0 || rowIndex === 0;
                const cellWidth =
                  columnIndex === 0
                    ? "min-w-[10%] max-w-[10%]"
                    : "min-w-[12.9%] max-w-[12.9%]";

                const fontSize =
                  rowIndex === 0
                    ? "font-bold text-[19px] max-[1600px]:text-[15px]"
                    : "text-[17px] max-[1600px]:text-[13px]";
                const cellClasses = cn(
                  "border-r border-neutral-200 h-full text-[#797979] flex justify-center items-center border-b ",
                  cellWidth,
                  fontSize,
                  columnIndex === 0 &&
                    "border-0 absolute -left-[6px] p-2 text-end -top-[35.5px] justify-end pr-3",
                  columnIndex === 1 && "border-l",
                  rowIndex === 0 && "border-t"
                );

                const cellBgColor =
                  rowTime === "" || columnIndex === 0
                    ? "white"
                    : dateRangeForBgChanger
                      ? "transparent"
                      : "#F2F2F2";

                return (
                  <button
                    key={columnIndex}
                    className={cellClasses}
                    disabled={isHeaderCell}
                    onClick={
                      isHeaderCell
                        ? undefined
                        : () => handleAddTaskModalOpen(columnIndex, rowTime)
                    }
                    onDrop={(event: React.DragEvent) => {
                      handleDrop(event, rowIndex, columnIndex, row[0]);
                      setDraggedOverRow(null);
                    }}
                    onDragOver={(event: React.DragEvent) => {
                      event.preventDefault();
                      setDraggedOverRow({ r: rowIndex, c: columnIndex });
                    }}
                    onDragLeave={() => setDraggedOverRow(null)}
                    style={{
                      backgroundColor:
                        draggedOverRow?.r === rowIndex &&
                        draggedOverRow?.c === columnIndex
                          ? "rgba(0, 0, 0, 0.1)"
                          : cellBgColor,
                    }}
                  >
                    {column}
                  </button>
                );
              })}
            </div>
          );
        })}

        {events.map((event, index) => {
          // left according to the cell width
          let left = `calc(10% + 12.9% * ${event.columnIndex})`;
          let top = `${71 * event.rowStartIndex + 71}px`;
          // if the previous task starts at the same time as this task
          // then move this task down
          // if (
          //   index > 0 &&
          //   event.rowStartIndex === events[index - 1].rowStartIndex
          // ) {
          //   top = `${71 * event.rowStartIndex + 71}px`;
          // }
          // const height = `${
          //   71 * (event.rowEndIndex - event.rowStartIndex + 1)
          // }px`;
          // width according to the cell width
          let width = "calc(12.5% - 4px)"; // prev = 12.9%
          // @ts-ignore
          const backgroundColor = event.priority
            ? // @ts-ignore
              TASK_COLOR[event.priority]
            : "#FAF9F6";
          // Calculate how many tasks are in the same row
          //TODO:
          const eventStartTime = moment(event.startTime, "HH:mm");
          const eventEndTime = moment(event.endTime, "HH:mm");

          // Get the hour and minute components
          const startHour = eventStartTime.hour();
          const startMinute = eventStartTime.minute();
          const endHour = eventEndTime.hour();
          const endMinute = eventEndTime.minute();

          // Calculate proportional position within the row (0 to 1)
          const startOffset = startMinute / 60;
          const endOffset = endMinute / 60;

          // Calculate exact top position (start from the hour row and add proportional offset)
          const topPosition = 71 * event.rowStartIndex + 71 + startOffset * 71;

          // sort by big indexes
          const tasksInRow = sortedEvents.filter((task) => {
            if (event.columnIndex === task.columnIndex) {
              const taskStartTime = moment(task.startTime, "HH:mm");
              const taskEndTime = moment(task.endTime, "HH:mm");
              if (
                event.rowStartIndex === task.rowStartIndex ||
                (eventStartTime.isBefore(taskEndTime) &&
                  eventEndTime.isAfter(taskStartTime))
              ) {
                return true;
              }
            }
          });
          const limitOfTasks = 5;
          const taskIndex = tasksInRow.findIndex((task) => {
            if (task.id === event.id && task.type === event.type) {
              return true;
            }
          });
          // Calculate exact height (consider both hour and minute differences)
          const totalMinutes =
            (endHour - startHour) * 60 + (endMinute - startMinute);
          const height = `${(totalMinutes / 60) * 71}px`;
          // const diffByMinutes = eventEndTime.diff(eventStartTime, "minutes");
          // const height = `${(diffByMinutes / 60) * 71}px`;
          if (taskIndex) {
            left = `calc(10% + 12.9% * ${event.columnIndex} + ${taskIndex * 2}%)`;
          }
          // if (tasksInRow.length > 2) {
          //   width = `${12.9 / tasksInRow.length}%`;
          // }
          // Define a function to truncate the task title based on the height
          // const truncateTitle = (title: string, maxLength: number) => {
          //   return title.length > maxLength
          //     ? `${title.slice(0, maxLength)}...`
          //     : title;
          // };
          // Define the maximum title length based on the height
          // const maxTitleLength =
          //   height === "45px"
          //     ? 13
          //     : height === "90px"
          //       ? 30
          //       : event.title.length;
          if (taskIndex < limitOfTasks) {
            return (
              <Tooltip key={`${event.id}-${index}`}>
                <DraggableTaskTooltip
                  //@ts-ignore
                  className={`absolute top-0 w-full rounded-lg border`}
                  style={{
                    left,
                    top: `${topPosition}px`,
                    height,
                    backgroundColor,
                    width,
                  }}
                  task={event}
                  updateTaskData={{ event, companyUsers }}
                  updateAppointmentData={{
                    appointment: appointmentsFull.find(
                      (appointment) => appointment.id === event.id
                    ),
                    employees: companyUsers,
                    customers,
                    vehicles,
                    templates,
                    settings,
                  }}
                  onNavigate={() => {
                    // Convert Date object to string to avoid timezone issues
                    const dateString =
                      event.date instanceof Date
                        ? event.date.toLocaleDateString("en-CA") // 'YYYY-MM-DD' format
                        : moment(event.date).format("YYYY-MM-DD");

                    // Set navigation flag to prevent reset, then set date and navigate
                    setNavigating(true);
                    setDate(dateString);
                    router.push("/dashboard/task/day");

                    // Clear navigation flag after a short delay to allow navigation to complete
                    // setTimeout(() => setNavigating(false), 30000);
                  }}
                >
                  {
                    <>
                      {/* Show event title regardless of type */}
                      <div className="flex h-full w-full flex-col p-1 text-xs">
                        <p
                          className={cn(
                            "w-full truncate font-medium",
                            event?.type === "appointment"
                              ? "text-gray-700"
                              : "text-white"
                          )}
                        >
                          {event.title}
                        </p>
                        <p
                          className={cn(
                            "text-xxs hidden lg:block",
                            event?.type === "appointment"
                              ? "text-gray-500"
                              : "text-gray-200"
                          )}
                        >
                          {moment(event.startTime, "HH:mm").format("h:mm A")} -
                          {moment(event.endTime, "HH:mm").format("h:mm A")}
                        </p>
                        {event.type === "appointment" && (
                          <div className="absolute inset-y-0 right-0 h-full w-1.5 rounded-md bg-[#6571FF]"></div>
                        )}
                      </div>
                    </>
                  }
                </DraggableTaskTooltip>
                <TooltipContent className="w-72 rounded-md border border-slate-400 bg-background p-3">
                  {event.type === "appointment" ? (
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{event.title}</h3>
                        <button
                          type="button"
                          className="text- rounded-full bg-[#6571FF] p-2 text-white"
                          onClick={() =>
                            open("UPDATE_APPOINTMENT", {
                              appointment: appointmentsFull.find(
                                (appointment) => appointment.id === event.id
                              ),
                              employees: companyUsers,
                              customers,
                              vehicles,
                              templates,
                              settings,
                            })
                          }
                        >
                          <SquarePen className="w-4 h-4 cursor-pointer mx-auto" />
                        </button>
                      </div>

                      <p>
                        Client:
                        {event.client &&
                          `${event.client.firstName} ${event.client.lastName}`}
                      </p>
                      <p>
                        Email:
                        <a
                          href={`mailto:${event.client?.email}`}
                          className="text-blue-500"
                        >
                          {event.client?.email}
                        </a>
                      </p>
                      <p>
                        Phone:
                        <a
                          href={`tel:${event.client?.mobile}`}
                          className="cursor-pointer text-blue-500"
                        >
                          {event.client?.mobile}
                        </a>
                      </p>

                      <p>
                        Assigned To:{" "}
                        {event.assignedUsers
                          .slice(0, 1)
                          .map(
                            (user: User) => `${user.firstName} ${user.lastName}`
                          )}
                      </p>

                      <p>
                        {moment(event.startTime, "HH:mm").format("hh:mm A")} To{" "}
                        {moment(event.endTime, "HH:mm").format("hh:mm A")}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{event.title}</h3>

                        <button
                          type="button"
                          className="text- rounded-full bg-[#6571FF] p-2 text-white"
                          onClick={() =>
                            open("UPDATE_TASK", {
                              task: event,
                              companyUsers,
                            })
                          }
                        >
                          <SquarePen className="w-4 h-4 cursor-pointer mx-auto" />
                        </button>
                      </div>

                      {/* @ts-ignore */}
                      <p className="mt-3">{event.description}</p>

                      {/* @ts-ignore */}
                      <p className="mt-3">Task Priority: {event.priority}</p>
                    </div>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          } else {
            const lastIndex = tasksInRow.length - 1;
            if (lastIndex !== taskIndex) return null;
            return (
              <span
                onClick={() => {
                  // Convert Date object to string to avoid timezone issues
                  const dateString =
                    event.date instanceof Date
                      ? event.date.toLocaleDateString("en-CA") // 'YYYY-MM-DD' format
                      : moment(event.date).format("YYYY-MM-DD");

                  // Set navigation flag to prevent reset, then set date and navigate
                  setNavigating(true);
                  setDate(dateString);
                  router.push("/dashboard/task/day");

                  // Clear navigation flag after a short delay to allow navigation to complete
                  // setTimeout(() => setNavigating(false), 30000);
                }}
                className={cn(
                  `absolute top-0 flex items-center justify-center rounded-lg border`,
                  taskIndex === limitOfTasks && "bg-opacity-25",
                  lastIndex === taskIndex && "z-40"
                )}
                style={{
                  left: `calc(10% + 12.9% * ${event.columnIndex} + 160px)`,
                  top,
                  height,
                  backgroundColor: "rgb(0, 0, 255, 0.2)",
                  width,
                }}
                key={event.id}
              >
                <span className="z-30 text-center text-sm text-white">
                  {tasksInRow?.length - 5}+
                </span>
              </span>
            );
          }
        })}
      </div>
    </>
  );
}
