import type { ComponentProps, ReactNode } from "react";
import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type SlimInputProps = {
  label?: ReactNode;
  name: string;
  rootClassName?: string;
  labelClassName?: string;
  required?: boolean;
  error?: string;
  tooltipText?: string;
};

function humanizeFieldName(name: string) {
  return name
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}

export const slimInputClassName = cn(
  "w-full rounded-md border border-slate-300 px-3 py-1.5 text-base font-medium leading-6 outline-none transition-all duration-300",
  "bg-white/80 backdrop-blur-sm dark:bg-slate-900/50",
  "text-slate-600 dark:text-slate-300 placeholder:text-slate-400",
  "focus:border-teal-500/60 focus:ring-2 focus:ring-teal-500/40",
  "disabled:opacity-50 disabled:cursor-not-allowed",
  "autofill:[-webkit-text-fill-color:rgb(71,85,105)] dark:autofill:[-webkit-text-fill-color:rgb(203,213,225)]",
  "autofill:shadow-[inset_0_0_0px_1000px_rgb(255,255,255,0.8)] dark:autofill:shadow-[inset_0_0_0px_1000px_rgb(15,23,42,0.5)]",
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
  const inputId = props.id ?? props.name;
  return (
    <div className={cn("group flex flex-col gap-1.5", rootClassName)}>
      <label
        htmlFor={inputId}
        className={cn(
          "flex items-center gap-1 text-base font-medium text-slate-600 transition-colors duration-300 dark:text-slate-200",
          labelClassName,
        )}
      >
        {label ?? humanizeFieldName(props.name)}
        {required && <span className="font-bold text-rose-500">*</span>}
        {tooltipText ? (
          <span title={tooltipText} className="inline-flex cursor-help text-slate-400">
            <HelpCircle className="h-3.5 w-3.5" aria-hidden />
          </span>
        ) : null}
      </label>

      <div className="relative">
        <input
          id={inputId}
          required={required}
          className={cn(
            slimInputClassName,
            error &&
              "border-rose-400 text-rose-600 focus:border-rose-500 focus:ring-rose-500/10",
            className,
          )}
          {...props}
        />
      </div>

      {error ? (
        <div className="mt-1 flex items-center gap-1.5 px-1">
          <div className="h-1.5 w-1.5 rounded-full bg-rose-500" />
          <span className="text-xs font-medium text-rose-500">{error}</span>
        </div>
      ) : null}
    </div>
  );
}
