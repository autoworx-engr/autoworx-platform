"use client";
import { AppointmentCreateOrEdit } from "@/components/appointment/AppointmentCreateOrEdit";
import TaskCreateOrEdit from "@/components/task/TaskCreateOrEdit";
import useAppointmentQueryByWeek from "@/app/(dashboard)/dashboard/task/_hook/appointment/query/useAppointmentQueryByWeek";
import useTaskQueryByWeek from "@/app/(dashboard)/dashboard/task/_hook/task/query/useTaskQueryByWeek";
import { getWeekStartNumber } from "@/app/(dashboard)/dashboard/task/_utils/utils.DateSelector";
import { getCalenderSettings } from "@/actions/task/getCalendarSettings";
import { assignAppointmentDate } from "@/actions/appointment/assignAppointmentDate";
import { updateTask } from "@/actions/task/dragTask";
import { useCalendarStore } from "@/stores/calendarStore";
import { CalendarType } from "@/types/calendar";
import {
  EventClickArg,
  EventContentArg,
  EventDropArg,
} from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import moment from "moment";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarHeader } from "./CalendarHeader";
import { EventContent } from "./EventContent";
import { EventDetailsSheet } from "./EventDetailsSheet";
import useGetHolidays from "@/app/(dashboard)/dashboard/task/_hook/appointment/query/useGetHolidays";
import { useSession } from "next-auth/react";
import styles from "./fullcalendar.module.css";
import { buildCalendarEvents } from "./calendarEventMapper";
import useTaskQuery from "@/app/(dashboard)/dashboard/task/_hook/task/query/useTaskQuery";
import useAppointmentQuery from "@/app/(dashboard)/dashboard/task/_hook/appointment/query/useAppointmentQuery";
import {
  appointmentQueryKey,
  taskQueryKey,
} from "@/app/(dashboard)/dashboard/task/_constant";
import { errorToast } from "@/lib/toast";

export default function Calendar({ type }: { type: CalendarType }) {
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isTaskEditOpen, setIsTaskEditOpen] = useState(false);
  const [isAppointmentEditOpen, setIsAppointmentEditOpen] = useState(false);
  const [isCalendarLoading, setIsCalendarLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: moment().startOf("month").format("YYYY-MM-DD"),
    end: moment().endOf("month").format("YYYY-MM-DD"),
  });
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const calendarRef = useRef<FullCalendar>(null);
  const [view, setView] = useState(
    type === "list"
      ? "listWeek"
      : type === "month"
        ? "dayGridMonth"
        : type === "week"
          ? "timeGridWeek"
          : "timeGridDay",
  );

  // Use calendar store to sync date with header controls
  const { date } = useCalendarStore();

  const {
    data: settings,
    isLoading: isSettingsLoading,
    isFetching: isSettingsFetching,
  } = useQuery({
    queryKey: ["calendar-settings", "week-start"],
    queryFn: () => getCalenderSettings(),
  });

  const firstDay = useMemo(() => {
    const mappedDay = getWeekStartNumber(settings?.weekStart ?? "Monday");
    return mappedDay >= 0 ? mappedDay : 0;
  }, [settings?.weekStart]);

  const businessHours = useMemo(() => {
    if (!settings?.dayStart || !settings?.dayEnd) {
      return undefined;
    }

    return {
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      startTime: settings.dayStart,
      endTime: settings.dayEnd,
    };
  }, [settings]);

  const businessMinutes = useMemo(() => {
    if (!settings?.dayStart || !settings?.dayEnd) {
      return null;
    }

    const parseTimeToMinutes = (time: string) => {
      const [hour = 0, minute = 0] = time.split(":").map(Number);
      return hour * 60 + minute;
    };

    return {
      start: parseTimeToMinutes(settings.dayStart),
      end: parseTimeToMinutes(settings.dayEnd),
    };
  }, [settings]);

  const nonBusinessSlotClassNames = useCallback(
    (arg: { date?: Date }) => {
      if (!arg.date || !businessMinutes) {
        return [];
      }

      const currentMinutes = arg.date.getHours() * 60 + arg.date.getMinutes();
      const isNonBusinessSlot =
        currentMinutes < businessMinutes.start ||
        currentMinutes >= businessMinutes.end;

      return isNonBusinessSlot ? [styles.nonBusinessSlot] : [];
    },
    [businessMinutes],
  );

  const {
    data: tasks = [],
    isLoading: isTasksLoading,
    isFetching: isTasksFetching,
  } = useTaskQuery(dateRange.start, dateRange.end);
  const {
    data: appointments = [],
    isLoading: isAppointmentsLoading,
    isFetching: isAppointmentsFetching,
  } = useAppointmentQuery(dateRange.start, dateRange.end);
  const {
    data: holidays = [],
    isLoading: isHolidaysLoading,
    isFetching: isHolidaysFetching,
  } = useGetHolidays(session?.user?.companyId ?? 0);

  const loading =
    isCalendarLoading ||
    isSettingsLoading ||
    isSettingsFetching ||
    isTasksLoading ||
    isTasksFetching ||
    isAppointmentsLoading ||
    isAppointmentsFetching ||
    isHolidaysLoading ||
    isHolidaysFetching;

  const events = useMemo(() => {
    return buildCalendarEvents({
      appointments,
      tasks,
      holidays,
    });
  }, [tasks, appointments, holidays]);

  const eventType = selectedEvent?.extendedProps?.type;
  const originalData = selectedEvent?.extendedProps?.originalData;

  const taskId =
    eventType === "task"
      ? Number(
          originalData?.id ?? String(selectedEvent?.id).replace("task-", ""),
        )
      : undefined;

  const appointmentId =
    eventType === "appointment"
      ? Number(
          originalData?.id ?? String(selectedEvent?.id).replace("apt-", ""),
        )
      : undefined;

  const invalidateCalendarQueries = () => {
    queryClient.invalidateQueries({ queryKey: [taskQueryKey.allTasks] });
    queryClient.invalidateQueries({
      queryKey: [appointmentQueryKey.allAppointments],
    });
    queryClient.invalidateQueries({ queryKey: taskQueryKey.allTaskByScroll });
  };

  useEffect(() => {
    if (calendarRef.current && date) {
      calendarRef.current.getApi().gotoDate(date);
    }
  }, [date]);

  const handleEventClick = (info: EventClickArg) => {
    if (info.event.extendedProps?.type === "holiday") {
      return;
    }
    info.jsEvent.preventDefault();
    setSelectedEvent(info.event);
    setIsSheetOpen(true);
  };

  const handleEventDateTimeUpdate = async (
    info: EventDropArg | { event: EventDropArg["event"]; revert: () => void },
  ) => {
    const eventType = info.event.extendedProps?.type as
      | "task"
      | "appointment"
      | "holiday"
      | undefined;

    if (!eventType || eventType === "holiday") {
      info.revert();
      return;
    }

    const eventStart = info.event.start;
    if (!eventStart) {
      info.revert();
      return;
    }

    const eventEnd =
      info.event.end ?? moment(eventStart).add(1, "hour").toDate();
    const updatedDate = moment(eventStart).format("YYYY-MM-DD");
    const updatedStartTime = moment(eventStart).format("HH:mm");
    const updatedEndTime = moment(eventEnd).format("HH:mm");
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    try {
      if (eventType === "task") {
        const taskId = Number(String(info.event.id).replace("task-", ""));
        if (!taskId) {
          info.revert();
          return;
        }

        const result = await updateTask({
          id: taskId,
          date: new Date(updatedDate),
          startTime: updatedStartTime,
          endTime: updatedEndTime,
          timezone,
        });

        if (result.type !== "success") {
          info.revert();
          errorToast("Failed to update task date and time.");
          return;
        }

        queryClient.invalidateQueries({ queryKey: [taskQueryKey.allTasks] });
        return;
      }

      const appointmentId = Number(String(info.event.id).replace("apt-", ""));
      if (!appointmentId) {
        info.revert();
        return;
      }

      const result = await assignAppointmentDate({
        id: appointmentId,
        date: updatedDate,
        startTime: updatedStartTime,
        endTime: updatedEndTime,
        timezone,
      });

      if (result.type !== "success") {
        info.revert();
        errorToast("Failed to update appointment date and time.");
        return;
      }

      queryClient.invalidateQueries({
        queryKey: [appointmentQueryKey.allAppointments],
      });
    } catch (error) {
      info.revert();
      errorToast("Failed to update event date and time.");
    }
  };

  const handleDatesSet = (arg: any) => {
    setView(arg.view.type);

    let startStr: string;
    let endStr: string;

    if (arg.view.type === "dayGridMonth") {
      startStr = moment(arg.view.currentStart)
        .startOf("month")
        .format("YYYY-MM-DD");
      endStr = moment(arg.view.currentStart)
        .endOf("month")
        .format("YYYY-MM-DD");
    } else {
      // Week/Day/List => visible range
      startStr = moment(arg.start).format("YYYY-MM-DD");
      endStr = moment(arg.end - 1).format("YYYY-MM-DD");
    }

    setDateRange({ start: startStr, end: endStr });
  };

  // Map FullCalendar view to CalendarType for Header
  const getCalendarType = (v: string): CalendarType => {
    const lower = v.toLowerCase();
    if (lower.includes("list")) return "list";
    if (lower.includes("month")) return "month";
    if (lower.includes("week")) return "week";
    if (lower.includes("day")) return "day";
    return "week";
  };
  const renderEventContent = (eventInfo: EventContentArg, session: any) => {
    return <EventContent eventInfo={eventInfo} session={session} />;
  };

  return (
    <div
      className={`w-full h-full calendar-wrapper flex flex-col bg-white rounded-lg shadow-sm border ${styles.calendarScope}`}
    >
      <CalendarHeader calendarRef={calendarRef} type={getCalendarType(view)} />

      <div className={`flex-1 w-full relative ${styles.calendarBody}`}>
        <div className="w-full h-full overflow-x-auto">
          <div
            className={
              view === "timeGridDay" ? "min-w-[1000px] h-full" : "w-full h-full"
            }
          >
            <FullCalendar
              ref={calendarRef}
              plugins={[
                dayGridPlugin,
                timeGridPlugin,
                listPlugin,
                interactionPlugin,
              ]}
              initialView={view}
              headerToolbar={false}
              firstDay={firstDay}
              navLinks={true}
              editable={true}
              dayMaxEvents={5}
              eventClick={handleEventClick}
              eventDrop={handleEventDateTimeUpdate}
              eventResize={handleEventDateTimeUpdate}
              eventContent={(eventInfo) =>
                renderEventContent(eventInfo, session)
              }
              slotMinTime="00:00:00"
              slotMaxTime="24:00:00"
              scrollTime={settings?.dayStart}
              allDaySlot={true}
              expandRows={true}
              businessHours={businessHours}
              slotLaneClassNames={nonBusinessSlotClassNames}
              loading={setIsCalendarLoading}
              // dayMinWidth={180}
              slotLabelFormat={{
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              }}
              slotDuration="00:15:00"
              events={events}
              datesSet={handleDatesSet}
              height="100%"
            />
          </div>
        </div>

        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-[1px]">
            <div className="flex items-center gap-3 rounded-md border bg-white px-4 py-2 shadow-sm">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
              <span className="text-sm font-medium text-slate-700">
                Loading calendar data...
              </span>
            </div>
          </div>
        )}
      </div>

      <EventDetailsSheet
        isOpen={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        selectedEvent={selectedEvent}
        onEditTask={() => {
          setIsSheetOpen(false);
          setIsTaskEditOpen(true);
        }}
        onEditAppointment={() => {
          setIsSheetOpen(false);
          setIsAppointmentEditOpen(true);
        }}
      />
      {isTaskEditOpen && taskId && (
        <TaskCreateOrEdit
          isModalOpen={isTaskEditOpen}
          setIsModalOpen={setIsTaskEditOpen}
          taskId={taskId}
          fromEdit
          onTaskUpdated={() => {
            invalidateCalendarQueries();
            setIsTaskEditOpen(false);
          }}
          onTaskDelete={() => {
            invalidateCalendarQueries();
            setIsTaskEditOpen(false);
          }}
        />
      )}

      {isAppointmentEditOpen && appointmentId && (
        <AppointmentCreateOrEdit
          isModalOpen={isAppointmentEditOpen}
          setIsModalOpen={setIsAppointmentEditOpen}
          appointmentId={appointmentId}
          fromEdit
          onAppointmentUpdated={() => {
            invalidateCalendarQueries();
            setIsAppointmentEditOpen(false);
          }}
          onAppointmentDeleted={() => {
            invalidateCalendarQueries();
            setIsAppointmentEditOpen(false);
          }}
        />
      )}
    </div>
  );
}
