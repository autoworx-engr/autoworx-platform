"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import moment from "moment";
import { PositionedEvent } from "./TransposedWeekEvent";
import {
  SLOT_MINUTES,
  minutesToPixels,
  pixelsToMinutes,
} from "./transposedWeekUtils";

type Mode = "move" | "resize";
type Phase = "idle" | "pending" | "active";

interface DragState {
  phase: Phase;
  mode: Mode | null;
  event: PositionedEvent | null;
  startX: number;
  startY: number;
  originLeft: number;
  originWidth: number;
  originDayIndex: number;
  liveLeft: number;
  liveWidth: number;
  liveDayIndex: number;
}

interface CommitArgs {
  event: PositionedEvent;
  newDayIndex: number;
  newStartMin: number;
  newEndMin: number;
}

interface Options {
  weekDays: moment.Moment[];
  onCommit: (args: CommitArgs) => Promise<boolean>;
}

const DRAG_THRESHOLD_PX = 5;

const initial: DragState = {
  phase: "idle",
  mode: null,
  event: null,
  startX: 0,
  startY: 0,
  originLeft: 0,
  originWidth: 0,
  originDayIndex: 0,
  liveLeft: 0,
  liveWidth: 0,
  liveDayIndex: 0,
};

export function useTransposedWeekDrag({ weekDays, onCommit }: Options) {
  const [state, setState] = useState<DragState>(initial);
  const stateRef = useRef(state);
  const dayCountRef = useRef(weekDays.length);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  useEffect(() => {
    dayCountRef.current = weekDays.length;
  }, [weekDays.length]);

  const findDayIndex = useCallback(
    (eventDate: Date) => {
      const d = moment(eventDate).format("YYYY-MM-DD");
      return weekDays.findIndex((wd) => wd.format("YYYY-MM-DD") === d);
    },
    [weekDays],
  );

  const beginPending = useCallback(
    (mode: Mode, e: React.MouseEvent, event: PositionedEvent) => {
      if (event.extendedProps?.serviceType === "Holiday") return;
      const dayIndex = findDayIndex(event.start);
      setState({
        phase: "pending",
        mode,
        event,
        startX: e.clientX,
        startY: e.clientY,
        originLeft: event.left,
        originWidth: event.width,
        originDayIndex: dayIndex,
        liveLeft: event.left,
        liveWidth: event.width,
        liveDayIndex: dayIndex,
      });
    },
    [findDayIndex],
  );

  const startMove = useCallback(
    (e: React.MouseEvent, event: PositionedEvent) =>
      beginPending("move", e, event),
    [beginPending],
  );

  const startResize = useCallback(
    (e: React.MouseEvent, event: PositionedEvent) =>
      beginPending("resize", e, event),
    [beginPending],
  );

  useEffect(() => {
    if (state.phase === "idle") return;

    const onMouseMove = (e: MouseEvent) => {
      const s = stateRef.current;
      if (s.phase === "idle" || !s.event || !s.mode) return;
      const dx = e.clientX - s.startX;
      const dy = e.clientY - s.startY;

      if (
        s.phase === "pending" &&
        Math.abs(dx) < DRAG_THRESHOLD_PX &&
        Math.abs(dy) < DRAG_THRESHOLD_PX
      )
        return;

      const snappedDx = minutesToPixels(pixelsToMinutes(dx));
      if (s.mode === "move") {
        const newLeft = Math.max(0, s.originLeft + snappedDx);
        const elAtCursor = document.elementFromPoint(e.clientX, e.clientY);
        const laneEl = elAtCursor?.closest<HTMLElement>("[data-day-index]");
        const hoveredIdx = laneEl
          ? Number(laneEl.dataset.dayIndex)
          : s.originDayIndex;
        const newDayIndex = Math.max(
          0,
          Math.min(dayCountRef.current - 1, hoveredIdx),
        );
        setState((prev) => ({
          ...prev,
          phase: "active",
          liveLeft: newLeft,
          liveDayIndex: newDayIndex,
        }));
      } else {
        const minWidth = minutesToPixels(SLOT_MINUTES);
        const newWidth = Math.max(minWidth, s.originWidth + snappedDx);
        setState((prev) => ({
          ...prev,
          phase: "active",
          liveWidth: newWidth,
        }));
      }
    };

    const onMouseUp = async () => {
      const s = stateRef.current;
      if (s.phase !== "active" || !s.event || !s.mode) {
        setState(initial);
        return;
      }
      const newStartMin =
        s.mode === "move" ? pixelsToMinutes(s.liveLeft) : s.event.startMin;
      const duration =
        s.mode === "move"
          ? s.event.endMin - s.event.startMin
          : pixelsToMinutes(s.liveWidth);
      const newEndMin = newStartMin + duration;
      const newDayIndex = s.mode === "move" ? s.liveDayIndex : s.originDayIndex;

      const changed =
        newStartMin !== s.event.startMin ||
        newEndMin !== s.event.endMin ||
        newDayIndex !== s.originDayIndex;

      if (!changed) {
        setState(initial);
        return;
      }

      await onCommit({
        event: s.event,
        newDayIndex,
        newStartMin,
        newEndMin,
      });
      setState(initial);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [state.phase, onCommit]);

  return { state, startMove, startResize };
}
