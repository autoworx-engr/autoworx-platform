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

type RawSlice = Omit<PositionedEvent, "lane" | "totalLanes">;

export function useTransposedLayout(
  events: EventInput[],
  weekDays: moment.Moment[],
): LayoutResult {
  return useMemo(() => {
    const rawByDay: Record<number, RawSlice[]> = {};
    const holidayByDay: Record<number, PositionedEvent> = {};

    const pushSlice = (dayIdx: number, slice: RawSlice, isHoliday: boolean) => {
      if (isHoliday) {
        holidayByDay[dayIdx] = { ...slice, lane: 0, totalLanes: 1 };
        return;
      }
      if (!rawByDay[dayIdx]) rawByDay[dayIdx] = [];
      rawByDay[dayIdx].push(slice);
    };

    events.forEach((ev) => {
      const start =
        ev.start instanceof Date ? ev.start : new Date(ev.start as string);
      const endRaw = ev.end
        ? ev.end instanceof Date
          ? ev.end
          : new Date(ev.end as string)
        : null;

      const type = (ev.extendedProps as any)?.type;
      const serviceType = (ev.extendedProps as any)?.serviceType;
      if (type === "weekend") return;

      const startDateStr = moment(start).format("YYYY-MM-DD");
      const endDateStr = endRaw
        ? moment(endRaw).format("YYYY-MM-DD")
        : startDateStr;
      const isMultiDay = endDateStr > startDateStr;
      const isHoliday = type === "holiday" || serviceType === "Holiday";

      const startTimeMin = ev.allDay ? 0 : dateToMinutes(start);
      const endTimeMin = ev.allDay
        ? TOTAL_MINUTES
        : endRaw
          ? dateToMinutes(endRaw)
          : startTimeMin + 60;

      const buildSlice = (
        dateKey: string,
        startMin: number,
        endMin: number,
      ): RawSlice => ({
        id: String(ev.id),
        sliceKey: isMultiDay ? `${ev.id}__${dateKey}` : String(ev.id),
        title: String(ev.title ?? ""),
        start,
        end: endRaw ?? new Date(start.getTime() + 60 * 60 * 1000),
        extendedProps: ev.extendedProps as any,
        startMin,
        endMin,
        left: minutesToPixels(startMin),
        width: minutesToPixels(Math.max(15, endMin - startMin)),
        isMultiDay,
      });

      if (!isMultiDay) {
        const dayIdx = weekDays.findIndex(
          (wd) => wd.format("YYYY-MM-DD") === startDateStr,
        );
        if (dayIdx === -1) return;
        const singleEnd = Math.max(startTimeMin + 15, endTimeMin);
        pushSlice(
          dayIdx,
          buildSlice(startDateStr, startTimeMin, singleEnd),
          isHoliday,
        );
        return;
      }

      const cursor = moment.utc(startDateStr).startOf("day");
      const last = moment.utc(endDateStr).startOf("day");
      while (cursor.isSameOrBefore(last, "day")) {
        const dateKey = cursor.format("YYYY-MM-DD");
        const dayIdx = weekDays.findIndex(
          (wd) => wd.format("YYYY-MM-DD") === dateKey,
        );
        if (dayIdx !== -1) {
          const isFirst = dateKey === startDateStr;
          const isLast = dateKey === endDateStr;
          const sliceStart = isFirst ? startTimeMin : 0;
          const sliceEnd = isLast ? endTimeMin : TOTAL_MINUTES;
          pushSlice(
            dayIdx,
            buildSlice(dateKey, sliceStart, sliceEnd),
            isHoliday,
          );
        }
        cursor.add(1, "day");
      }
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
