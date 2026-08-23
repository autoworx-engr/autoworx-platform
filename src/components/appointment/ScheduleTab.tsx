import styles from "@/app/(dashboard)/dashboard/task/_component/fullcalendar/fullcalendar.module.css";
import { getServiceColor } from "@/app/(dashboard)/dashboard/task/_utils/calendarColors";
import { getWeekStartNumber } from "@/app/(dashboard)/dashboard/task/_utils/utils.DateSelector";
import { EventContentArg } from "@fullcalendar/core";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { CalendarSettings } from "@prisma/client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import moment from "moment";
import { useEffect, useRef } from "react";

type TScheduleTabProps = {
  rows?: string[];
  title?: string;
  date?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  settings?: CalendarSettings | null;
  onDateUpDown: (direction: "+" | "-") => void;
};

const APPT_COLORS = getServiceColor("Appointment");

const SelectedSlotCard = ({ eventInfo }: { eventInfo: EventContentArg }) => {
  const { event } = eventInfo;
  const start = event.start ? moment(event.start) : null;
  const end = event.end ? moment(event.end) : null;
  return (
    <div
      className="flex h-full w-full flex-col gap-1 overflow-hidden rounded-lg p-2 text-xs leading-tight cursor-default"
      style={{
        background: `linear-gradient(to bottom, ${APPT_COLORS.gradient.join(", ")})`,
        border: `1px solid ${APPT_COLORS.borderColor}`,
        color: "#1f2937",
      }}
    >
      <p
        className="text-[9px] font-bold uppercase tracking-wide"
        style={{ color: APPT_COLORS.accentColor }}
      >
        Appointment
      </p>
      <p className="text-sm font-semibold text-gray-900 truncate">
        {event.title || "Selected Slot"}
      </p>
      {start && end && (
        <p className="text-[11px] font-medium text-gray-600">
          {start.format("h:mm A")} – {end.format("h:mm A")}
        </p>
      )}
    </div>
  );
};

export default function ScheduleTab({
  title,
  date,
  endDate,
  startTime,
  endTime,
  settings,
  onDateUpDown,
}: TScheduleTabProps) {
  const calendarRef = useRef<FullCalendar | null>(null);
  const isMultiDay = !!(endDate && date && endDate !== date);

  const businessHours =
    settings?.dayStart && settings?.dayEnd
      ? {
          daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
          startTime: settings.dayStart,
          endTime: settings.dayEnd,
        }
      : undefined;

  const parseHm = (t: string) => {
    const [h = 0, m = 0] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const businessMinutes =
    settings?.dayStart && settings?.dayEnd
      ? { start: parseHm(settings.dayStart), end: parseHm(settings.dayEnd) }
      : null;

  const firstDay = getWeekStartNumber(settings?.weekStart ?? "Monday");

  const events =
    date && startTime && endTime
      ? [
          {
            id: "selected-slot",
            title: title?.trim() || "Selected Slot",
            start: `${date}T${startTime}:00`,
            end: `${isMultiDay ? endDate : date}T${endTime}:00`,
          },
        ]
      : [];

  useEffect(() => {
    if (!date) return;
    queueMicrotask(() => calendarRef.current?.getApi().gotoDate(date));
  }, [date]);

  return (
    <div className="flex h-full min-h-[460px] flex-col">
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-100 bg-white/80 px-6 py-3 backdrop-blur-md">
        <button
          type="button"
          onClick={() => onDateUpDown("-")}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 transition-all hover:bg-slate-50 hover:text-primary"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="text-center">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">
            {isMultiDay
              ? `${moment(date).format("ddd")} – ${moment(endDate).format("ddd")}`
              : moment(date).format("dddd")}
          </h2>
          <p className="text-lg font-extrabold text-slate-500">
            {isMultiDay
              ? `${moment(date).format("MMM D")} – ${moment(endDate).format("MMM D, YYYY")}`
              : moment(date).format("MMMM D, YYYY")}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onDateUpDown("+")}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 transition-all hover:bg-slate-50 hover:text-primary"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div
        className={`flex-1 min-h-0 overflow-y-auto bg-white ${styles.calendarScope}`}
      >
        <FullCalendar
          ref={calendarRef}
          plugins={[timeGridPlugin, interactionPlugin]}
          initialView="timeGridDay"
          initialDate={date}
          firstDay={firstDay >= 0 ? firstDay : 0}
          headerToolbar={false}
          dayHeaders={false}
          allDaySlot={false}
          editable={false}
          selectable={false}
          expandRows
          slotMinTime="00:00:00"
          slotMaxTime="24:00:00"
          scrollTime={settings?.dayStart ?? "08:00:00"}
          slotDuration="00:15:00"
          slotLabelInterval="01:00"
          slotLabelFormat={{
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          }}
          businessHours={businessHours}
          slotLaneClassNames={(arg) => {
            if (!arg.date || !businessMinutes) return [];
            const mins = arg.date.getHours() * 60 + arg.date.getMinutes();
            const isNonBusiness =
              mins < businessMinutes.start || mins >= businessMinutes.end;
            return isNonBusiness ? [styles.nonBusinessSlot] : [];
          }}
          events={events}
          eventContent={(eventInfo) => (
            <SelectedSlotCard eventInfo={eventInfo} />
          )}
          height="100%"
        />
      </div>
    </div>
  );
}
