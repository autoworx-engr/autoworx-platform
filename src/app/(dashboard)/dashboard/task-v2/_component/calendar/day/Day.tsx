"use client";
import getTaskById from "@/actions/task/getTaskById";
import { useCompanyTimezone } from "@/hooks/useCompanyTimezone";
import { useCalendarStore } from "@/stores/calendarStore";
import { formatTime, updateTimeSpace } from "@/utils/taskAndActivity";
import type { Task } from "@prisma/client";
import mergeRefs from "merge-refs";
import moment, { Moment } from "moment-timezone";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDrop } from "react-dnd";
import useAppointmentMutation from "../../../_hook/appointment/mutation/useAppointmentMutation";
import useAppointmentQueryByDate from "../../../_hook/appointment/query/useAppointmentQueryByDate";
import useAutoScrollWhileDragging from "../../../_hook/lib/useAutoScrollWhileDragging";
import { useDate } from "../../../_hook/lib/useDate";
import useSettingsQuery from "../../../_hook/settings/query/useSettingsQuery";
import useTaskMutation from "../../../_hook/task/mutation/useTaskMutation";
import useTaskQueryByDate from "../../../_hook/task/query/useTaskQueryByDate";
import DayRow from "./DayRow";
import DayTask from "./DayTask";
import { Skeleton } from "antd";

function doesTaskOrAppointmentEndNextDay(startTime: Moment, endTime: Moment) {
  // Parse the start and end times as moment objects with specific time format
  const start = moment(startTime, "HH:mm");
  const end = moment(endTime, "HH:mm");

  // If the end time is before the start time, it means the appointment ends the next day
  return end.isBefore(start);
}

export default function Day() {
  const date = useDate();
  const timezone = useCompanyTimezone();
  const dateFormat = date.format("YYYY-MM-DD");

  const { data: settings, isLoading: isSettingsLoading } = useSettingsQuery();
  const { data: tasks = [], isLoading: isTasksLoading } =
    useTaskQueryByDate(dateFormat);
  const { data: appointments = [], isLoading: isAppointmentsLoading } =
    useAppointmentQueryByDate(dateFormat);

  const isDataLoading =
    isTasksLoading || isAppointmentsLoading || isSettingsLoading;
  // mutation for task
  const taskMutation = useTaskMutation();

  // mutation for appointment
  const appointmentMutation = useAppointmentMutation();

  const { startTime, setStartTime, setUpdateVariable } = useCalendarStore();
  // Memoize rows generation to prevent unnecessary recalculation
  const rows = useMemo(() => {
    const timeRows: string[] = [];
    timeRows.push(
      ...Array.from({ length: 24 }, (_, i) => {
        if (i === 0) {
          return "12 AM";
        } else if (i < 12) {
          return `${i} AM`;
        } else if (i === 12) {
          return "12 PM";
        } else if (i < 24) {
          return `${i - 12} PM`;
        } else {
          return "12 AM";
        }
      }),
    );
    return timeRows;
  }, []);

  const parentRef = useRef<HTMLDivElement>(null);

  const { setDate } = useCalendarStore();

  // for drag scroll
  useAutoScrollWhileDragging(parentRef);

  const [isRefAvailable, setIsRefAvailable] = useState<boolean>(false);
  const [{ canDrop, isOver }, dropRef] = useDrop({
    accept: ["tag", "task", "appointment"],
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }) as [{ canDrop: boolean; isOver: boolean }, any];

  // useEffect(() => {
  //   const date = moment(dateQuery).format("YYYY-MM-DD");
  //   if (dateQuery) {
  //     setDate(date);
  //   } else {
  //     const todayDate = moment().tz(timezone).format("YYYY-MM-DD");
  //     setDate(todayDate);
  //   }
  // }, [dateQuery]);

  useEffect(() => {
    // This effect checks if the ref is available and updates isRefAvailable accordingly.
    const checkRefAvailability = () => {
      setIsRefAvailable(!!parentRef.current);
    };

    checkRefAvailability();
    // Optionally, listen to resize events or other events that might affect the ref's availability
    window.addEventListener("resize", checkRefAvailability);
    return () => window.removeEventListener("resize", checkRefAvailability);
  }, []);

  const events = useMemo(
    () =>
      [
        ...tasks.map((task) => ({
          ...task,
          type: "task" as const,
          assignedUsers: [],
        })),
        ...appointments.map((appointment) => {
          const { appointmentUsers, ...appointmentData } = appointment;
          return {
            ...appointmentData,
            type: "appointment" as const,
            assignedUsers: appointmentUsers.map(
              (appointmentUser) => appointmentUser.user,
            ),
          };
        }),
      ]
        .map((event) => {
          const taskStartTime = moment(event.startTime, "HH:mm").format("h A");
          const taskEndTime = moment(event.endTime, "HH:mm").format("h A");

          // Find the rowStartIndex and rowEndIndex by looping through the rows array
          const rowStartIndex = rows.findIndex((row) => row === taskStartTime);
          const rowEndIndex = rows.findIndex((row) => row === taskEndTime);

          // Return the task with the rowStartIndex and rowEndIndex
          return { ...event, rowStartIndex, rowEndIndex };
        })
        .sort((a, b) => {
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
        }),
    [tasks, appointments, date],
  );
  // drop event handler
  const handleDrop = useCallback(
    async (event: React.DragEvent, rowIndex: number) => {
      const startTime = formatTime(rows[rowIndex]);
      const endTime = formatTime(rows[rowIndex + 1]);

      // Get the task type
      const attributeData = event.dataTransfer.getData("text/plain").split("|");
      const type = attributeData[0];
      if (rows[rowIndex] === "All Day") return;

      if (type === "task") {
        // Get the id of the task from the dataTransfer object
        const taskId = parseInt(attributeData[1]);
        // Find the task in your state
        let oldTask = tasks.find((task) => task.id === taskId);
        if (!oldTask) {
          oldTask = (await getTaskById(taskId, {
            select: {
              id: true,
              startTime: true,
              endTime: true,
              date: true,
            },
          })) as Task | undefined;
        }
        const taskFoundWithoutTime = !oldTask?.startTime && !oldTask?.endTime;
        if (taskFoundWithoutTime && oldTask) {
          taskMutation.mutate({
            id: oldTask.id,
            date: new Date(date.format("YYYY-MM-DD")),
            startTime: startTime,
            endTime: endTime,
            timezone: timezone,
          });

          setUpdateVariable();
          setDate(date.format("YYYY-MM-DD"));
        } else {
          const { newStartTime, newEndTime } = updateTimeSpace(
            oldTask?.startTime as string,
            oldTask?.endTime as string,
            rows[rowIndex],
          );
          if (oldTask) {
            taskMutation.mutate({
              id: oldTask.id,
              date: new Date(
                oldTask.date ? oldTask.date : date.format("YYYY-MM-DD"),
              ),
              startTime: newStartTime,
              endTime: newEndTime,
              timezone: timezone,
            });

            setUpdateVariable();
          }
        }
      } else if (type === "appointment") {
        // Get the id of the appointment from the dataTransfer object
        const appointmentId = parseInt(attributeData[1]);
        // Find the appointment in your state
        const oldAppointment = appointments.find(
          (appointment) => appointment.id === appointmentId,
        );
        const { newStartTime, newEndTime } = updateTimeSpace(
          oldAppointment?.startTime as string,
          oldAppointment?.endTime as string,
          rows[rowIndex],
        );
        if (oldAppointment) {
          appointmentMutation.mutate({
            id: oldAppointment.id,
            date: oldAppointment.date as Date | string,
            startTime: newStartTime,
            endTime: newEndTime,
            timezone: timezone,
          });
          setUpdateVariable();
        }
      }
    },
    [tasks, appointments, date, rows, setUpdateVariable],
  );

  //scrolling till settings.dayStart
  const containerRef = useRef<any>(null);

  const hasScrolledRef = useRef(false);

  useEffect(() => {
    const scrollToStartTime = () => {
      if (!containerRef.current) return;

      if (startTime) {
        const formattedTime = moment(startTime, "HH:mm").format("h A");
        const timeIndex = rows.findIndex((row) => row === formattedTime);

        if (timeIndex !== -1) {
          const scrollPosition = timeIndex * 75;
          containerRef.current.scrollTo({
            top: scrollPosition,
            behavior: "smooth",
          });

          // Mark only after successful scroll
          hasScrolledRef.current = true;

          setTimeout(() => {
            setStartTime(null);
          }, 600);

          return;
        }
      }

      if (!startTime && !hasScrolledRef.current) {
        const startTimeIndex = rows.findIndex(
          (row) => formatTime(row) === settings?.dayStart,
        );

        if (startTimeIndex !== -1) {
          const scrollPosition = startTimeIndex * 75;
          containerRef.current.scrollTo({
            top: scrollPosition,
            behavior: "smooth",
          });

          hasScrolledRef.current = true;
        }
      }
    };

    scrollToStartTime();
  }, [rows, settings?.dayStart, startTime]);
  /**
   * Calculates the left CSS position for a task in a row.
   */
  const calculateLeftPosition = useCallback(
    (taskIndex: number, tasksInRowLength: number) => {
      if (parentRef.current) {
        const parentWidth = parentRef.current.offsetWidth;
        const distributionPercentage = (90 / tasksInRowLength) * taskIndex;
        const shiftPercentage = (110 / parentWidth) * 100;
        return `calc(${distributionPercentage}% + ${shiftPercentage}%)`;
      }
      return "0%"; // Default fallback
    },
    [],
  );

  return (
    <div
      ref={mergeRefs(dropRef, parentRef, containerRef)}
      className="relative mt-3 h-[90%] overflow-auto"
    >
      {isDataLoading ? (
        <>
          {Array.from({ length: 24 }).map((_, index) => (
            <div key={`row-skeleton-${index}`} className="relative">
              {/* Time label skeleton  */}
              <div
                className={`absolute flex h-full w-[100px] items-center justify-center ${
                  index === 0 ? "-top-6" : "-top-[37.5px]"
                }`}
              >
                <Skeleton.Button active size="small" className="!w-16 !h-4" />
              </div>

              {/* Row button skeleton */}
              <div
                className={`ml-[85px] h-[75px] border-neutral-200 ${
                  index !== rows.length && "border-b border-l"
                } ${index !== 0 ? "" : "border-t"}`}
                style={{
                  width: "calc(100% - 85px)",
                  backgroundColor: "#f2f2f2",
                }}
              >
                <Skeleton.Button
                  active
                  size="large"
                  className="!w-full !h-full !bg-gray-200"
                  style={{ borderRadius: "0px" }}
                />
              </div>
            </div>
          ))}
        </>
      ) : (
        <>
          {rows.map((row, i) => (
            <DayRow
              key={i}
              row={row}
              rows={rows}
              index={i}
              onDrop={handleDrop}
              date={date}
            />
          ))}

          {/* Tasks */}
          {events.map((event, index) => {
            const eventStartTime = moment(event.startTime, "HH:mm");
            const eventEndTime = moment(event.endTime, "HH:mm");

            const isEventEndNextDay = doesTaskOrAppointmentEndNextDay(
              eventStartTime,
              eventEndTime,
            );

            const dayEnd = moment("23:59", "HH:mm");

            const tasksInRow = events.filter((task) => {
              const taskStartTime = moment(task.startTime, "HH:mm");
              const taskEndTime = moment(task.endTime, "HH:mm");
              const isTaskEndNextDay = doesTaskOrAppointmentEndNextDay(
                taskStartTime,
                taskEndTime,
              );
              if (
                event.rowStartIndex === task.rowStartIndex ||
                (eventStartTime.isBefore(taskEndTime) &&
                  eventEndTime.isAfter(taskStartTime)) ||
                (isEventEndNextDay &&
                  eventStartTime.isBefore(taskEndTime) &&
                  dayEnd.isAfter(taskStartTime)) ||
                (isTaskEndNextDay &&
                  eventStartTime.isBefore(dayEnd) &&
                  eventEndTime.isAfter(taskStartTime))
              ) {
                return true;
              }
            });

            const taskIndex = tasksInRow.findIndex((task) => {
              if (task.id === event.id && task.type === event.type) {
                return true;
              }
            });

            return (
              <DayTask
                key={index}
                isDragOver={isOver}
                rowsLength={rows.length}
                totalTaskInRow={tasksInRow.length}
                calculateLeftPosition={calculateLeftPosition(
                  taskIndex,
                  tasksInRow.length,
                )}
                event={event}
                isRefAvailable={isRefAvailable}
              />
            );
          })}
        </>
      )}
    </div>
  );
}
