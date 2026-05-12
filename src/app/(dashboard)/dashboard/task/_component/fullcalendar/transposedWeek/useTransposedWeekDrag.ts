"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import moment from "moment";
import { PositionedEvent } from "./TransposedWeekEvent";
import {
  DAY_ROW_HEIGHT_PX,
  SLOT_MINUTES,
  minutesToPixels,
  pixelsToMinutes,
} from "./transposedWeekUtils";

type Mode = "move" | "resize" | null;

interface DragState {
  mode: Mode;
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

const initial: DragState = {
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
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const findDayIndex = useCallback(
    (eventDate: Date) => {
      const d = moment(eventDate).format("YYYY-MM-DD");
      return weekDays.findIndex((wd) => wd.format("YYYY-MM-DD") === d);
    },
    [weekDays],
  );

  const startMove = useCallback(
    (e: React.MouseEvent, event: PositionedEvent) => {
      if (event.extendedProps?.serviceType === "Holiday") return;
      e.preventDefault();
      const dayIndex = findDayIndex(event.start);
      setState({
        mode: "move",
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

  const startResize = useCallback(
    (e: React.MouseEvent, event: PositionedEvent) => {
      if (event.extendedProps?.serviceType === "Holiday") return;
      e.preventDefault();
      const dayIndex = findDayIndex(event.start);
      setState({
        mode: "resize",
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

  useEffect(() => {
    if (!state.mode) return;

    const onMouseMove = (e: MouseEvent) => {
      const s = stateRef.current;
      if (!s.mode || !s.event) return;
      const dx = e.clientX - s.startX;
      const dy = e.clientY - s.startY;

      if (s.mode === "move") {
        const snappedDx = minutesToPixels(pixelsToMinutes(dx));
        const newLeft = Math.max(0, s.originLeft + snappedDx);
        const dayDelta = Math.round(dy / DAY_ROW_HEIGHT_PX);
        const newDayIndex = Math.max(
          0,
          Math.min(6, s.originDayIndex + dayDelta),
        );
        setState((prev) => ({
          ...prev,
          liveLeft: newLeft,
          liveDayIndex: newDayIndex,
        }));
      } else {
        const snappedDx = minutesToPixels(pixelsToMinutes(dx));
        const minWidth = minutesToPixels(SLOT_MINUTES);
        const newWidth = Math.max(minWidth, s.originWidth + snappedDx);
        setState((prev) => ({ ...prev, liveWidth: newWidth }));
      }
    };

    const onMouseUp = async () => {
      const s = stateRef.current;
      if (!s.mode || !s.event) {
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

      const success = await onCommit({
        event: s.event,
        newDayIndex,
        newStartMin,
        newEndMin,
      });
      if (!success) {
        // Revert visual — state reset to initial discards the live offsets
      }
      setState(initial);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [state.mode, onCommit]);

  return { state, startMove, startResize };
}
