"use client";

import {
  EventClickArg,
  EventContentArg,
  EventInput,
  EventMountArg,
} from "@fullcalendar/core";
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

// List view renders one row per event, so items sharing a time slot repeat
// the same time label. Tag rows whose time matches the row directly above so
// the stylesheet can hide the duplicate label and drop the divider between
// them — the group then reads as a single row holding several cards.
function markRepeatedListTime(arg: EventMountArg) {
  if (!arg.view.type.startsWith("list")) return;

  const row = arg.el.closest<HTMLElement>("tr.fc-list-event");
  const timeCell = row?.querySelector<HTMLElement>(".fc-list-event-time");
  if (!row || !timeCell) return;

  // Remember the original text: once a row is marked as a repeat its label is
  // hidden via CSS, but the text stays in the DOM so later rows still have
  // something to compare against.
  const currentTime = timeCell.textContent?.trim() ?? "";
  if (!currentTime) return;
  row.dataset.slotTime = currentTime;

  const prevRow = row.previousElementSibling as HTMLElement | null;
  const prevTime = prevRow?.matches("tr.fc-list-event")
    ? prevRow.dataset.slotTime
    : undefined;

  if (prevTime && prevTime === currentTime) {
    row.dataset.repeatedTime = "true";
  } else {
    delete row.dataset.repeatedTime;
  }
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
        allDayText="All day"
        businessHours={businessHours}
        slotLaneClassNames={nonBusinessSlotClassNames}
        events={events}
        eventContent={(eventInfo: EventContentArg) => (
          <EventContent eventInfo={eventInfo} session={session} />
        )}
        eventClick={onEventClick}
        eventDrop={onEventDateTimeUpdate}
        eventResize={onEventDateTimeUpdate}
        eventDidMount={markRepeatedListTime}
        datesSet={onDatesSet}
        loading={onLoading}
        height="100%"
      />
    </div>
  );
}
