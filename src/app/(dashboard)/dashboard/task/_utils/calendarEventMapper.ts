import { EventInput } from "@fullcalendar/core";
import moment from "moment";
import { darkenHex, isHexColor, lightenHex } from "./colorUtils";

const DAY_NAME_TO_DOW: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

type BuildCalendarEventsParams = {
  appointments: any[];
  tasks: any[];
  holidays: any[];
  dateRange?: { start: string; end: string };
  weekendDays?: string[]; // e.g. ["Saturday", "Sunday"]
};

const getDateString = (dateValue: unknown): string => {
  if (!dateValue) return "";
  return moment.utc(dateValue as moment.MomentInput).format("YYYY-MM-DD");
};

export const buildCalendarEvents = ({
  appointments,
  tasks,
  holidays,
  dateRange,
  weekendDays,
}: BuildCalendarEventsParams): EventInput[] => {
  const mappedEvents: EventInput[] = [];

  // Add weekend events for month view based on settings weekend1/weekend2
  if (dateRange && weekendDays && weekendDays.length > 0) {
    const weekendDOWs = new Set(
      weekendDays
        .map((d) => DAY_NAME_TO_DOW[d.toLowerCase()])
        .filter((n) => n !== undefined),
    );
    const start = moment.utc(dateRange.start).startOf("month");
    const end = moment.utc(dateRange.end).endOf("month");
    const current = start.clone();
    while (current.isSameOrBefore(end, "day")) {
      const dow = current.day();
      if (weekendDOWs.has(dow)) {
        const dateStr = current.format("YYYY-MM-DD");
        mappedEvents.push({
          id: `weekend-${dateStr}`,
          title: current.format("dddd"), // "Saturday", "Sunday", etc.
          start: dateStr,
          allDay: true,
          editable: false,
          extendedProps: {
            type: "weekend",
            serviceType: "Weekend",
            originalData: { id: dateStr },
          },
        });
      }
      current.add(1, "day");
    }
  }

  appointments.forEach((appointment: any) => {
    const dateStr = getDateString(appointment?.date);
    if (!dateStr) return;
    const endDateStr = appointment?.endDate
      ? getDateString(appointment.endDate)
      : "";
    // Multi-day when endDate exists and is strictly after the start date.
    const isMultiDay = !!endDateStr && endDateStr > dateStr;
    const categoryColor = isHexColor(appointment?.serviceCategory?.color)
      ? appointment.serviceCategory.color
      : undefined;

    // FullCalendar all-day events use an EXCLUSIVE end (the day after the
    // last visible day); timed events use the inclusive end timestamp.
    const hasTimes = !!appointment.startTime && !!appointment.endTime;
    let start: string;
    let end: string | undefined;
    let allDay: boolean | undefined;

    if (isMultiDay && hasTimes) {
      start = `${dateStr}T${appointment.startTime}`;
      end = `${endDateStr}T${appointment.endTime}`;
    } else if (isMultiDay) {
      start = dateStr;
      end = moment.utc(endDateStr).add(1, "day").format("YYYY-MM-DD");
      allDay = true;
    } else if (hasTimes) {
      start = `${dateStr}T${appointment.startTime}`;
      end = `${dateStr}T${appointment.endTime}`;
    } else {
      start = dateStr;
      end = undefined;
    }

    mappedEvents.push({
      id: `apt-${appointment.id}`,
      title:
        appointment.title ||
        (appointment.client
          ? `${appointment.client.firstName} ${appointment.client.lastName}`
          : "Appointment"),
      start,
      end,
      ...(allDay !== undefined ? { allDay } : {}),
      backgroundColor: categoryColor
        ? lightenHex(categoryColor, 0.25)
        : undefined,
      borderColor: categoryColor ? darkenHex(categoryColor, 0.75) : undefined,
      textColor: categoryColor ? "#111827" : undefined,
      extendedProps: {
        type: "appointment",
        serviceType: "Appointment",
        serviceCategoryColor: categoryColor,
        serviceCategoryName: appointment?.serviceCategory?.name,
        carModel: appointment.vehicle
          ? `${appointment.vehicle.make} ${appointment.vehicle.model}`
          : undefined,
        originalData: appointment,
      },
    });
  });

  tasks.forEach((task: any) => {
    const dateStr = getDateString(task?.date);
    if (!dateStr) return;

    mappedEvents.push({
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

  holidays.forEach((holiday: any) => {
    const dateStr = holiday?.date
      ? moment.utc(holiday.date).format("YYYY-MM-DD")
      : "";
    if (!dateStr) return;

    mappedEvents.push({
      id: holiday.id,
      title: "Holiday",
      start: dateStr,
      allDay: true,
      editable: false,
      extendedProps: {
        type: "holiday",
        serviceType: "Holiday",
        originalData: holiday,
      },
    });
  });

  return mappedEvents;
};
