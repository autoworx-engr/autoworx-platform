"use client";
import {
  Tooltip,
  TooltipContent,
  TooltipPortal,
  TooltipTrigger,
} from "@/components/Tooltip";
import { cn } from "@/lib/cn";
import { TASK_COLOR } from "@/lib/consts";
import { usePopupStore } from "@/stores/popup";
import type {
  AppointmentFull,
  CalendarAppointment,
  CalendarTask,
} from "@/types/db";
import {
  EmployeeType,
  type CalendarSettings,
  type Client,
  type EmailTemplate,
  type Holiday,
  type Task,
  type User,
  type Vehicle,
} from "@prisma/client";
import moment from "moment";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDrop } from "react-dnd";
import { FaPen } from "react-icons/fa6";
import { assignAppointmentDate } from "@/actions/appointment/assignAppointmentDate";
import { dragTask } from "@/actions/task/dragTask";
import { useEffect, useState } from "react";
import { useCalendarStore } from "@/stores/calendarStore";
import { setDate } from "date-fns";
import HolidayDeleteConfirmation from "./HolidayDeleteConfiramtion";

function useMonth() {
  const { month, setDate } = useCalendarStore();

  const parsedMonth = moment(month, moment.HTML5_FMT.MONTH, true);
  return parsedMonth.isValid() ? parsedMonth : moment();
}

function rotatedDays(startDay: number) {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [daysOfWeek, setDaysOfWeek] = useState<string[]>([]);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    const updateDaysOfWeek = () => {
      setDaysOfWeek(
        window.innerWidth < 640
          ? ["S", "M", "T", "W", "T", "F", "S"]
          : window.innerWidth < 1024
            ? ["Sun", "Mon", "Tue", "Wed", "Thur", "Fri", "Sat"]
            : [
                "Sunday",
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
              ],
      );
    };

    updateDaysOfWeek(); // Set initial value
    window.addEventListener("resize", updateDaysOfWeek);

    return () => window.removeEventListener("resize", updateDaysOfWeek);
  }, []);

  // Rotate the daysOfWeek array based on the selected start day
  const rotatedDays = daysOfWeek
    .slice(startDay)
    .concat(daysOfWeek.slice(0, startDay));
  return rotatedDays;
}

function getDayNumber(dayName: string) {
  const dayNumber = moment().day(dayName).day(); // `day()` accepts the day name
  return isNaN(dayNumber) ? -1 : dayNumber;
}

export default function Month({
  tasks,
  companyUsers,
  tasksWithoutTime,
  appointments,
  appointmentsFull,
  holidays,
  customers,
  vehicles,
  settings,
  templates,
}: {
  tasks: CalendarTask[];
  companyUsers: User[];
  tasksWithoutTime: Task[];
  appointments: CalendarAppointment[];
  holidays: Partial<Holiday>[];
  appointmentsFull: AppointmentFull[];
  customers: Client[];
  vehicles: Vehicle[];
  settings: CalendarSettings;
  templates: EmailTemplate[];
}) {
  const router = useRouter();
  const { data: session } = useSession();

  const { setDate, setNavigating } = useCalendarStore();

  const isAdmin = session?.user.employeeType === EmployeeType.Admin;

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
  const { open } = usePopupStore();

  const month = useMonth();
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
  const startDay = settings?.weekStart ? getDayNumber(settings?.weekStart) : 0;

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
    dates.push([currentDate, tasks, appointments, holidays]);
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
      const taskDateString = task.date.toISOString().split("T")[0];

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

    const holiday = holidays.find((holiday: any) => {
      const holidayDateLocal = new Date(holiday.date).toLocaleDateString(
        "en-CA",
      );
      return holidayDateLocal === currDateLocal;
    });

    return holiday ? [holiday] : [];
  }

  const cells = [...rotatedDays(startDay), ...dates];

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

      // Find the task in your state
      const task = tasksWithoutTime.find((task) => task.id === taskId);

      if (task) {
        // Add task to database
        await dragTask({
          id: task.id,
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
            <Tooltip key={index}>
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
                      .map((appointment: CalendarAppointment, i: number) => (
                        <Tooltip key={i}>
                          <TooltipTrigger asChild>
                            <div
                              onClick={() => handleRedirectToDay(cell[0])}
                              className="cursor-pointer truncate rounded border px-1 py-0.5 text-xs text-slate-700 lg:block xl:text-sm"
                            >
                              {appointment.title}
                            </div>
                          </TooltipTrigger>
                          <TooltipPortal>
                            <TooltipContent>
                              <div className="w-[300px] rounded-lg bg-background p-3">
                                <div className="flex items-center justify-between">
                                  <h3 className="font-semibold">
                                    {appointment.title}
                                  </h3>

                                  <button
                                    type="button"
                                    className="rounded-full bg-[#6571FF] p-2 text-white"
                                    onClick={() =>
                                      open("UPDATE_APPOINTMENT", {
                                        appointment: appointmentsFull.find(
                                          (a) => a.id === appointment.id,
                                        ),
                                        employees: companyUsers,
                                        customers,
                                        vehicles,
                                        templates,
                                        settings,
                                      })
                                    }
                                  >
                                    <FaPen className="mx-auto text-[10px]" />
                                  </button>
                                </div>

                                <p>
                                  Client: {appointment.client?.firstName}{" "}
                                  {appointment.client?.lastName}
                                </p>
                                <p>
                                  Email:
                                  <a
                                    href={`mailto:${appointment.client?.email}`}
                                    className="text-blue-500"
                                  >
                                    {appointment.client?.email}
                                  </a>
                                </p>
                                <p>
                                  Phone:
                                  <a
                                    href={`tel:${appointment.client?.mobile}`}
                                    className="cursor-pointer text-blue-500"
                                  >
                                    {appointment.client?.mobile}
                                  </a>
                                </p>

                                <p>
                                  Assigned To:{" "}
                                  {appointment.assignedUsers
                                    .slice(0, 1)
                                    .map(
                                      (user: User) =>
                                        `${user.firstName} ${user.lastName}`,
                                    )}
                                </p>

                                <p>
                                  {moment(
                                    appointment.startTime,
                                    "HH:mm",
                                  ).format("hh:mm A")}{" "}
                                  To{" "}
                                  {moment(appointment.endTime, "HH:mm").format(
                                    "hh:mm A",
                                  )}
                                </p>
                              </div>
                            </TooltipContent>
                          </TooltipPortal>
                        </Tooltip>
                      ))}

                    {/* Tasks */}
                    {cell[1]
                      ?.slice(0, 2)
                      .map((task: CalendarTask, i: number) => (
                        <Tooltip key={i}>
                          <TooltipTrigger asChild>
                            <div
                              onClick={() => handleRedirectToDay(cell[0])}
                              className="cursor-pointer truncate rounded px-1 py-2 text-xs text-white lg:block lg:text-sm"
                              style={{
                                backgroundColor: TASK_COLOR[task.priority],
                              }}
                            >
                              {/* {task.title} */}
                            </div>
                          </TooltipTrigger>
                          <TooltipPortal>
                            <TooltipContent>
                              <div className="w-[300px] rounded-lg bg-background p-3">
                                <div className="flex items-center justify-between">
                                  <h3 className="font-semibold">
                                    {task.title}
                                  </h3>

                                  <button
                                    type="button"
                                    className="rounded-full bg-[#6571FF] p-2 text-white"
                                    onClick={() =>
                                      open("UPDATE_TASK", {
                                        task,
                                        companyUsers,
                                      })
                                    }
                                  >
                                    <FaPen className="mx-auto text-[10px]" />
                                  </button>
                                </div>

                                <p className="mt-3">{task.description}</p>

                                <p className="mt-3">
                                  Task Priority: {task.priority}
                                </p>
                              </div>
                            </TooltipContent>
                          </TooltipPortal>
                        </Tooltip>
                      ))}

                    {cell[0] && (
                      <div>
                        {cell[2]
                          .slice(0, 1)
                          .map(
                            (appointment: CalendarAppointment, i: number) => {
                              const moreLeft = cell[2].length - 1;

                              return (
                                <Tooltip key={i}>
                                  {moreLeft > 0 && (
                                    <button
                                      className="text-left text-xs font-normal text-slate-500"
                                      onClick={(event) => {
                                        if (
                                          event.target instanceof Node &&
                                          event.currentTarget.contains(
                                            event.target,
                                          )
                                        ) {
                                          // Convert Date object to string to avoid timezone issues
                                          const dateString =
                                            cell[0] instanceof Date
                                              ? cell[0].toLocaleDateString(
                                                  "en-CA",
                                                ) // 'YYYY-MM-DD' format
                                              : moment(cell[0]).format(
                                                  "YYYY-MM-DD",
                                                );

                                          // Set navigation flag to prevent reset, then set date and navigate
                                          setNavigating(true);
                                          setDate(dateString);

                                          // Clear navigation flag after a short delay to allow navigation to complete
                                          setTimeout(
                                            () => setNavigating(false),
                                            30000,
                                          );
                                        }
                                        router.push("/dashboard/task/day");
                                      }}
                                    >
                                      +{moreLeft} more...
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
                {/* Large tooltip that shows more details when hovering */}
                {(cell[1]?.length || cell[2]?.length) && (
                  <TooltipContent>
                    <div className="max-h-[350px] w-[350px] overflow-y-scroll">
                      {/* Tasks section */}
                      {cell[1]?.length > 0 && (
                        <>
                          <h3 className="text-lg font-bold">Tasks</h3>
                          <div className="flex flex-col gap-1">
                            {cell[1]?.map((task: CalendarTask, i: number) => (
                              <div
                                key={i}
                                className="flex items-center gap-2 rounded p-2 text-white"
                                style={{
                                  backgroundColor: TASK_COLOR[task.priority],
                                }}
                              >
                                <p>{task.title}</p>
                              </div>
                            ))}
                          </div>
                        </>
                      )}

                      {/* Appointments section */}
                      {cell[2]?.length > 0 && (
                        <>
                          <h3 className="mt-3 text-lg font-bold">
                            Appointments
                          </h3>
                          <div className="flex flex-col gap-1">
                            {cell[2]?.map(
                              (appointment: CalendarAppointment, i: number) => (
                                <div
                                  key={i}
                                  className="flex items-center gap-2 rounded bg-gray-600 p-2 text-white"
                                >
                                  <p>{appointment.title}</p>
                                </div>
                              ),
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
    </div>
  );
}
