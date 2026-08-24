"use client";

import { useCalendarStore } from "@/stores/calendarStore";
import { CalendarType } from "@/types/calendar";
import { EventClickArg } from "@fullcalendar/core";
import FullCalendar from "@fullcalendar/react";
import moment from "moment";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCalendarData } from "../../_hook/calendar/useCalendarData";
import { useCalendarEventDateTimeUpdate } from "../../_hook/calendar/useCalendarEventDateTimeUpdate";
import { useCalendarFilters } from "../../_hook/calendar/useCalendarFilters";
import { useCalendarNativeDrop } from "../../_hook/calendar/useCalendarNativeDrop";
import { useCalendarSettings } from "../../_hook/calendar/useCalendarSettings";
import { useCalendarStoreSync } from "../../_hook/calendar/useCalendarStoreSync";
import { useScheduleTaskAt } from "../../_hook/calendar/useScheduleTaskAt";
import { getCalendarType } from "../../_utils/calendarView";
import { CalendarEditModals } from "./CalendarEditModals";
import { CalendarHeader } from "./CalendarHeader";
import { CalendarLoadingOverlay } from "./CalendarLoadingOverlay";
import { EventDetailsSheet } from "./EventDetailsSheet";
import styles from "./fullcalendar.module.css";
import { StandardCalendar } from "./StandardCalendar";
import { TransposedWeekView } from "./transposedWeek/TransposedWeekView";

export default function Calendar({ type }: { type: CalendarType }) {
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isTaskEditOpen, setIsTaskEditOpen] = useState(false);
  const [isAppointmentEditOpen, setIsAppointmentEditOpen] = useState(false);
  const [isCalendarLoading, setIsCalendarLoading] = useState(false);
  const [selectedTeamMateIds, setSelectedTeamMateIds] = useState<number[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const { date: storeDate, setDate, setNavigating } = useCalendarStore();
  const router = useRouter();
  const [view, setView] = useState(
    type === "list"
      ? "listDay"
      : type === "month"
        ? "dayGridMonth"
        : type === "week"
          ? "timeGridWeek"
          : "timeGridDay",
  );
  const [dateRange, setDateRange] = useState(() => {
    const today = moment().format("YYYY-MM-DD");
    if (type === "list" || type === "day") {
      return { start: today, end: today };
    }
    if (type === "week") {
      return {
        start: moment().startOf("week").format("YYYY-MM-DD"),
        end: moment().endOf("week").format("YYYY-MM-DD"),
      };
    }
    return {
      start: moment().startOf("month").format("YYYY-MM-DD"),
      end: moment().endOf("month").format("YYYY-MM-DD"),
    };
  });

  const { data: session } = useSession();
  const calendarRef = useRef<FullCalendar>(null);
  const { startTime: scrollToTime, setStartTime } = useCalendarStore();

  useEffect(() => {
    if (!scrollToTime) return;
    const timer = setTimeout(() => {
      calendarRef.current?.getApi().scrollToTime(scrollToTime);
      setStartTime(null);
    }, 300);
    return () => clearTimeout(timer);
  }, [scrollToTime]);

  const {
    settings,
    isLoading: isSettingsLoading,
    firstDay,
    businessHours,
    nonBusinessSlotClassNames,
  } = useCalendarSettings();
  const {
    tasks,
    appointments,
    holidays,
    isLoading: isDataLoading,
    invalidateCalendarQueries,
  } = useCalendarData(dateRange);
  const { handleDatesSet: syncStoreDatesSet } =
    useCalendarStoreSync(calendarRef);
  const handleEventDateTimeUpdate = useCalendarEventDateTimeUpdate();
  const handleNativeDrop = useCalendarNativeDrop(storeDate);
  const scheduleTaskAt = useScheduleTaskAt();

  const weekendDays = useMemo(
    () => [settings?.weekend1, settings?.weekend2].filter(Boolean) as string[],
    [settings?.weekend1, settings?.weekend2],
  );

  const {
    teamMateOptions,
    categoryOptions,
    filteredTasks,
    filteredAppointments,
    events,
  } = useCalendarFilters({
    tasks,
    appointments,
    holidays,
    selectedTeamMateIds,
    selectedCategoryIds,
    dateRange,
    weekendDays,
  });

  const displayEvents = useMemo(() => {
    if (view.startsWith("list")) {
      return events.filter(
        (e) =>
          e.extendedProps?.type !== "holiday" &&
          e.extendedProps?.type !== "weekend",
      );
    }
    if (view === "timeGridWeek") {
      return events.filter(
        (e) =>
          e.extendedProps?.type !== "holiday" &&
          e.extendedProps?.serviceType !== "Holiday",
      );
    }
    return events;
  }, [events, view]);

  const loading = isCalendarLoading || isSettingsLoading || isDataLoading;

  const estRevenue = useMemo(
    () =>
      filteredAppointments.reduce(
        (acc, apt: any) => acc + (Number(apt.invoiceGrandTotal) || 0),
        0,
      ),
    [filteredAppointments],
  );

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

  const handleEventClick = (info: EventClickArg) => {
    const type = info.event.extendedProps?.type;
    if (type === "holiday" || type === "weekend") return;
    info.jsEvent.preventDefault();
    document
      .querySelectorAll<HTMLElement>(".fc-popover .fc-popover-close")
      .forEach((closeButton) => closeButton.click());
    setSelectedEvent(info.event);
    setIsSheetOpen(true);
  };

  const handleNavLinkDayClick = (date: Date) => {
    setDate(moment(date).format("YYYY-MM-DD"));
    setNavigating(true);
    router.push("day");
  };

  const handleDatesSet = (arg: any) => {
    setView(arg.view.type);
    syncStoreDatesSet(arg);

    const viewStart = moment(arg.view.currentStart);
    if (arg.view.type === "dayGridMonth") {
      setDateRange({
        start: viewStart.clone().startOf("month").format("YYYY-MM-DD"),
        end: viewStart.clone().endOf("month").format("YYYY-MM-DD"),
      });
    } else {
      setDateRange({
        start: moment(arg.start).format("YYYY-MM-DD"),
        end: moment(arg.end - 1).format("YYYY-MM-DD"),
      });
    }
  };

  const isWeekView = view === "timeGridWeek";

  return (
    <div
      className={`flex-1 min-w-0 h-full calendar-wrapper flex flex-col bg-white rounded-lg shadow-sm border  ${styles.calendarScope}`}
    >
      <CalendarHeader
        calendarRef={calendarRef}
        type={getCalendarType(view)}
        appointmentCount={filteredAppointments.length}
        taskCount={filteredTasks.length}
        estRevenue={estRevenue}
        teamMates={teamMateOptions}
        categories={categoryOptions}
        selectedTeamMateIds={selectedTeamMateIds}
        selectedCategoryIds={selectedCategoryIds}
        onSelectedTeamMateIdsChange={setSelectedTeamMateIds}
        onSelectedCategoryIdsChange={setSelectedCategoryIds}
      />

      <div className={`flex-1 relative ${styles.calendarBody}`}>
        <StandardCalendar
          calendarRef={calendarRef}
          view={view}
          initialDate={storeDate ?? undefined}
          firstDay={firstDay}
          businessHours={businessHours}
          nonBusinessSlotClassNames={nonBusinessSlotClassNames}
          scrollTime={settings?.dayStart}
          events={displayEvents}
          session={session}
          containerStyle={isWeekView ? { display: "none" } : undefined}
          onDrop={handleNativeDrop}
          onNavLinkDayClick={handleNavLinkDayClick}
          onEventClick={handleEventClick}
          onEventDateTimeUpdate={handleEventDateTimeUpdate}
          onDatesSet={handleDatesSet}
          onLoading={setIsCalendarLoading}
        />

        {isWeekView && (
          <TransposedWeekView
            events={displayEvents}
            firstDay={firstDay}
            businessStart={settings?.dayStart ?? undefined}
            businessEnd={settings?.dayEnd ?? undefined}
            session={session}
            scrollToTime={scrollToTime}
            onScrollHandled={() => setStartTime(null)}
            onEventClick={(info) => handleEventClick(info as EventClickArg)}
            onEventCommit={handleEventDateTimeUpdate}
            onNativeDrop={(taskId, dateStr, time) =>
              scheduleTaskAt(taskId, dateStr, time)
            }
            onDayClick={handleNavLinkDayClick}
          />
        )}

        <CalendarLoadingOverlay loading={loading} />
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

      <CalendarEditModals
        isTaskEditOpen={isTaskEditOpen}
        setIsTaskEditOpen={setIsTaskEditOpen}
        taskId={taskId}
        isAppointmentEditOpen={isAppointmentEditOpen}
        setIsAppointmentEditOpen={setIsAppointmentEditOpen}
        appointmentId={appointmentId}
        onMutated={invalidateCalendarQueries}
      />
    </div>
  );
}
