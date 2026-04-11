"use client";

import { CalendarType } from "@/types/calendar";
import { EventClickArg, EventContentArg } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import moment from "moment";
import { useRef, useState } from "react";
import { useSession } from "next-auth/react";
import styles from "./fullcalendar.module.css";

import { CalendarHeader } from "./CalendarHeader";
import { CalendarEditModals } from "./CalendarEditModals";
import { CalendarLoadingOverlay } from "./CalendarLoadingOverlay";
import { EventContent } from "./EventContent";
import { EventDetailsSheet } from "./EventDetailsSheet";
import { getCalendarType } from "./calendarView";
import { useCalendarData } from "./useCalendarData";
import { useCalendarEventDateTimeUpdate } from "./useCalendarEventDateTimeUpdate";
import { useCalendarFilters } from "./useCalendarFilters";
import { useCalendarSettings } from "./useCalendarSettings";
import { useCalendarStoreSync } from "./useCalendarStoreSync";

export default function Calendar({ type }: { type: CalendarType }) {
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isTaskEditOpen, setIsTaskEditOpen] = useState(false);
  const [isAppointmentEditOpen, setIsAppointmentEditOpen] = useState(false);
  const [isCalendarLoading, setIsCalendarLoading] = useState(false);
  const [selectedTeamMateIds, setSelectedTeamMateIds] = useState<number[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [view, setView] = useState(
    type === "list"
      ? "listWeek"
      : type === "month"
        ? "dayGridMonth"
        : type === "week"
          ? "timeGridWeek"
          : "timeGridDay",
  );
  const [dateRange, setDateRange] = useState({
    start: moment().startOf("month").format("YYYY-MM-DD"),
    end: moment().endOf("month").format("YYYY-MM-DD"),
  });

  const { data: session } = useSession();
  const calendarRef = useRef<FullCalendar>(null);

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
  });

  const loading = isCalendarLoading || isSettingsLoading || isDataLoading;
  const estRevenue = filteredAppointments.reduce(
    (acc, apt: any) => acc + (Number(apt.invoiceGrandTotal) || 0),
    0,
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
    if (info.event.extendedProps?.type === "holiday") return;
    info.jsEvent.preventDefault();
    setSelectedEvent(info.event);
    setIsSheetOpen(true);
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

  return (
    <div
      className={`w-full h-full calendar-wrapper flex flex-col bg-white rounded-lg shadow-sm border ${styles.calendarScope}`}
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

      <div className={`flex-1 w-full relative ${styles.calendarBody}`}>
        <div className="w-full h-full overflow-x-auto">
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
            dayMaxEvents={2}
            allDaySlot={false}
            expandRows={true}
            slotMinTime="00:00:00"
            slotMaxTime="24:00:00"
            scrollTime={settings?.dayStart}
            slotDuration="00:15:00"
            slotLabelFormat={{
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            }}
            businessHours={businessHours}
            slotLaneClassNames={nonBusinessSlotClassNames}
            events={events}
            eventContent={(eventInfo: EventContentArg) => (
              <EventContent eventInfo={eventInfo} session={session} />
            )}
            eventClick={handleEventClick}
            eventDrop={handleEventDateTimeUpdate}
            eventResize={handleEventDateTimeUpdate}
            datesSet={handleDatesSet}
            loading={setIsCalendarLoading}
            height="100%"
          />
        </div>

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
