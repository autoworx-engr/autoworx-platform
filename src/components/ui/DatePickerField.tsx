"use client";

import { useState } from "react";
import { format, parse, isValid } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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
};

const FORMAT = "yyyy-MM-dd";

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

  return (
    <div className={cn("flex w-full flex-col gap-1.5", rootClassName)}>
      {label && (
        <Label className="flex items-center gap-1 text-base">
          {label}
          {required && <span className="text-destructive">*</span>}
        </Label>
      )}

      <Popover open={open} onOpenChange={setOpen}>
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
            <span className="truncate">
              {selected ? format(selected, "MMM d, yyyy") : placeholder}
            </span>
            <CalendarIcon className="h-4 w-4 shrink-0 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(date) => {
              handleSelect(date ? format(date, FORMAT) : "");
              setOpen(false);
            }}
            // Month + year dropdowns for quick navigation (like the native input).
            captionLayout="dropdown"
            startMonth={new Date(1950, 0)}
            endMonth={new Date(2050, 11)}
            defaultMonth={selected}
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
