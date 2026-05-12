import { EventInput } from "@fullcalendar/core";
import moment from "moment";
import { useMemo } from "react";
import { PositionedEvent } from "./TransposedWeekEvent";
import {
  dateToMinutes,
  minutesToPixels,
  TOTAL_MINUTES,
} from "./transposedWeekUtils";

interface LayoutResult {
  byDay: Record<number, PositionedEvent[]>;
  holidayByDay: Record<number, PositionedEvent>;
}

export function useTransposedLayout(
  events: EventInput[],
  weekDays: moment.Moment[],
): LayoutResult {
  return useMemo(() => {
    const rawByDay: Record<
      number,
      Omit<PositionedEvent, "lane" | "totalLanes">[]
    > = {};
    const holidayByDay: Record<number, PositionedEvent> = {};

    events.forEach((ev) => {
      const start =
        ev.start instanceof Date ? ev.start : new Date(ev.start as string);
      const endRaw = ev.end
        ? ev.end instanceof Date
          ? ev.end
          : new Date(ev.end as string)
        : null;
      const dayIdx = weekDays.findIndex(
        (wd) => wd.format("YYYY-MM-DD") === moment(start).format("YYYY-MM-DD"),
      );
      if (dayIdx === -1) return;

      const type = (ev.extendedProps as any)?.type;
      const serviceType = (ev.extendedProps as any)?.serviceType;
      if (type === "weekend") return;

      const startMin = ev.allDay ? 0 : dateToMinutes(start);
      const endMin = ev.allDay
        ? TOTAL_MINUTES
        : endRaw
          ? dateToMinutes(endRaw) || startMin + 60
          : startMin + 60;

      const base = {
        id: String(ev.id),
        title: String(ev.title ?? ""),
        start,
        end: endRaw ?? new Date(start.getTime() + 60 * 60 * 1000),
        extendedProps: ev.extendedProps as any,
        startMin,
        endMin,
        left: minutesToPixels(startMin),
        width: minutesToPixels(Math.max(15, endMin - startMin)),
      };

      if (type === "holiday" || serviceType === "Holiday") {
        holidayByDay[dayIdx] = { ...base, lane: 0, totalLanes: 1 };
        return;
      }
      if (!rawByDay[dayIdx]) rawByDay[dayIdx] = [];
      rawByDay[dayIdx].push(base);
    });

    const byDay: Record<number, PositionedEvent[]> = {};
    Object.entries(rawByDay).forEach(([dayKey, items]) => {
      const sorted = [...items].sort((a, b) => a.startMin - b.startMin);
      const laneEnds: number[] = [];
      const withLane = sorted.map((it) => {
        let lane = laneEnds.findIndex((end) => end <= it.startMin);
        if (lane === -1) {
          lane = laneEnds.length;
          laneEnds.push(it.endMin);
        } else {
          laneEnds[lane] = it.endMin;
        }
        return { ...it, lane };
      });
      const total = Math.max(1, laneEnds.length);
      byDay[Number(dayKey)] = withLane.map((it) => ({
        ...it,
        totalLanes: total,
      }));
    });

    return { byDay, holidayByDay };
  }, [events, weekDays]);
}
