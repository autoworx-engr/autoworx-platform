"use client";
import { EventClickArg, EventContentArg } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { useState } from "react";
import { INITIAL_EVENTS } from "./data";
import { EventContent } from "./EventContent";
import { EventDetailsSheet } from "./EventDetailsSheet";

export default function Calendar() {
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const handleEventClick = (info: EventClickArg) => {
    info.jsEvent.preventDefault();
    setSelectedEvent(info.event);
    setIsSheetOpen(true);
  };

  const renderEventContent = (eventInfo: EventContentArg) => {
    return <EventContent eventInfo={eventInfo} />;
  };

  return (
    <div className="w-full h-full calendar-wrapper">
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

        /* Ensure calendar takes full height of container */
        .fc {
          height: 800px;
          // min-height: 600px;
          width: 100%;
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
          background-color: #6571ff !important;
          border-color: #6571ff !important;
        }
      `}</style>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
        }}
        initialView="timeGridWeek"
        initialDate="2026-03-09"
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
      />

      <EventDetailsSheet
        isOpen={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        selectedEvent={selectedEvent}
      />
    </div>
  );
}
