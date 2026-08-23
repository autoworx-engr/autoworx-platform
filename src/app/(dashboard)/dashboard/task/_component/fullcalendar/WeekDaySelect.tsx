"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/cn";

export const WEEK_DAYS = [
  "Saturday",
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
];

type TWeekDaySelectProps = {
  id: string;
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
  ariaLabel?: string;
};

export default function WeekDaySelect({
  id,
  value,
  onValueChange,
  open,
  onOpenChange,
  className,
  ariaLabel,
}: TWeekDaySelectProps) {
  return (
    <Select
      value={value}
      onValueChange={onValueChange}
      open={open}
      onOpenChange={onOpenChange}
    >
      <SelectTrigger
        size="md"
        id={id}
        aria-label={ariaLabel}
        className={cn("h-9 !w-full rounded-md px-3 shadow-sm", className)}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="start" sideOffset={4}>
        {WEEK_DAYS.map((day) => (
          <SelectItem key={day} value={day}>
            {day}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
