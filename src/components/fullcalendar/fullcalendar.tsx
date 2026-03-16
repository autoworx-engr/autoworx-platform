"use client";
import { EventClickArg, EventContentArg } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { useState, useRef, useEffect } from "react";
import { INITIAL_EVENTS } from "./data";
import { EventContent } from "./EventContent";
import { EventDetailsSheet } from "./EventDetailsSheet";
import { CalendarHeader } from "./CalendarHeader";
import { useCalendarStore } from "@/stores/calendarStore";
import { CalendarType } from "@/types/calendar";

export default function Calendar({ type }: { type: CalendarType }) {
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

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
  const { date, setDate } = useCalendarStore();

  useEffect(() => {
    if (calendarRef.current && date) {
      calendarRef.current.getApi().gotoDate(date);
    }
  }, [date]);

  const handleEventClick = (info: EventClickArg) => {
    info.jsEvent.preventDefault();
    setSelectedEvent(info.event);
    setIsSheetOpen(true);
  };

  const renderEventContent = (eventInfo: EventContentArg) => {
    return <EventContent eventInfo={eventInfo} />;
  };

  const handleDatesSet = (arg: any) => {
    setView(arg.view.type);
    // Sync store date when calendar navigates (e.g. via prev/next buttons if we used them,
    // or if we drag/drop to a new date range)
    // However, since we use custom header buttons that update store directly,
    // we should be careful avoiding loops.
    // But setting store date matches the view start.
    // setDate(arg.view.currentStart.toISOString());
    // Actually, store date is typically "selected date".
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

  return (
    <div className="w-full h-full calendar-wrapper flex flex-col bg-white rounded-lg shadow-sm border">
      <style jsx global>{`
        /* Remove default event styling to allow full custom control */
        .fc-event {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
        }
        .fc-daygrid-event-harness {
          margin-bottom: 2px;
        }

        /* Increase time slot height via CSS variable or direct styling */
        .fc-timegrid-slot {
          height: 2.5em !important; /* Increase from default (~1.5em) */
        }

        /* Fix List View - Ensure it takes full width and looks good */
        .fc-list-table {
          width: 100% !important;
          table-layout: fixed; /* prevent collapsing */
        }
        .fc-list-day-cushion,
        .fc-list-event-title,
        .fc-list-event-time {
          padding: 12px 16px !important;
        }

        /* Customize header buttons */
        .fc-button-primary {
          background-color: #5a66ee !important;
          border-color: #5a66ee !important;
        }
        .fc-button-primary:hover {
          background-color: #5a66ee !important;
          border-color: #5a66ee !important;
        }
        .fc-button-primary:not(:disabled).fc-button-active,
        .fc-button-primary:not(:disabled):active {
          background-color: #6573ee !important;
          border-color: #6573ee !important;
        }
        /* Remove focus outline/ring */
        .fc-button:focus {
          box-shadow: none !important;
        }

        /* Hide default header since we use custom one */
        .fc-header-toolbar {
          display: none !important;
        }
      `}</style>

      <CalendarHeader calendarRef={calendarRef} type={getCalendarType(view)} />

      <div className="flex-1 w-full relative" style={{ minHeight: "600px" }}>
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
          navLinks={true}
          editable={true}
          dayMaxEvents={5}
          eventClick={handleEventClick}
          eventContent={renderEventContent}
          slotMinTime="08:00:00"
          slotMaxTime="18:00:00"
          allDaySlot={false}
          expandRows={true}
          slotDuration="00:15:00"
          events={INITIAL_EVENTS}
          datesSet={handleDatesSet}
          height="100%"
        />
      </div>

      <EventDetailsSheet
        isOpen={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        selectedEvent={selectedEvent}
      />
    </div>
  );
}
