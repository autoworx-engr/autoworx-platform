"use client";

import { EventInput } from "@fullcalendar/core";
import moment from "moment";
import { CSSProperties, useEffect, useMemo, useRef } from "react";
import { useCalendarStore } from "@/stores/calendarStore";
import { TransposedWeekHeader } from "./TransposedWeekHeader";
import { TransposedWeekDayRow } from "./TransposedWeekDayRow";
import { PositionedEvent } from "./TransposedWeekEvent";
import { useTransposedWeekDrag } from "./useTransposedWeekDrag";
import { useTransposedLayout } from "./useTransposedLayout";
import {
  DAY_LABEL_WIDTH_PX,
  DAY_ROW_HEIGHT_PX,
  HOUR_WIDTH_PX,
  SLOT_WIDTH_PX,
  TOTAL_MINUTES,
  dateToMinutes,
  getWeekDays,
  minutesToPixels,
  parseTimeToMinutes,
  rowHeightForLanes,
} from "./transposedWeekUtils";
import styles from "./transposedWeek.module.css";

interface Props {
  events: EventInput[];
  firstDay: number;
  businessStart?: string;
  businessEnd?: string;
  session: any;
  onEventClick: (info: { event: any; jsEvent: any }) => void;
  onEventCommit: (info: {
    event: any;
    revert: () => void;
  }) => Promise<void> | void;
  onNativeDrop: (taskId: number, dateStr: string, time: string) => void;
  onDayClick: (date: Date) => void;
  scrollToTime?: string | null;
  onScrollHandled?: () => void;
}

export function TransposedWeekView({
  events,
  firstDay,
  businessStart,
  businessEnd,
  session,
  onEventClick,
  onEventCommit,
  onNativeDrop,
  onDayClick,
  scrollToTime,
  onScrollHandled,
}: Props) {
  const { date: storeDate } = useCalendarStore();
  const anchor = useMemo(
    () => (storeDate ? moment(storeDate) : moment()),
    [storeDate],
  );
  const weekDays = useMemo(
    () => getWeekDays(anchor, firstDay),
    [anchor, firstDay],
  );
  const scrollerRef = useRef<HTMLDivElement>(null);
  const hasInitialScrolledRef = useRef(false);
  const positioned = useTransposedLayout(events, weekDays);

  const commitChange = async ({
    event,
    newDayIndex,
    newStartMin,
    newEndMin,
  }: {
    event: PositionedEvent;
    newDayIndex: number;
    newStartMin: number;
    newEndMin: number;
  }) => {
    const targetDay = weekDays[newDayIndex];
    if (!targetDay) return false;
    const startDate = targetDay
      .clone()
      .startOf("day")
      .add(newStartMin, "minutes")
      .toDate();
    const endDate = targetDay
      .clone()
      .startOf("day")
      .add(newEndMin, "minutes")
      .toDate();

    let reverted = false;
    await onEventCommit({
      event: {
        id: event.id,
        extendedProps: event.extendedProps,
        start: startDate,
        end: endDate,
        allDay: false,
      },
      revert: () => {
        reverted = true;
      },
    });
    return !reverted;
  };

  const {
    state: dragState,
    startMove,
    startResize,
  } = useTransposedWeekDrag({ weekDays, onCommit: commitChange });

  useEffect(() => {
    if (!scrollToTime || !scrollerRef.current) return;
    scrollerRef.current.scrollLeft = Math.max(
      0,
      minutesToPixels(parseTimeToMinutes(scrollToTime)) - HOUR_WIDTH_PX,
    );
    hasInitialScrolledRef.current = true;
    onScrollHandled?.();
  }, [scrollToTime, onScrollHandled]);

  useEffect(() => {
    if (hasInitialScrolledRef.current || !scrollerRef.current || !businessStart)
      return;
    hasInitialScrolledRef.current = true;
    scrollerRef.current.scrollLeft = Math.max(
      0,
      minutesToPixels(parseTimeToMinutes(businessStart)) - HOUR_WIDTH_PX,
    );
  }, [businessStart]);

  const handleEventClickInternal = (event: PositionedEvent) => {
    onEventClick({
      event: {
        id: event.id,
        extendedProps: event.extendedProps,
        start: event.start,
        end: event.end,
        title: event.title,
      },
      jsEvent: { preventDefault: () => undefined },
    });
  };

  const handleNativeDropInternal = (
    e: React.DragEvent,
    day: moment.Moment,
    time: string,
  ) => {
    const transferData = e.dataTransfer.getData("text/plain");
    if (!transferData?.startsWith("task|")) return;
    const taskId = Number(transferData.replace("task|", ""));
    if (!taskId) return;
    onNativeDrop(taskId, day.format("YYYY-MM-DD"), time);
  };

  const today = moment();
  const todayDayIndex = weekDays.findIndex((d) => d.isSame(today, "day"));

  const displayByDay = useMemo(() => {
    if (
      dragState.phase !== "active" ||
      dragState.mode !== "move" ||
      !dragState.event
    )
      return positioned.byDay;
    const draggedId = dragState.event.id;
    const fromIdx = weekDays.findIndex(
      (wd) =>
        wd.format("YYYY-MM-DD") ===
        moment(dragState.event!.start).format("YYYY-MM-DD"),
    );
    const toIdx = dragState.liveDayIndex;
    if (fromIdx === -1 || fromIdx === toIdx) return positioned.byDay;
    const result: Record<number, PositionedEvent[]> = { ...positioned.byDay };
    result[fromIdx] = (positioned.byDay[fromIdx] ?? []).filter(
      (e) => e.id !== draggedId,
    );
    result[toIdx] = [
      ...(positioned.byDay[toIdx] ?? []),
      { ...dragState.event, lane: 0, totalLanes: 1 },
    ];
    return result;
  }, [
    positioned.byDay,
    dragState.phase,
    dragState.mode,
    dragState.event,
    dragState.liveDayIndex,
    weekDays,
  ]);

  const rowHeights = useMemo(
    () =>
      weekDays.map((_, idx) => {
        const lanes = displayByDay[idx]?.[0]?.totalLanes ?? 1;
        return rowHeightForLanes(lanes);
      }),
    [weekDays, displayByDay],
  );

  const nowLineTop = useMemo(() => {
    if (todayDayIndex === -1) return 0;
    let acc = 40;
    for (let i = 0; i < todayDayIndex; i++) acc += rowHeights[i] ?? 0;
    return acc;
  }, [todayDayIndex, rowHeights]);

  const gridStyle = {
    "--label-w": `${DAY_LABEL_WIDTH_PX}px`,
    "--row-h": `${DAY_ROW_HEIGHT_PX}px`,
    "--slot-w": `${SLOT_WIDTH_PX}px`,
    "--hour-w": `${HOUR_WIDTH_PX}px`,
    "--grid-w": `${minutesToPixels(TOTAL_MINUTES)}px`,
  } as CSSProperties;

  return (
    <div className={styles.viewWrapper}>
      <div ref={scrollerRef} className={styles.scroller}>
        <div className={styles.grid} style={gridStyle}>
          <TransposedWeekHeader />
          {weekDays.map((day, idx) => (
            <TransposedWeekDayRow
              key={day.format("YYYY-MM-DD")}
              day={day}
              dayIndex={idx}
              events={displayByDay[idx] ?? []}
              holidayEvent={positioned.holidayByDay[idx]}
              isToday={idx === todayDayIndex}
              isWeekend={day.day() === 0 || day.day() === 6}
              businessStart={businessStart}
              businessEnd={businessEnd}
              session={session}
              rowHeight={rowHeights[idx] ?? DAY_ROW_HEIGHT_PX}
              dragState={{
                phase: dragState.phase,
                mode: dragState.mode,
                event: dragState.event,
                liveLeft: dragState.liveLeft,
                liveWidth: dragState.liveWidth,
                liveDayIndex: dragState.liveDayIndex,
              }}
              onDayClick={(d) => onDayClick(d.toDate())}
              onEventClick={handleEventClickInternal}
              onEventMouseDown={startMove}
              onEventResizeMouseDown={startResize}
              onNativeDrop={handleNativeDropInternal}
            />
          ))}
          {todayDayIndex !== -1 && (
            <div
              className={styles.nowLine}
              style={{
                left: `${DAY_LABEL_WIDTH_PX + minutesToPixels(dateToMinutes(new Date()))}px`,
                top: `${nowLineTop}px`,
                height: `${rowHeights[todayDayIndex] ?? DAY_ROW_HEIGHT_PX}px`,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
