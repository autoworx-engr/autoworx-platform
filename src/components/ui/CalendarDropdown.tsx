"use client";

import { cn } from "@/lib/cn";
import type { ChangeEvent, PointerEvent } from "react";
import { UI, type DropdownProps } from "react-day-picker";

type CalendarDropdownProps = DropdownProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// Stands in for react-day-picker's month/year dropdown, keeping its markup and
// classes so the caption renders unchanged. The native <select> is replaced
// because opening one needs a completed click, and inside a dialog this
// calendar's popup is torn down by the press before that happens.
export function CalendarDropdown({
  options = [],
  value,
  disabled,
  className,
  classNames,
  components,
  onChange,
  open,
  onOpenChange,
  ...rest
}: CalendarDropdownProps) {
  const selected = options.find((option) => option.value === value);
  const Chevron = components.Chevron;

  const onPress =
    (run: () => void) =>
    (event: PointerEvent): void => {
      event.preventDefault();
      run();
    };

  const pick = (next: number) => {
    onChange?.({
      target: { value: String(next) },
    } as ChangeEvent<HTMLSelectElement>);
    onOpenChange(false);
  };

  return (
    <span data-disabled={disabled} className={classNames[UI.DropdownRoot]}>
      {/* Same absolute, invisible overlay the native select occupied. */}
      <span
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={rest["aria-label"]}
        aria-expanded={open}
        className={cn(classNames[UI.Dropdown], className, "cursor-pointer")}
        onPointerDown={
          disabled ? undefined : onPress(() => onOpenChange(!open))
        }
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          onOpenChange(!open);
        }}
      />

      <span className={classNames[UI.CaptionLabel]} aria-hidden>
        {selected?.label}
        <Chevron
          orientation="down"
          size={18}
          className={classNames[UI.Chevron]}
        />
      </span>

      {open && (
        <span
          className="absolute left-0 top-full z-20 mt-1 flex max-h-48 min-w-full flex-col overflow-y-auto rounded-md border bg-popover p-1 text-sm font-medium shadow-md"
          // The dialog's scroll lock otherwise swallows the wheel in here.
          onWheel={(event) => event.stopPropagation()}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={option.disabled}
              className={cn(
                "whitespace-nowrap rounded px-2 py-1 text-left transition-colors hover:bg-accent disabled:opacity-50",
                option.value === value &&
                  "bg-primary text-primary-foreground hover:bg-primary",
              )}
              onPointerDown={onPress(() => pick(option.value))}
            >
              {option.label}
            </button>
          ))}
        </span>
      )}
    </span>
  );
}
