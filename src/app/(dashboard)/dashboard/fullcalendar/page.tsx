"use client";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";

export default function Calendar() {
  return (
    <FullCalendar
      plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
      headerToolbar={{
        left: "prev,next today",
        center: "title",
        right: "dayGridMonth,timeGridWeek,timeGridDay,listMonth",
      }}
      initialView="timeGridDay"
      initialDate={new Date()}
      navLinks={true} // can click day/week names to navigate views
      editable={true}
      dayMaxEvents={true} // allow "more" link when too many events
      events={[
        {
          title: "All Day Event",
          start: "2026-03-01",
        },
        {
          title: "Long Event",
          start: "2026-03-08",
          end: "2026-03-11",
        },
        {
          groupId: "999",
          title: "Repeating Event",
          start: "2026-03-09T16:00:00",
        },
        {
          groupId: "999",
          title: "Repeating Event",
          start: "2026-03-16T16:00:00",
        },
        {
          title: "Conference",
          start: "2026-03-11",
          end: "2026-03-14",
        },
        {
          title: "Meeting",
          start: "2026-03-12T10:30:00",
          end: "2026-03-12T12:30:00",
        },
        {
          title: "Lunch",
          start: "2026-03-12T12:00:00",
        },
        {
          title: "Meeting",
          start: "2026-03-12T14:30:00",
        },
        {
          title: "Birthday Party",
          start: "2026-03-13T07:00:00",
        },
        {
          title: "Conference",
          start: "2026-03-15",
          end: "2026-03-16",
        },
        {
          title: "Event 1",
          start: "2026-03-15T06:30:00",
        },
        {
          title: "Event 2",
          start: "2026-03-15T08:00:00",
        },
        {
          title: "Event 1",
          start: "2026-03-15T09:00:00",
        },
        {
          title: "Event 2",
          start: "2026-03-15T10:00:00",
        },
        {
          title: "Event 3",
          start: "2026-03-15T11:00:00",
        },
        {
          title: "Event 3",
          start: "2026-03-15T11:00:00",
        },
        {
          title: "Event 3",
          start: "2026-03-15T11:00:00",
        },
        {
          title: "Event 3",
          start: "2026-03-15T11:00:00",
        },
        {
          title: "Click for Google",
          url: "http://google.com/",
          start: "2026-03-28",
        },
      ]}
    />
  );
}
