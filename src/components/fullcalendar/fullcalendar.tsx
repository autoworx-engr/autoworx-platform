"use client";
import useAppointmentQueryByWeek from "@/app/(dashboard)/dashboard/task/_hook/appointment/query/useAppointmentQueryByWeek";
import useTaskQueryByWeek from "@/app/(dashboard)/dashboard/task/_hook/task/query/useTaskQueryByWeek";
import { useCalendarStore } from "@/stores/calendarStore";
import { CalendarType } from "@/types/calendar";
import { EventClickArg, EventContentArg } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import moment from "moment";
import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarHeader } from "./CalendarHeader";
import { EventContent } from "./EventContent";
import { EventDetailsSheet } from "./EventDetailsSheet";

export default function Calendar({ type }: { type: CalendarType }) {
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: moment().startOf("month").format("YYYY-MM-DD"),
    end: moment().endOf("month").format("YYYY-MM-DD"),
  });

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

  const { data: tasks = [] } = useTaskQueryByWeek(
    dateRange.start,
    dateRange.end,
  );
  const { data: appointments = [] } = useAppointmentQueryByWeek(
    dateRange.start,
    dateRange.end,
  );

  const events = useMemo(() => {
    const dynamicEvents: any[] = [];

    appointments.forEach((apt: any) => {
      const dateStr = apt.date ? moment(apt.date).format("YYYY-MM-DD") : "";
      if (!dateStr) return;
      dynamicEvents.push({
        id: `apt-${apt.id}`,
        title:
          apt.title ||
          (apt.client
            ? `${apt.client.firstName} ${apt.client.lastName}`
            : "Appointment"),
        start: apt.startTime ? `${dateStr}T${apt.startTime}` : dateStr,
        end: apt.endTime ? `${dateStr}T${apt.endTime}` : undefined,
        extendedProps: {
          type: "appointment",
          serviceType: "Custom Work",
          carModel: apt.vehicle
            ? `${apt.vehicle.make} ${apt.vehicle.model}`
            : undefined,
          originalData: apt,
        },
      });
    });

    tasks.forEach((task: any) => {
      const dateStr = task.date ? moment(task.date).format("YYYY-MM-DD") : "";
      if (!dateStr) return;
      dynamicEvents.push({
        id: `task-${task.id}`,
        title: task.title || "Task",
        start: task.startTime ? `${dateStr}T${task.startTime}` : dateStr,
        end: task.endTime ? `${dateStr}T${task.endTime}` : undefined,
        extendedProps: {
          type: "task",
          serviceType: task.priority || "Task",
          originalData: task,
        },
      });
    });

    return dynamicEvents;
  }, [tasks, appointments]);

  console.log("Events for FullCalendar:", events);

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

    // arg.start and arg.end represent the currently visible range in the calendar
    const startStr = moment(arg.start).format("YYYY-MM-DD");
    const endStr = moment(arg.end).format("YYYY-MM-DD");

    console.log("Visible date range changed:", {
      start: startStr,
      end: endStr,
    });

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
          slotMinTime="00:00:00"
          slotMaxTime="24:00:00"
          allDaySlot={false}
          expandRows={true}
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

      <EventDetailsSheet
        isOpen={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        selectedEvent={selectedEvent}
      />
    </div>
  );
}
