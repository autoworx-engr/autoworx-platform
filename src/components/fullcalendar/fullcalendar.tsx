"use client";
import { EventClickArg, EventContentArg } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { useState, useRef } from "react";
import { INITIAL_EVENTS } from "./data";
import { EventContent } from "./EventContent";
import { EventDetailsSheet } from "./EventDetailsSheet";
import { CalendarHeader } from "./CalendarHeader";

export default function Calendar() {
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const calendarRef = useRef<FullCalendar>(null);
  const [title, setTitle] = useState("");
  const [view, setView] = useState("timeGridWeek");
  const [date, setDate] = useState(new Date("2026-03-09"));

  const handleEventClick = (info: EventClickArg) => {
    info.jsEvent.preventDefault();
    setSelectedEvent(info.event);
    setIsSheetOpen(true);
  };

  const renderEventContent = (eventInfo: EventContentArg) => {
    return <EventContent eventInfo={eventInfo} />;
  };

  const handleDatesSet = (arg: any) => {
    setTitle(arg.view.title);
    setView(arg.view.type);
    // arg.view.currentStart is the start of the current view (e.g. start of week)
    // If we want the focused date (like if we clicked a date), FullCalendar internal state has it,
    // but typically standard props expose start/end of view.
    // For navigation purposes, updating 'date' state based on view start is fine.
    setDate(arg.view.currentStart);
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
          height: 3.5em !important; /* Increase from default (~1.5em) */
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

      <CalendarHeader
        calendarRef={calendarRef}
        title={title}
        view={view}
        date={date}
      />

      <div className="flex-1 w-full relative" style={{ minHeight: "600px" }}>
        <FullCalendar
          ref={calendarRef}
          plugins={[
            dayGridPlugin,
            timeGridPlugin,
            listPlugin,
            interactionPlugin,
          ]}
          initialView="timeGridWeek"
          initialDate="2026-03-09"
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
          slotDuration="01:00:00"
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
