"use client";

import {
  format,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from "date-fns";
import { Calendar as CalendarIcon, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const PRESETS: { label: string; getRange: () => [Date, Date] }[] = [
  { label: "Today", getRange: () => [new Date(), new Date()] },
  {
    label: "Last 7 days",
    getRange: () => [subDays(new Date(), 6), new Date()],
  },
  { label: "This week", getRange: () => [startOfWeek(new Date()), new Date()] },
  {
    label: "Last 30 days",
    getRange: () => [subDays(new Date(), 29), new Date()],
  },
  {
    label: "This month",
    getRange: () => [startOfMonth(new Date()), new Date()],
  },
  {
    label: "Last month",
    getRange: () => {
      const lastMonth = subMonths(new Date(), 1);
      return [startOfMonth(lastMonth), subDays(startOfMonth(new Date()), 1)];
    },
  },
];

function matchesPreset(
  startDate: string,
  endDate: string,
  preset: (typeof PRESETS)[number],
) {
  const [start, end] = preset.getRange();
  return (
    startDate === format(start, "yyyy-MM-dd") &&
    endDate === format(end, "yyyy-MM-dd")
  );
}

export default function ClickupDateRangePicker({
  startDate,
  endDate,
  onChange,
}: {
  startDate: string;
  endDate: string;
  onChange: (startDate: string, endDate: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const label =
    startDate === endDate
      ? format(new Date(startDate), "MMM d, yyyy")
      : `${format(new Date(startDate), "MMM d")} – ${format(new Date(endDate), "MMM d, yyyy")}`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <CalendarIcon className="h-4 w-4" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        <div className="p-2">
          {PRESETS.map((preset) => {
            const active = matchesPreset(startDate, endDate, preset);
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  const [start, end] = preset.getRange();
                  onChange(
                    format(start, "yyyy-MM-dd"),
                    format(end, "yyyy-MM-dd"),
                  );
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
              >
                {preset.label}
                {active && <Check className="h-4 w-4 font-bold text-primary" />}
              </button>
            );
          })}
        </div>
        <div className="border-t border-border p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Custom range
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="w-9 shrink-0 text-xs text-muted-foreground">
                From
              </label>
              <Input
                type="date"
                value={startDate}
                max={endDate}
                onChange={(e) => onChange(e.target.value, endDate)}
                className="h-8 w-full min-w-0 text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="w-9 shrink-0 text-xs text-muted-foreground">
                To
              </label>
              <Input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => onChange(startDate, e.target.value)}
                className="h-8 w-full min-w-0 text-xs"
              />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
