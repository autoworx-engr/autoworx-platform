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
  value: string;
  onChange: (value: string) => void;
  minTime?: string;
  maxTime?: string;
  step?: number;
  id?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
  labelClassName?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

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
  open: controlledOpen,
  onOpenChange,
}: Props) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = (next: boolean) => {
    if (controlledOpen === undefined) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };
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

  const hasSelectableMinute = (hour: number, period: Period) =>
    minutes.some((m) => !isOutOfRange(to24Hour(hour, m, period)));

  const isHourSelectable = (hour: number) =>
    PERIODS.some((period) => hasSelectableMinute(hour, period));

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

  const columnClass = "h-[200px] overflow-y-auto px-1 py-1";
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

        <Popover.Portal>
          <Popover.Content
            align="start"
            side="bottom"
            sideOffset={4}
            // Flip above / slide sideways instead of overflowing the viewport.
            avoidCollisions
            collisionPadding={8}
            className="z-[100] w-[260px] rounded-md border border-gray-200 bg-background shadow-lg"
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
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
