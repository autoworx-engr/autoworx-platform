"use client";
import { assignAppointmentDate } from "@/actions/appointment/assignAppointmentDate";
import { dragTask } from "@/actions/task/dragTask";
import getTaskById from "@/actions/task/getTaskById";
import {
  Tooltip,
  TooltipContent,
  TooltipPortal,
  TooltipTrigger,
} from "@/components/Tooltip";
import { cn } from "@/lib/cn";
import { TASK_COLOR } from "@/lib/consts";
import { useCalendarStore } from "@/stores/calendarStore";
import type { CalendarAppointment, CalendarTask } from "@/types/db";
import { EmployeeType, type Holiday, type Task } from "@prisma/client";
import moment from "moment";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useDrop } from "react-dnd";
import CalendarTooltip from "../CalendarTooltip";

import { Skeleton } from "antd";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import getHoliday from "@/actions/task/getHoliday";
import { useState } from "react";
import { X } from "lucide-react";
import { AppointmentCreateOrEdit } from "@/components/appointment/AppointmentCreateOrEdit";
import TaskCreateOrEdit from "@/components/task/TaskCreateOrEdit";
import useMonth from "@/app/(dashboard)/dashboard/task/_hook/lib/useMonth";
import useSettingsQuery from "@/app/(dashboard)/dashboard/task/_hook/settings/query/useSettingsQuery";
import {
  appointmentQueryKey,
  calenderQueryKey,
  taskQueryKey,
} from "@/app/(dashboard)/dashboard/task/_constant";
import useAppointmentQueryByMonth from "@/app/(dashboard)/dashboard/task/_hook/appointment/query/useAppointmentQueryByMonth";
import useTaskQueryByMonth from "@/app/(dashboard)/dashboard/task/_hook/task/query/useTaskQueryByMonth";
import { getDayNumber } from "@/app/(dashboard)/dashboard/task/_utils/utils.DateSelector";
import useRotatedDays from "@/app/(dashboard)/dashboard/task/_hook/lib/useRotatedDays";
import HolidayDeleteConfirmation from "@/app/(dashboard)/dashboard/task/_component/fullcalendar/HolidayDeleteConfirmation";

// Gradient priority classes for tasks
const priorityClasses = {
  Low: "bg-gradient-to-r from-blue-500 to-indigo-600 shadow-indigo-600/50",
  Medium: "bg-gradient-to-r from-cyan-600 to-blue-500 shadow-cyan-600/50",
  High: "bg-gradient-to-r from-teal-700 to-green-700 shadow-teal-700/50",
};

export default function Month() {
  const { setDate, setNavigating } = useCalendarStore((state) => ({
    setDate: state.setDate,
    setNavigating: state.setNavigating,
  }));

  const month = useMonth();
  const formattedMonth = month
    ? moment(month, "YYYY-MM").format("MMMM")
    : moment().format("MMMM");

  const formattedYear = month
    ? moment(month, "YYYY-MM").year()
    : moment().year();
  const { data: settings } = useSettingsQuery();
  // const { data: holidays = [] } = useHolidaysQuery(
  //   formattedMonth,
  //   formattedYear
  // );

  const router = useRouter();
  const { data: session } = useSession();
  const [openTooltipId, setOpenTooltipId] = useState<number | string | null>(
    null,
  );
  const [openListIndex, setOpenListIndex] = useState<number | null>(null);

  const [isAppointmentModalOpen, setIsAppointmentOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);

  const authUser = session?.user;
  const {
    data: holidays,
    isLoading,
    isError,
  } = useQuery({
    queryKey: [calenderQueryKey.holidays],
    queryFn: async () => {
      if (!authUser?.companyId) return [];
      const companyId = authUser?.companyId;
      const holidays = await getHoliday(companyId);
      return holidays;
    },
  });

  // Fetch tasks for the current month
  const { data: tasks = [], isLoading: isTasksLoading } = useTaskQueryByMonth(
    formattedMonth,
    formattedYear,
  );

  // Fetch appointment for the current month
  const { data: appointments = [], isLoading: isAppointmentsLoading } =
    useAppointmentQueryByMonth(formattedMonth, formattedYear);

  const isAdmin = session?.user.employeeType === EmployeeType.Admin;

  const startDay = settings?.weekStart ? getDayNumber(settings?.weekStart) : 0;

  const rotatedDays = useRotatedDays(startDay);

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

  const today = new Date();

  const startOfMonth = moment(month).startOf("month").toDate();
  const endOfMonth = moment(month).endOf("month").toDate();

  // Initialize an array to hold the dates
  const dates: [
    Date | null,
    CalendarTask[],
    CalendarAppointment[],
    Partial<Holiday>[],
  ][] = [];

  // Generate the dates to display
  let currentDate = startOfMonth;

  // check total offset date for this month
  const offset = (currentDate.getDay() - startDay + 7) % 7;

  for (let i = 0; i < offset; i++) {
    dates.push([null, [], [], []]);
  }

  currentDate = startOfMonth; // Reset to the start of the month

  while (currentDate <= endOfMonth) {
    const tasks = getTasks(currentDate);
    const appointments = getAppointments(currentDate);
    const holidays = getHolidays(currentDate);
    dates.push([currentDate, tasks as any, appointments as any, holidays]);
    currentDate = moment(currentDate).add(1, "days").toDate();
  }

  while (dates.length % 7 !== 0) {
    dates.push([null, [], [], []]); // Filling remaining empty days
  }

  while (dates.length < 35) {
    dates.push([null, [], [], []]); // Ensure 5 rows of 7 days means 35 days
  }

  function getTasks(date: Date) {
    return tasks.filter((task) => {
      // Extract task date in UTC, ignoring time zone
      const taskDateString = task?.date?.toISOString().split("T")[0];

      // Convert current date to UTC string (ignoring time zone)
      const currDateString = date.toLocaleDateString("en-CA"); // This gives you 'YYYY-MM-DD' format directly

      return taskDateString === currDateString;
    });
  }

  function getAppointments(date: Date) {
    return appointments.filter((appointment) => {
      // Extract appointment date in UTC, ignoring time zone
      const appointmentDateString = appointment?.date
        ?.toISOString()
        .split("T")[0];

      // Convert current date to UTC string (ignoring time zone)
      const currDateString = date.toLocaleDateString("en-CA"); // 'YYYY-MM-DD' format

      return appointmentDateString === currDateString;
    });
  }

  function getHolidays(date: Date) {
    const currDateLocal = date.toLocaleDateString("en-CA"); // e.g. '2025-04-07'

    const holiday = holidays?.find((holiday: any) => {
      const holidayDateLocal = new Date(holiday.date).toLocaleDateString(
        "en-CA",
      );
      return holidayDateLocal === currDateLocal;
    });

    return holiday ? [holiday] : [];
  }

  const cells = [...rotatedDays, ...dates];

  async function handleDrop(event: React.DragEvent, date: string) {
    // 10 am
    const startTime = "10:00";
    // 6 pm
    const endTime = "18:00";

    // Get the task type
    const type = event.dataTransfer.getData("text/plain").split("|")[0];

    if (type === "tag") {
      const tag = event.dataTransfer.getData("text/plain").split("|")[1];

      // TODO: Add tag to the task
    } else if (type === "task") {
      // Get the id of the task from the dataTransfer object
      const taskId = parseInt(
        event.dataTransfer.getData("text/plain").split("|")[1],
      );

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
      // Find the task in your state
      const taskFoundWithoutTime = !oldTask?.startTime && !oldTask?.endTime;
      //   const task = tasksWithoutTime.find((task) => task.id === taskId);

      if (taskFoundWithoutTime && oldTask) {
        // Add task to database
        await dragTask({
          id: oldTask.id,
          date: new Date(date),
          startTime,
          endTime,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
      }
    } else {
      // Get the id of the appointment from the dataTransfer object
      const appointmentId = parseInt(
        event.dataTransfer.getData("text/plain").split("|")[1],
      );

      // Find the appointment in your state
      const appointment = appointments.find(
        (appointment) => appointment.id == appointmentId,
      );

      if (appointment) {
        // Add appointment to database
        await assignAppointmentDate({
          id: appointment.id,
          date,
          startTime,
          endTime,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
      }
    }
  }
  const handleRedirectToDay = (date: Date | string) => {
    // Convert Date object to string to avoid timezone issues
    const dateString =
      date instanceof Date
        ? date.toLocaleDateString("en-CA") // 'YYYY-MM-DD' format
        : moment(date).format("YYYY-MM-DD");

    // Set navigation flag to prevent reset, then set date and navigate
    setNavigating(true);
    setDate(dateString);
    router.push("/dashboard/task/day");

    // Clear navigation flag after a short delay to allow navigation to complete
    // setTimeout(() => setNavigating(false), 30000);
  };
  const clientTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const queryClient = useQueryClient();
  const revalidateTaskQueries = () => {
    // Invalidate queries for tasks based on the current month and year
    queryClient.invalidateQueries({
      queryKey: [taskQueryKey.allTasks, formattedMonth, formattedYear],
    });
  };

  const revalidateAppointmentQueries = () => {
    // Invalidate queries for appointments based on the current month and year
    queryClient.invalidateQueries({
      queryKey: [
        appointmentQueryKey.allAppointments,
        formattedMonth,
        formattedYear,
      ],
    });
  };

  if (isTasksLoading || isAppointmentsLoading) {
    return (
      <div className="mt-3 border-l border-t border-neutral-200">
        <div className="flex w-full">
          {/* Header skeleton */}
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="flex w-full items-center justify-center border-b border-r border-neutral-200 p-2"
            >
              <Skeleton.Button
                active
                size="small"
                style={{
                  width: "60px",
                  height: "20px",
                }}
              />
            </div>
          ))}
        </div>

        {/* Calendar grid skeleton */}
        <div className="grid h-[93%] grid-cols-7 grid-rows-5 xl:h-[95%]">
          {Array.from({ length: 35 }).map((_, index) => (
            <div
              key={index}
              className="relative flex h-full flex-col border-b border-r border-neutral-200 p-2"
            >
              {/* Date number skeleton */}
              <div className="flex justify-end">
                <div className="my-0.5 flex h-32 w-8 items-start justify-center">
                  <Skeleton.Button
                    active
                    size="small"
                    style={{
                      width: "20px",
                      height: "20px",
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 border-l border-t border-neutral-200" ref={dropRef}>
      <div className="flex w-full">
        {/* cells 0-6 */}
        {cells.slice(0, 7).map((cell, i) => (
          <div
            key={i}
            className="flex w-full items-center justify-center border-b border-r border-neutral-200 p-2 text-[17px] font-bold text-[#797979] md:text-[13px] lg:text-[15px] xl:text-[17px]"
          >
            {cell.toLocaleString("en-US", { timeZone: clientTimezone })}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid h-[93%] grid-cols-7 grid-rows-5 xl:h-[95%]">
        {/* Date cells (7-41) */}
        {cells.slice(7).map((cell: any, index) => {
          // Check if this date has any holidays
          const isHoliday = cell[3] && cell[3].length > 0;

          return (
            <Tooltip
              key={index}
              open={openListIndex === index}
              onOpenChange={() => {}}
            >
              <TooltipTrigger
                type="button"
                className={cn(
                  "relative flex h-full cursor-default flex-col border-b border-r border-neutral-200 p-2",
                )}
                onClick={(event) => {
                  if (
                    cell[0] &&
                    event.target instanceof Node &&
                    event.currentTarget.contains(event.target)
                  ) {
                    // Convert Date object to string to avoid timezone issues
                    const dateString =
                      cell[0] instanceof Date
                        ? cell[0].toLocaleDateString("en-CA") // 'YYYY-MM-DD' format
                        : moment(cell[0]).format("YYYY-MM-DD");

                    // Set navigation flag to prevent reset, then set date and navigate
                    setNavigating(true);
                    setDate(dateString);
                    router.push("/dashboard/task/day");

                    // Clear navigation flag after a short delay to allow navigation to complete
                    // setTimeout(() => setNavigating(false), 30000);
                  }
                }}
                onDrop={(event) => {
                  // Convert Date object to string to avoid timezone issues
                  const dateString = cell[0]
                    ? cell[0] instanceof Date
                      ? cell[0].toLocaleDateString("en-CA") // 'YYYY-MM-DD' format
                      : moment(cell[0]).format("YYYY-MM-DD")
                    : "";
                  handleDrop(event, dateString);
                }}
                onDragOver={(event) => event.preventDefault()}
              >
                {/* Date number */}
                <div className="flex justify-end">
                  <div
                    className={cn(
                      "my-0.5 flex h-8 w-8 items-center justify-center rounded-full text-[20px] font-bold md:text-[15px] lg:text-[20px] xl:text-[23px]",
                      today.getFullYear() === cell[0]?.getFullYear() &&
                        today.getMonth() === cell[0]?.getMonth() &&
                        today.getDate() === cell[0]?.getDate()
                        ? "text-[#6571FF]"
                        : "text-[#797979]",
                    )}
                  >
                    {cell[0]?.getDate() || ""}
                  </div>
                </div>

                {/* Vertical appointment and task display */}
                {cell[0] && (
                  <div className="mt-2 flex flex-col space-y-1 overflow-hidden">
                    {/* Appointments */}
                    {cell[2]
                      .slice(0, 1)
                      .map((appointment: CalendarAppointment, i: number) => {
                        const eventKey = `appointment-${appointment.id}-${index}-${i}`;
                        const isTooltipOpen = openTooltipId === eventKey;
                        return (
                          <Tooltip
                            key={eventKey}
                            open={isTooltipOpen}
                            onOpenChange={() => {}}
                          >
                            <TooltipTrigger asChild>
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // handleRedirectToDay(cell[0]);
                                  setOpenTooltipId(
                                    isTooltipOpen ? null : eventKey,
                                  );
                                }}
                                className="cursor-pointer truncate rounded border px-1 py-0.5 text-xs text-slate-700 lg:block xl:text-sm"
                              >
                                {appointment.title}
                              </div>
                            </TooltipTrigger>
                            {isTooltipOpen && (
                              <CalendarTooltip
                                event={
                                  { ...appointment, type: "appointment" } as any
                                }
                                onClose={() => setOpenTooltipId(null)}
                                onEditOpen={() => {
                                  setSelectedEventId(appointment.id);
                                  setIsAppointmentOpen(true);
                                  setOpenTooltipId(null);
                                }}
                              />
                            )}
                          </Tooltip>
                        );
                      })}

                    {/* Tasks */}
                    {cell[1]
                      ?.slice(0, 1)
                      .map((task: CalendarTask, i: number) => {
                        const taskPriorityClass =
                          priorityClasses[
                            task.priority as keyof typeof priorityClasses
                          ] || priorityClasses.Low;
                        const eventKey = `task-${task.id}-${index}-${i}`;
                        const isTooltipOpen = openTooltipId === eventKey;
                        return (
                          <Tooltip
                            key={eventKey}
                            open={isTooltipOpen}
                            onOpenChange={() => {}}
                          >
                            <TooltipTrigger asChild>
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // handleRedirectToDay(cell[0]);
                                  setOpenTooltipId(
                                    isTooltipOpen ? null : eventKey,
                                  );
                                }}
                                className={cn(
                                  "cursor-pointer truncate rounded px-1 py-2 text-xs text-white lg:block lg:text-sm transition-all duration-300 ease-in-out hover:shadow-lg hover:scale-[1.01]",
                                  taskPriorityClass,
                                )}
                              >
                                {task.title}
                              </div>
                            </TooltipTrigger>
                            {isTooltipOpen && (
                              <CalendarTooltip
                                event={{ ...task, type: "task" } as any}
                                onClose={() => setOpenTooltipId(null)}
                                onEditOpen={() => {
                                  setSelectedEventId(task.id);
                                  setIsTaskModalOpen(true);
                                  setOpenTooltipId(null);
                                }}
                              />
                            )}
                          </Tooltip>
                        );
                      })}

                    {cell[0] && !cell[2].length && cell[1].length > 2 && (
                      <div>
                        {(() => {
                          const moreTasksLeft = (cell[1]?.length || 0) - 2;
                          if (moreTasksLeft > 0) {
                            return (
                              <button
                                className="text-center py-1 w-full text-xs font-normal text-slate-500"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setOpenListIndex(index);
                                  // Follow same behavior as appointments 'more'
                                  // if (
                                  //   event.target instanceof Node &&
                                  //   event.currentTarget.contains(event.target)
                                  // ) {
                                  //   const dateString =
                                  //     cell[0] instanceof Date
                                  //       ? cell[0].toLocaleDateString("en-CA")
                                  //       : moment(cell[0]).format("YYYY-MM-DD");
                                  //   setNavigating(true);
                                  //   setDate(dateString);
                                  //   setTimeout(() => setNavigating(false), 30000);
                                  // }
                                  // router.push("/dashboard/task/day");
                                }}
                              >
                                +{moreTasksLeft} more...
                              </button>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    )}

                    {cell[0] && (
                      <div>
                        {cell[2]
                          .slice(0, 1)
                          .map(
                            (appointment: CalendarAppointment, i: number) => {
                              const moreLeft = Math.max(0, cell[2].length - 1);
                              const moreTasksLeft = Math.max(
                                0,
                                (cell[1]?.length || 0) - 1,
                              );
                              const totalLeft = moreLeft + moreTasksLeft;

                              return (
                                <Tooltip key={i} open={openListIndex === i}>
                                  {moreLeft > 0 && (
                                    <button
                                      className="text-center  w-full py-1 text-xs font-normal text-slate-500"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setOpenListIndex(index);
                                        // Navigation on '+more' click is disabled; list opens inline instead
                                        // if (
                                        //   event.target instanceof Node &&
                                        //   event.currentTarget.contains(
                                        //     event.target
                                        //   )
                                        // ) {
                                        //   const dateString =
                                        //     cell[0] instanceof Date
                                        //       ? cell[0].toLocaleDateString(
                                        //           "en-CA"
                                        //         )
                                        //       : moment(cell[0]).format(
                                        //           "YYYY-MM-DD"
                                        //         );
                                        //   setNavigating(true);
                                        //   setDate(dateString);
                                        //   setTimeout(
                                        //     () => setNavigating(false),
                                        //     30000
                                        //   );
                                        // }
                                        // router.push("/dashboard/task/day");
                                      }}
                                    >
                                      +{totalLeft} more...
                                    </button>
                                  )}
                                </Tooltip>
                              );
                            },
                          )}
                      </div>
                    )}
                  </div>
                )}
                {/* holidays button */}
                {cell[3].map(
                  (holiday: Holiday) =>
                    holiday?.id && (
                      <div
                        key={holiday.id}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onMouseMove={(e) => e.stopPropagation()}
                        className={cn(
                          "app-shadow items-center justify-center gap-x-2 rounded-md !bg-[#006D77] px-3 py-1 text-left text-lg font-semibold text-white md:flex",
                          holiday?.id ? "z-20" : "z-10",
                          cell[1].length || cell[2].length
                            ? "-bottom-12"
                            : "-bottom-24",
                        )}
                      >
                        <span className="block lg:hidden">H</span>{" "}
                        {/* Small screens */}
                        <span className="hidden lg:block">Holiday</span>{" "}
                        {/* Medium and up */}
                        {isAdmin && (
                          <HolidayDeleteConfirmation
                            holidayId={holiday.id}
                            isMonthly={true}
                          />
                        )}
                      </div>
                    ),
                )}
              </TooltipTrigger>

              <TooltipPortal>
                {/* Large list shows only when '+more' clicked */}
                {openListIndex === index && (
                  <TooltipContent>
                    <div className="relative max-h-[350px] w-[350px] overflow-y-scroll">
                      {/* Close button – top-right corner */}
                      <button
                        aria-label="Close list"
                        className="absolute right-2 top-2 rounded p-1 text-slate-500 hover:text-slate-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenListIndex(null);
                        }}
                      >
                        <X size={18} />
                      </button>
                      {/* Tasks section */}
                      {cell[1]?.length > 0 && (
                        <>
                          <h3 className="text-lg font-bold">Tasks</h3>
                          <div className="flex flex-col gap-1">
                            {cell[1]
                              ?.slice(1)
                              .map((task: CalendarTask, i: number) => {
                                const taskPriorityClass =
                                  priorityClasses[
                                    task.priority as keyof typeof priorityClasses
                                  ] || priorityClasses.Low;
                                const eventKey = `list-task-${task.id}-${index}-${i}`;
                                const isTooltipOpen =
                                  openTooltipId === eventKey;
                                return (
                                  <div
                                    key={eventKey}
                                    // open={isTooltipOpen}
                                    // onOpenChange={() => {}}
                                    className="relative"
                                  >
                                    <div>
                                      <div
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setOpenTooltipId(
                                            isTooltipOpen ? null : eventKey,
                                          );
                                        }}
                                        className={cn(
                                          "flex cursor-pointer items-center gap-2 rounded p-2 text-white transition-all duration-300 ease-in-out",
                                          taskPriorityClass,
                                        )}
                                      >
                                        <p className="text-left w-full">
                                          {task.title}
                                        </p>
                                      </div>
                                    </div>
                                    {isTooltipOpen && (
                                      <CalendarTooltip
                                        event={{ ...task, type: "task" } as any}
                                        onClose={() => setOpenTooltipId(null)}
                                        onEditOpen={() => {
                                          setSelectedEventId(task.id);
                                          setIsTaskModalOpen(true);
                                          setOpenTooltipId(null);
                                          setOpenListIndex(null);
                                        }}
                                      />
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        </>
                      )}

                      {/* Appointments section */}
                      {cell[2]?.length > 0 && (
                        <>
                          <div className="mt-3 flex items-center justify-between">
                            <h3 className="text-lg font-bold">Appointments</h3>
                          </div>
                          <div className="flex flex-col gap-1">
                            {cell[2]
                              ?.slice(1)
                              .map(
                                (
                                  appointment: CalendarAppointment,
                                  i: number,
                                ) => {
                                  const eventKey = `list-appointment-${appointment.id}-${index}-${i}`;
                                  const isTooltipOpen =
                                    openTooltipId === eventKey;
                                  return (
                                    <div
                                      key={eventKey}
                                      // open={isTooltipOpen}
                                      // onOpenChange={() => {}}
                                      className="relative"
                                    >
                                      <div>
                                        <div
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenTooltipId(
                                              isTooltipOpen ? null : eventKey,
                                            );
                                          }}
                                          className="flex cursor-pointer items-center gap-2 rounded bg-gray-600 p-2 text-white"
                                        >
                                          <p className="text-left w-full">
                                            {appointment.title}
                                          </p>
                                        </div>
                                      </div>
                                      {isTooltipOpen && (
                                        <CalendarTooltip
                                          event={
                                            {
                                              ...appointment,
                                              type: "appointment",
                                            } as any
                                          }
                                          onClose={() => setOpenTooltipId(null)}
                                          onEditOpen={() => {
                                            setSelectedEventId(appointment.id);
                                            setIsAppointmentOpen(true);
                                            setOpenTooltipId(null);
                                            setOpenListIndex(null);
                                          }}
                                        />
                                      )}
                                    </div>
                                  );
                                },
                              )}
                          </div>
                        </>
                      )}
                    </div>
                  </TooltipContent>
                )}
              </TooltipPortal>
            </Tooltip>
          );
        })}
      </div>
      {isAppointmentModalOpen && selectedEventId && (
        <AppointmentCreateOrEdit
          fromEdit
          appointmentId={selectedEventId}
          isModalOpen={isAppointmentModalOpen}
          setIsModalOpen={setIsAppointmentOpen}
          onAppointmentUpdated={revalidateAppointmentQueries}
          onAppointmentDeleted={revalidateAppointmentQueries}
        />
      )}

      {isTaskModalOpen && selectedEventId && (
        <TaskCreateOrEdit
          fromEdit
          taskId={selectedEventId}
          isModalOpen={isTaskModalOpen}
          setIsModalOpen={setIsTaskModalOpen}
          onTaskUpdated={revalidateTaskQueries}
          onTaskDelete={revalidateTaskQueries}
        />
      )}
    </div>
  );
}
