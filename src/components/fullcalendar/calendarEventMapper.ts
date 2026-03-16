import { EventInput } from "@fullcalendar/core";
import moment from "moment";

type BuildCalendarEventsParams = {
  appointments: any[];
  tasks: any[];
  holidays: any[];
};

const getDateString = (dateValue: unknown): string => {
  if (!dateValue) return "";
  return moment(dateValue as moment.MomentInput).format("YYYY-MM-DD");
};

export const buildCalendarEvents = ({
  appointments,
  tasks,
  holidays,
}: BuildCalendarEventsParams): EventInput[] => {
  const mappedEvents: EventInput[] = [];

  appointments.forEach((appointment: any) => {
    const dateStr = getDateString(appointment?.date);
    if (!dateStr) return;

    mappedEvents.push({
      id: `apt-${appointment.id}`,
      title:
        appointment.title ||
        (appointment.client
          ? `${appointment.client.firstName} ${appointment.client.lastName}`
          : "Appointment"),
      start: appointment.startTime
        ? `${dateStr}T${appointment.startTime}`
        : dateStr,
      end: appointment.endTime
        ? `${dateStr}T${appointment.endTime}`
        : undefined,
      extendedProps: {
        type: "appointment",
        serviceType: "Appointment",
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
