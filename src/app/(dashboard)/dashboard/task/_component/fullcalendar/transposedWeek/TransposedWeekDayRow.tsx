import { CSSProperties } from "react";
import moment from "moment";
import { PositionedEvent, TransposedWeekEvent } from "./TransposedWeekEvent";
import {
  minutesToPixels,
  parseTimeToMinutes,
  TOTAL_MINUTES,
} from "./transposedWeekUtils";
import styles from "./transposedWeek.module.css";

interface Props {
  day: moment.Moment;
  events: PositionedEvent[];
  isToday: boolean;
  isWeekend: boolean;
  holidayEvent?: PositionedEvent;
  businessStart?: string;
  businessEnd?: string;
  session: any;
  rowHeight: number;
  dragState: {
    phase: "idle" | "pending" | "active";
    mode: "move" | "resize" | null;
    event: PositionedEvent | null;
    liveLeft: number;
    liveWidth: number;
    liveDayIndex: number;
  };
  dayIndex: number;
  onDayClick: (day: moment.Moment) => void;
  onEventClick: (event: PositionedEvent) => void;
  onEventMouseDown: (e: React.MouseEvent, event: PositionedEvent) => void;
  onEventResizeMouseDown: (e: React.MouseEvent, event: PositionedEvent) => void;
  onNativeDrop: (e: React.DragEvent, day: moment.Moment, time: string) => void;
}

export function TransposedWeekDayRow({
  day,
  events,
  isToday,
  isWeekend,
  holidayEvent,
  businessStart,
  businessEnd,
  session,
  rowHeight,
  dragState,
  dayIndex,
  onDayClick,
  onEventClick,
  onEventMouseDown,
  onEventResizeMouseDown,
  onNativeDrop,
}: Props) {
  const cellHeightStyle = { height: `${rowHeight}px` } as CSSProperties;
  const labelClass = [styles.dayLabel, isToday ? styles.dayLabelToday : ""]
    .filter(Boolean)
    .join(" ");

  const laneClass = [styles.dayLane, holidayEvent ? styles.holidayLane : ""]
    .filter(Boolean)
    .join(" ");

  const bizStart = businessStart ? parseTimeToMinutes(businessStart) : 0;
  const bizEnd = businessEnd ? parseTimeToMinutes(businessEnd) : TOTAL_MINUTES;
  const showNonBusiness = !!businessStart && !!businessEnd;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const mins = Math.max(0, Math.round(x / minutesToPixels(15)) * 15);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const time = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
    onNativeDrop(e, day, time);
  };

  return (
    <>
      <div
        className={labelClass}
        style={cellHeightStyle}
        onClick={() => onDayClick(day)}
      >
        <span className={styles.dayName}>{day.format("ddd")}</span>
        <span className={styles.dayNum}>{day.format("D")}</span>
      </div>
      <div
        className={laneClass}
        style={cellHeightStyle}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        data-day-index={dayIndex}
      >
        {showNonBusiness && bizStart > 0 && (
          <div
            className={styles.nonBusiness}
            style={
              {
                left: 0,
                width: `${minutesToPixels(bizStart)}px`,
              } as CSSProperties
            }
          />
        )}
        {showNonBusiness && bizEnd < TOTAL_MINUTES && (
          <div
            className={styles.nonBusiness}
            style={
              {
                left: `${minutesToPixels(bizEnd)}px`,
                width: `${minutesToPixels(TOTAL_MINUTES - bizEnd)}px`,
              } as CSSProperties
            }
          />
        )}
        {holidayEvent && (
          <div
            className={styles.holidayBadge}
            onClick={(e) => {
              e.stopPropagation();
              onEventClick(holidayEvent);
            }}
          >
            {holidayEvent.title || "Holiday"}
          </div>
        )}
        {events.map((event) => {
          const isActive =
            dragState.phase === "active" &&
            dragState.event?.sliceKey === event.sliceKey;
          const isMoveActive = isActive && dragState.mode === "move";
          const isResizeActive = isActive && dragState.mode === "resize";
          const shouldRenderHere =
            !isMoveActive || dragState.liveDayIndex === dayIndex;
          if (!shouldRenderHere) return null;
          return (
            <TransposedWeekEvent
              key={event.sliceKey}
              event={event}
              session={session}
              isDragging={isMoveActive}
              isResizing={isResizeActive}
              liveLeft={isMoveActive ? dragState.liveLeft : undefined}
              liveWidth={isResizeActive ? dragState.liveWidth : undefined}
              onMouseDownMove={onEventMouseDown}
              onMouseDownResize={onEventResizeMouseDown}
              onClick={onEventClick}
            />
          );
        })}
      </div>
    </>
  );
}
