"use client";
import React, { useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/Dialog";
import { EventClickArg } from "@fullcalendar/core";

export default function Calendar() {
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleEventClick = (info: EventClickArg) => {
    info.jsEvent.preventDefault();
    setSelectedEvent(info.event);
    setIsDialogOpen(true);
  };

  return (
    <>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay,listMonth",
        }}
        initialView="dayGridMonth"
        initialDate="2026-03-01"
        navLinks={true} // can click day/week names to navigate views
        editable={true}
        dayMaxEvents={true} // allow "more" link when too many events
        eventClick={handleEventClick}
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedEvent?.title}</DialogTitle>
            <DialogDescription>
              {selectedEvent?.startStr}
              {selectedEvent?.endStr && ` - ${selectedEvent?.endStr}`}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            {selectedEvent?.extendedProps?.description && (
              <p>{selectedEvent.extendedProps.description}</p>
            )}
            {selectedEvent?.url && (
              <a
                href={selectedEvent.url}
                target="_blank"
                rel="noreferrer"
                className="text-blue-500 hover:underline"
              >
                Visit Link
              </a>
            )}
            <div className="text-sm text-gray-500">
              <p>Start: {selectedEvent?.start?.toLocaleString()}</p>
              {selectedEvent?.end && (
                <p>End: {selectedEvent?.end?.toLocaleString()}</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
