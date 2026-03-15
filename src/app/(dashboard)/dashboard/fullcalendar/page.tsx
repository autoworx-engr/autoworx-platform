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
import { EventClickArg, EventContentArg } from "@fullcalendar/core";

// Define the shape of our custom event properties
interface CustomEventProps {
  serviceType: "Tint" | "Detailing" | "PPF" | "Wrap" | "Custom Work";
  carModel?: string;
  price?: string;
  description?: string;
}

// Color mapping based on service type
const SERVICE_COLORS = {
  Tint: {
    bg: "#eff6ff", // blue-50
    text: "#2563eb", // blue-600
    border: "#3b82f6", // blue-500
  },
  Detailing: {
    bg: "#faf5ff", // purple-50
    text: "#9333ea", // purple-600
    border: "#a855f7", // purple-500
  },
  PPF: {
    bg: "#f0fdf4", // green-50
    text: "#16a34a", // green-600
    border: "#22c55e", // green-500
  },
  Wrap: {
    bg: "#fff7ed", // orange-50
    text: "#ea580c", // orange-600
    border: "#f97316", // orange-500
  },
  "Custom Work": {
    bg: "#fef2f2", // red-50
    text: "#dc2626", // red-600
    border: "#ef4444", // red-500
  },
};

export default function Calendar() {
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleEventClick = (info: EventClickArg) => {
    info.jsEvent.preventDefault();
    setSelectedEvent(info.event);
    setIsDialogOpen(true);
  };

  const renderEventContent = (eventInfo: EventContentArg) => {
    const { event, view } = eventInfo;
    const props = event.extendedProps as CustomEventProps;
    const serviceType = props.serviceType || "Custom Work";
    const colors = SERVICE_COLORS[serviceType] || SERVICE_COLORS["Custom Work"];

    // Styles for the container
    const containerStyle = {
      backgroundColor: colors.bg,
      borderLeft: `4px solid ${colors.border}`,
      color: "#1f2937", // gray-800
      overflow: "hidden",
      borderRadius: "0 4px 4px 0",
      padding: "2px 4px",
      width: "100%",
      height: "100%",
    };

    // Month view rendering (Horizontal single line style)
    if (view.type === "dayGridMonth") {
      return (
        <div
          className="flex items-center gap-1 text-xs truncate w-full h-full cursor-pointer overflow-hidden rounded-r-sm pl-1"
          style={{
            backgroundColor: colors.bg,
            borderLeft: `3px solid ${colors.border}`,
            color: "#1f2937",
          }}
        >
          <span className="text-gray-400">·</span>
          <span className="font-medium truncate">{event.title}</span>
          <span className="text-gray-400">·</span>
          <span className="font-medium text-gray-600">{props.price}</span>
        </div>
      );
    }

    // Week and Day view rendering (Vertical block style)
    return (
      <div
        style={containerStyle}
        className="flex flex-col text-xs leading-tight h-full cursor-pointer"
      >
        <div className="flex items-center gap-1 mb-0.5 flex-wrap">
          <span className="font-bold">{event.title}</span>
        </div>
        {props.carModel && (
          <div className="text-gray-600 truncate mb-auto">{props.carModel}</div>
        )}
        {props.price && (
          <div className="font-semibold text-gray-700 mt-auto">
            {props.price}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
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
      `}</style>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        initialView="timeGridWeek"
        initialDate="2026-03-09" // Adjusted to show the populated week
        navLinks={true}
        editable={true}
        dayMaxEvents={true}
        eventClick={handleEventClick}
        eventContent={renderEventContent}
        slotMinTime="08:00:00"
        slotMaxTime="18:00:00"
        allDaySlot={false}
        height="auto"
        events={[
          // Monday March 9
          {
            title: "Oscar G.",
            start: "2026-03-09T08:00:00",
            end: "2026-03-09T11:00:00",
            extendedProps: {
              serviceType: "Wrap",
              carModel: "2023 Audi RS5",
              price: "$2,600",
            },
          },
          {
            title: "John D.",
            start: "2026-03-09T11:30:00",
            end: "2026-03-09T13:30:00",
            extendedProps: {
              serviceType: "Tint",
              carModel: "2022 BMW 340i",
              price: "$450",
            },
          },
          {
            title: "Mike R.",
            start: "2026-03-09T14:00:00",
            end: "2026-03-09T16:00:00",
            extendedProps: {
              carModel: "2020 Porsche 911",
              price: "$500",
            },
          },

          // Tuesday March 10
          {
            title: "Kevin H.",
            start: "2026-03-10T09:00:00",
            end: "2026-03-10T11:00:00",
            extendedProps: {
              serviceType: "Tint",
              carModel: "2023 Toyota Camry",
              price: "$200",
            },
          },
          {
            title: "Tyler J.",
            start: "2026-03-10T11:30:00",
            end: "2026-03-10T13:00:00",
            extendedProps: {
              serviceType: "Custom Work",
              carModel: "2024 Ford Mustang",
              price: "$650",
            },
          },
          {
            title: "Carlos V.",
            start: "2026-03-10T14:00:00",
            end: "2026-03-10T16:00:00",
            extendedProps: {
              serviceType: "PPF",
              carModel: "2022 BMW M4",
              price: "$2,200",
            },
          },

          // Wednesday March 11
          {
            title: "Emma S.",
            start: "2026-03-11T08:00:00",
            end: "2026-03-11T10:00:00",
            extendedProps: {
              serviceType: "PPF",
              carModel: "2023 Porsche Cayenne",
              price: "$800",
            },
          },
          {
            title: "Brett A.",
            start: "2026-03-11T10:30:00",
            end: "2026-03-11T12:30:00",
            extendedProps: {
              serviceType: "Detailing",
              carModel: "2019 Infiniti Q50",
              price: "$1,200",
            },
          },
          {
            title: "Nina P.",
            start: "2026-03-11T13:00:00",
            end: "2026-03-11T17:00:00",
            extendedProps: {
              serviceType: "Wrap",
              carModel: "2021 Chevy Corvette",
              price: "$3,000",
            },
          },

          // Thursday March 12
          {
            title: "Chris P.",
            start: "2026-03-12T09:00:00",
            end: "2026-03-12T11:00:00",
            extendedProps: {
              serviceType: "Custom Work",
              carModel: "2021 Dodge Charger",
              price: "$900",
            },
          },
          {
            title: "Derek L.",
            start: "2026-03-12T11:30:00",
            end: "2026-03-12T13:00:00",
            extendedProps: {
              serviceType: "Tint",
              carModel: "2020 Kia Stinger",
              price: "$350",
            },
          },
          {
            title: "Victor M.",
            start: "2026-03-12T13:30:00",
            end: "2026-03-12T16:30:00",
            extendedProps: {
              serviceType: "Wrap",
              carModel: "2022 Lamborghini Urus",
              price: "$4,500",
            },
          },

          // Friday March 13
          {
            title: "John D.",
            start: "2026-03-13T08:00:00",
            end: "2026-03-13T10:00:00",
            extendedProps: {
              serviceType: "Tint",
              carModel: "2022 BMW 340i",
              price: "$450",
            },
          },
          {
            title: "Daniel F.",
            start: "2026-03-13T10:30:00",
            end: "2026-03-13T13:30:00",
            extendedProps: {
              serviceType: "Wrap",
              carModel: "2024 Tesla Model 3",
              price: "$2,800",
            },
          },
          {
            title: "Tina R.",
            start: "2026-03-13T14:00:00",
            end: "2026-03-13T16:00:00",
            extendedProps: {
              serviceType: "PPF",
              carModel: "2024 Mercedes AMG GT",
              price: "$5,500",
            },
          },
          {
            title: "Jenn...",
            start: "2026-03-13T15:00:00",
            end: "2026-03-13T17:00:00",
            extendedProps: {
              serviceType: "Detailing",
              carModel: "2023 Range Rover",
              price: "$800",
            },
          },
          {
            title: "Stacy F.",
            start: "2026-03-13T15:00:00",
            end: "2026-03-13T17:00:00",
            extendedProps: {
              serviceType: "Detailing",
              carModel: "2024 Mazda CX-5",
              price: "$150",
            },
          },

          // Random events for Month View density - March 2
          {
            title: "Laura H.",
            start: "2026-03-02T10:00:00",
            end: "2026-03-02T12:00:00",
            extendedProps: {
              serviceType: "Custom Work",
              carModel: "2023 Chevy Camaro",
              price: "$2,000",
            },
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
            {selectedEvent?.extendedProps?.carModel && (
              <p>
                <span className="font-semibold text-gray-700">Vehicle:</span>{" "}
                {selectedEvent.extendedProps.carModel}
              </p>
            )}

            {selectedEvent?.extendedProps?.price && (
              <p>
                <span className="font-semibold text-gray-700">Price:</span>{" "}
                {selectedEvent.extendedProps.price}
              </p>
            )}

            {selectedEvent?.extendedProps?.description && (
              <p className="border-t pt-2 mt-2">
                {selectedEvent.extendedProps.description}
              </p>
            )}

            <div className="text-sm text-gray-500 pt-2 border-t mt-2">
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
