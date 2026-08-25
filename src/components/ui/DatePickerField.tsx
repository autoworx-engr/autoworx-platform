"use client";

import { useState } from "react";
import { format, parse, isValid } from "date-fns";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { todayInTimezone } from "@/utils/todayInTimezone";

type DatePickerFieldProps = {
  value?: string;
  onChange?: (value: string) => void;
  name?: string;
  defaultValue?: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  rootClassName?: string;
  triggerClassName?: string;
  /** Show a clear (X) button when a date is selected. */
  clearable?: boolean;
  /** Earliest selectable date; earlier days are disabled in the calendar. */
  minDate?: Date;
  /** Latest selectable date; later days are disabled in the calendar. */
  maxDate?: Date;
  /** Years before the current one to offer in the year dropdown. */
  yearsBack?: number;
  /** Years after the current one to offer in the year dropdown. */
  yearsForward?: number;
  /** IANA zone that decides which day counts as today. Defaults to the browser. */
  timezone?: string;
};

const FORMAT = "yyyy-MM-dd";
// User-facing display format.
const DISPLAY_FORMAT = "MM/dd/yyyy";

export function DatePickerField({
  value,
  onChange,
  name,
  defaultValue,
  label,
  placeholder = "Select date",
  required,
  disabled,
  error,
  rootClassName,
  triggerClassName,
  clearable = false,
  minDate,
  maxDate,
  // These fields hold scheduling and record dates, so the year dropdown starts
  // near today instead of spanning a century the user has to scroll through.
  // Widen per call site if a field ever needs distant years (a birth date, say).
  yearsBack = 5,
  yearsForward = 10,
  timezone,
}: DatePickerFieldProps) {
  const [open, setOpen] = useState(false);

  const [internal, setInternal] = useState(defaultValue ?? "");
  const current = value ?? internal;

  const selected =
    current && isValid(parse(current, FORMAT, new Date()))
      ? parse(current, FORMAT, new Date())
      : undefined;

  const handleSelect = (next: string) => {
    setInternal(next);
    onChange?.(next);
  };

  // Anchored on the company's day, not the viewer's, so the calendar marks the
  // right "today" for a user sitting in another timezone.
  const today = todayInTimezone(timezone);

  const currentYear = today.getFullYear();
  const boundYears = [selected, minDate, maxDate]
    .filter((d): d is Date => !!d)
    .map((d) => d.getFullYear());
  const startYear = Math.min(currentYear - yearsBack, ...boundYears);
  const endYear = Math.max(currentYear + yearsForward, ...boundYears);
  const startMonth = new Date(startYear, 0);
  const endMonth = new Date(endYear, 11);

  return (
    <div className={cn("flex w-full flex-col gap-1.5", rootClassName)}>
      {label && (
        <Label className="flex items-center gap-1 text-base">
          {label}
          {required && <span className="text-destructive">*</span>}
        </Label>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <div className="relative">
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              className={cn(
                "h-9 w-full justify-between gap-2 rounded-md border-input bg-transparent px-3 font-normal shadow-sm",
                "hover:bg-transparent focus-visible:ring-1 focus-visible:ring-ring",
                !selected && "text-muted-foreground",
                error && "border-destructive focus-visible:ring-destructive/30",
                triggerClassName,
              )}
            >
              <span>
                {selected ? format(selected, DISPLAY_FORMAT) : placeholder}
              </span>
            </Button>
          </PopoverTrigger>

          {clearable && selected && !disabled && (
            <button
              type="button"
              aria-label="Clear date"
              onClick={(e) => {
                e.stopPropagation();
                handleSelect("");
              }}
              className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(date) => {
              handleSelect(date ? format(date, FORMAT) : "");
              setOpen(false);
            }}
            disabled={
              minDate || maxDate
                ? [
                    ...(minDate ? [{ before: minDate }] : []),
                    ...(maxDate ? [{ after: maxDate }] : []),
                  ]
                : undefined
            }
            // Month + year dropdowns for quick navigation (like the native input).
            captionLayout="dropdown"
            startMonth={startMonth}
            endMonth={endMonth}
            defaultMonth={selected ?? today}
            today={today}
            autoFocus
          />
        </PopoverContent>
      </Popover>

      {name && <input type="hidden" name={name} value={current} readOnly />}

      {error && (
        <div className="mt-1 flex items-center gap-1.5 px-1">
          <div className="h-1.5 w-1.5 rounded-full bg-destructive" />
          <span className="text-xs font-medium text-destructive">{error}</span>
        </div>
      )}
    </div>
  );
}
