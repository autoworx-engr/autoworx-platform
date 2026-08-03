"use client";

import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import * as Popover from "@radix-ui/react-popover";
import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const PERIODS = ["AM", "PM"] as const;

type Period = (typeof PERIODS)[number];

/** "HH:mm" (24h) -> { hour: 1-12, minute, period }. Null when unset/invalid. */
function parse24Hour(value: string) {
  if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(value)) return null;
  const [h, m] = value.split(":").map(Number);
  return {
    hour: h % 12 || 12,
    minute: m,
    period: (h >= 12 ? "PM" : "AM") as Period,
  };
}

/** { hour: 1-12, minute, period } -> "HH:mm" (24h). */
function to24Hour(hour: number, minute: number, period: Period) {
  let h = hour;
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function formatLabel(value: string) {
  const parsed = parse24Hour(value);
  if (!parsed) return "";
  const { hour, minute, period } = parsed;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${period}`;
}

type Props = {
  label: string;
  /** Selected time as "HH:mm" (24h). Empty string when nothing is chosen. */
  value: string;
  /** Emits "HH:mm" (24h) — only fires once a full hour+minute+period is known. */
  onChange: (value: string) => void;
  /** Earliest selectable "HH:mm"; later times stay enabled. */
  minTime?: string;
  /** Latest selectable "HH:mm"; earlier times stay enabled. */
  maxTime?: string;
  /** Minute granularity in minutes. */
  step?: number;
  id?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
  /** Overrides the label's default `text-base` to match surrounding labels. */
  labelClassName?: string;
};

/**
 * Three-column Hour / Minute / AM-PM time picker.
 *
 * Each column commits immediately against the currently-shown time, so the
 * value is always a complete "HH:mm" and never a half-built selection. When
 * nothing is selected yet the picker previews 12:00 PM without emitting it —
 * the first click on any column is what commits a real value.
 */
export function TimeScrollPicker({
  label,
  value,
  onChange,
  minTime,
  maxTime,
  step = 15,
  id,
  required = false,
  placeholder = label,
  className,
  labelClassName,
}: Props) {
  const [open, setOpen] = useState(false);
  const hourColumnRef = useRef<HTMLDivElement>(null);

  const minutes = useMemo(() => {
    const safeStep = step > 0 && step <= 60 ? step : 15;
    return Array.from(
      { length: Math.ceil(60 / safeStep) },
      (_, i) => i * safeStep,
    );
  }, [step]);

  const selected = parse24Hour(value);
  // Preview target for column highlighting before anything is committed.
  const draft = selected ?? { hour: 12, minute: 0, period: "PM" as Period };

  const isOutOfRange = (candidate: string) =>
    (!!minTime && candidate < minTime) || (!!maxTime && candidate > maxTime);

  /**
   * An hour/period is offered only if at least one minute in the step grid
   * lands inside the allowed range — otherwise the user could pick an hour
   * and find every minute disabled.
   */
  const hasSelectableMinute = (hour: number, period: Period) =>
    minutes.some((m) => !isOutOfRange(to24Hour(hour, m, period)));

  /**
   * An hour stays enabled if it works in *either* period. Judging it against
   * only the previewed period would wrongly disable e.g. 11 under a 22:45 cap,
   * where 11 PM is out of range but 11 AM is perfectly valid.
   */
  const isHourSelectable = (hour: number) =>
    PERIODS.some((period) => hasSelectableMinute(hour, period));

  /**
   * Commits a change, falling back through period then minute so a click on a
   * valid-in-principle cell always lands on a real time.
   */
  const commit = (hour: number, minute: number, period: Period) => {
    // Prefer the requested period, then the other one.
    const periodOrder: Period[] = period === "AM" ? ["AM", "PM"] : ["PM", "AM"];

    for (const candidatePeriod of periodOrder) {
      const exact = to24Hour(hour, minute, candidatePeriod);
      if (!isOutOfRange(exact)) {
        onChange(exact);
        return;
      }
    }

    for (const candidatePeriod of periodOrder) {
      const fallback = minutes
        .map((m) => to24Hour(hour, m, candidatePeriod))
        .find((candidate) => !isOutOfRange(candidate));
      if (fallback) {
        onChange(fallback);
        return;
      }
    }
  };

  // Centre the selected hour when the panel opens. Sets scrollTop directly
  // rather than using scrollIntoView, which would also scroll the surrounding
  // modal and leave the column itself stuck.
  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => {
      const column = hourColumnRef.current;
      const active = column?.querySelector<HTMLElement>(
        "[data-selected='true']",
      );
      if (!column || !active) return;
      column.scrollTop =
        active.offsetTop - column.clientHeight / 2 + active.clientHeight / 2;
    });
    return () => cancelAnimationFrame(raf);
  }, [open]);

  const columnClass = "thin-scrollbar h-[200px] overflow-y-auto px-1 py-1";
  const cellClass =
    "w-full rounded px-2 py-1 text-center text-sm transition-colors hover:bg-gray-100";
  const activeClass = "bg-primary text-white hover:bg-primary";
  const disabledClass = "cursor-not-allowed text-gray-300 hover:bg-transparent";

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id} className={cn("text-base", labelClassName)}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>

      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          {/* Trigger mirrors DatePickerField's button so date and time fields
              line up at the same height in the shared grid row. */}
          <Button
            id={id}
            type="button"
            variant="outline"
            className={cn(
              "h-9 w-full justify-between gap-2 rounded-md border-input bg-transparent px-3 font-normal shadow-sm",
              "hover:bg-transparent focus-visible:ring-1 focus-visible:ring-ring",
              !selected && "text-muted-foreground",
            )}
          >
            <span>{selected ? formatLabel(value) : placeholder}</span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </Popover.Trigger>

        {/* Rendered inline rather than in a portal: this picker is used inside
            Radix Dialogs, whose pointer-event trap would otherwise swallow
            wheel scrolling in the columns below. */}
        <Popover.Content
          align="start"
          sideOffset={4}
          className="z-50 w-[260px] rounded-md border border-gray-200 bg-background shadow-lg"
          onWheel={(event) => event.stopPropagation()}
        >
          <div className="grid grid-cols-3 divide-x divide-gray-200 border-b border-gray-200 text-center text-sm font-medium">
            <div className="py-2">Hour</div>
            <div className="py-2">Minute</div>
            <div className="py-2">AM/PM</div>
          </div>

          <div className="grid grid-cols-3 divide-x divide-gray-200">
            <div className={columnClass} ref={hourColumnRef}>
              {HOURS.map((hour) => {
                const disabled = !isHourSelectable(hour);
                const active = selected?.hour === hour;
                return (
                  <button
                    key={hour}
                    type="button"
                    data-selected={active}
                    disabled={disabled}
                    className={cn(
                      cellClass,
                      active && activeClass,
                      disabled && disabledClass,
                    )}
                    onClick={() => commit(hour, draft.minute, draft.period)}
                  >
                    {hour}
                  </button>
                );
              })}
            </div>

            <div className={columnClass}>
              {minutes.map((minute) => {
                // Once a period is committed, honour it strictly; while still
                // previewing, allow any minute valid in either period so the
                // preview can't hide otherwise-reachable times.
                const disabled = selected
                  ? isOutOfRange(to24Hour(draft.hour, minute, draft.period))
                  : !PERIODS.some(
                      (period) =>
                        !isOutOfRange(to24Hour(draft.hour, minute, period)),
                    );
                const active = selected?.minute === minute;
                return (
                  <button
                    key={minute}
                    type="button"
                    disabled={disabled}
                    className={cn(
                      cellClass,
                      active && activeClass,
                      disabled && disabledClass,
                    )}
                    onClick={() => commit(draft.hour, minute, draft.period)}
                  >
                    {String(minute).padStart(2, "0")}
                  </button>
                );
              })}
            </div>

            <div className={cn(columnClass, "flex flex-col gap-1 pt-3")}>
              {PERIODS.map((period) => {
                const disabled = !hasSelectableMinute(draft.hour, period);
                const active = selected?.period === period;
                return (
                  <button
                    key={period}
                    type="button"
                    disabled={disabled}
                    className={cn(
                      cellClass,
                      "py-2",
                      active && activeClass,
                      disabled && disabledClass,
                    )}
                    onClick={() => commit(draft.hour, draft.minute, period)}
                  >
                    {period}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-gray-200 px-3 py-2 text-sm">
            Selected:{" "}
            <span className="font-medium">
              {selected ? formatLabel(value) : "--:-- --"}
            </span>
          </div>
        </Popover.Content>
      </Popover.Root>
    </div>
  );
}
