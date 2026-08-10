"use client";

import { EventClickArg, EventContentArg, EventInput } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { CSSProperties, RefObject } from "react";
import { EventContent } from "./EventContent";

interface BusinessHours {
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
}

interface Props {
  calendarRef: RefObject<FullCalendar | null>;
  view: string;
  initialDate?: string;
  firstDay: number;
  businessHours?: BusinessHours;
  nonBusinessSlotClassNames: (arg: { date?: Date }) => string[];
  scrollTime?: string;
  events: EventInput[];
  session: any;
  containerStyle?: CSSProperties;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onNavLinkDayClick: (date: Date) => void;
  onEventClick: (info: EventClickArg) => void;
  onEventDateTimeUpdate: (info: any) => void;
  onDatesSet: (arg: any) => void;
  onLoading: (loading: boolean) => void;
}

export function StandardCalendar({
  calendarRef,
  view,
  initialDate,
  firstDay,
  businessHours,
  nonBusinessSlotClassNames,
  scrollTime,
  events,
  session,
  containerStyle,
  onDrop,
  onNavLinkDayClick,
  onEventClick,
  onEventDateTimeUpdate,
  onDatesSet,
  onLoading,
}: Props) {
  return (
    <div
      className="w-full h-full overflow-x-auto"
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      style={containerStyle}
    >
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
        initialView={view}
        initialDate={initialDate}
        headerToolbar={false}
        nowIndicator={true}
        firstDay={firstDay}
        navLinks={true}
        navLinkDayClick={onNavLinkDayClick}
        editable={true}
        dayMaxEvents={2}
        allDaySlot={false}
        expandRows={true}
        slotMinTime="00:00:00"
        slotMaxTime="24:00:00"
        scrollTime={scrollTime}
        slotDuration="00:15:00"
        slotLabelFormat={{
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }}
        eventTimeFormat={{
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
        eventClick={onEventClick}
        eventDrop={onEventDateTimeUpdate}
        eventResize={onEventDateTimeUpdate}
        datesSet={onDatesSet}
        loading={onLoading}
        height="100%"
      />
    </div>
  );
}
