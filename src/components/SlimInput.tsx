import type { ComponentProps, ReactNode } from "react";
import { sentenceCase } from "change-case";
import { cn } from "@/lib/cn";
import { Tooltip } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import { CalendarDays } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type SlimInputProps = {
  label?: ReactNode;
  name: string;
  rootClassName?: string;
  labelClassName?: string;
  required?: boolean;
  error?: string;
  tooltipText?: string;
};

export const slimInputClassName = cn(
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors",
  "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
  "disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
);

export function SlimInput({
  label,
  className,
  rootClassName,
  labelClassName,
  required,
  error,
  tooltipText,
  ...props
}: SlimInputProps & ComponentProps<"input">) {
  // Generate a unique ID if not provided, for accessibility
  const inputId = props.id ?? props.name;
  const IconComponent = InfoCircleOutlined;

  const isDateLike =
    props.type === "date" ||
    props.type === "time" ||
    props.type === "datetime-local" ||
    props.type === "month";
  const isEmptyDate =
    isDateLike &&
    (props.value === undefined || props.value === null || props.value === "") &&
    (props.defaultValue === undefined ||
      props.defaultValue === null ||
      props.defaultValue === "");
  const datePlaceholder =
    typeof props.placeholder === "string" && props.placeholder.length > 0
      ? props.placeholder
      : props.type === "time"
        ? "Select time"
        : "Select date";

  return (
    <div className={cn("group flex flex-col gap-1.5", rootClassName)}>
      <Label
        htmlFor={inputId}
        className={cn("flex items-center gap-1 text-base", labelClassName)}
      >
        {label ?? sentenceCase(props.name)}
        {required && <span className="font-bold text-destructive">*</span>}
        {tooltipText && (
          <Tooltip title={tooltipText} placement="top">
            <IconComponent className="cursor-help text-xs text-muted-foreground hover:text-foreground" />
          </Tooltip>
        )}
      </Label>

      <div className="relative">
        <Input
          id={inputId}
          required={required}
          data-empty={isEmptyDate || undefined}
          className={cn(
            // Normalize native date/time inputs so they don't balloon on mobile
            isDateLike &&
              cn(
                "h-[38px] appearance-none",
                // FIX (font): the native date/time value (rendered by the
                // browser via this pseudo-element, not by our own text
                // node) doesn't inherit `font-medium`/`text-base` from
                // `slimInputClassName` the way a plain text value does.
                // Left unset, that made date fields (e.g. "Assigned Date")
                // render visibly lighter/differently-sized than sibling
                // text fields like "Amount", even though both use the same
                // input classes. Pin the weight and size explicitly so the
                // rendered value matches.
                "[&::-webkit-date-and-time-value]:font-medium [&::-webkit-date-and-time-value]:text-base [&::-webkit-date-and-time-value]:text-left [&::-webkit-date-and-time-value]:m-0",
                "[&::-webkit-calendar-picker-indicator]:opacity-60",
                "data-[empty]:[&::-webkit-datetime-edit]:opacity-0",
                "data-[empty]:[&::-webkit-calendar-picker-indicator]:absolute",
                "data-[empty]:[&::-webkit-calendar-picker-indicator]:inset-0",
                "data-[empty]:[&::-webkit-calendar-picker-indicator]:m-0",
                "data-[empty]:[&::-webkit-calendar-picker-indicator]:h-full",
                "data-[empty]:[&::-webkit-calendar-picker-indicator]:w-full",
                "data-[empty]:[&::-webkit-calendar-picker-indicator]:cursor-pointer",
                "data-[empty]:[&::-webkit-calendar-picker-indicator]:opacity-0",
              ),
            // Error state styling overrides
            error &&
              "border-destructive text-destructive focus-visible:ring-destructive/30",
            className,
          )}
          {...props}
        />
        {isEmptyDate && (
          <span className="pointer-events-none absolute inset-y-0 left-3 right-3 flex items-center justify-between text-md text-muted-foreground">
            <span>{datePlaceholder}</span>
            <CalendarDays className="h-4 w-4 opacity-60" />
          </span>
        )}
      </div>

      {/* Error Message with subtle slide-in animation logic */}
      {error && (
        <div className="animate-in slide-in-from-top-1 fade-in duration-200 mt-1 flex items-center gap-1.5 px-1">
          {/* Semantic error dot */}
          <div className="h-1.5 w-1.5 rounded-full bg-destructive" />
          <span className="text-xs font-medium text-destructive">{error}</span>
        </div>
      )}
    </div>
  );
}
