import type { ComponentProps, ReactNode } from "react";
import { sentenceCase } from "change-case";
import { cn } from "@/lib/cn";

export type SlimInputProps = {
  label?: ReactNode;
  name: string;
  rootClassName?: string;
  labelClassName?: string;
  required?: boolean;
  error?: string;
};

export const slimInputClassName = cn(
  "w-full rounded-md border border-slate-300 px-3 py-1.5 text-base font-medium leading-6 outline-none transition-all duration-300",
  "bg-white/80 backdrop-blur-sm dark:bg-slate-900/50", // Subtle glass texture
  "text-slate-600 dark:text-slate-300 placeholder:text-slate-400",
  "focus:border-[#6571FF]/60 focus:ring-2 focus:ring-[#6571FF]/40", // Brand focus state
  "disabled:opacity-50 disabled:cursor-not-allowed",
  // Preserve styling on autofill using webkit-specific properties
  "[&:-webkit-autofill]:[-webkit-text-fill-color:rgb(71_85_105)] dark:[&:-webkit-autofill]:[-webkit-text-fill-color:rgb(203_213_225)]",
  "[&:-webkit-autofill]:shadow-[inset_0_0_0px_1000px_rgb(255_255_255_/_0.8)] dark:[&:-webkit-autofill]:shadow-[inset_0_0_0px_1000px_rgb(15_23_42_/_0.5)]",
  "[&:-webkit-autofill]:transition-[background-color] [&:-webkit-autofill]:duration-[5000s]",
  // Preserve styling on autofill hover
  "[&:-webkit-autofill:hover]:[-webkit-text-fill-color:rgb(71_85_105)] dark:[&:-webkit-autofill:hover]:[-webkit-text-fill-color:rgb(203_213_225)]",
  "[&:-webkit-autofill:hover]:shadow-[inset_0_0_0px_1000px_rgb(255_255_255_/_0.8)] dark:[&:-webkit-autofill:hover]:shadow-[inset_0_0_0px_1000px_rgb(15_23_42_/_0.5)]",
  // Preserve styling on autofill focus
  "[&:-webkit-autofill:focus]:[-webkit-text-fill-color:rgb(71_85_105)] dark:[&:-webkit-autofill:focus]:[-webkit-text-fill-color:rgb(203_213_225)]",
  "[&:-webkit-autofill:focus]:shadow-[inset_0_0_0px_1000px_rgb(255_255_255_/_0.8)] dark:[&:-webkit-autofill:focus]:shadow-[inset_0_0_0px_1000px_rgb(15_23_42_/_0.5)]"
);

export function SlimInput({
  label,
  className,
  rootClassName,
  labelClassName,
  required,
  error,
  ...props
}: SlimInputProps & ComponentProps<"input">) {
  // Generate a unique ID if not provided, for accessibility
  const inputId = props.id ?? props.name;

  const isEmptyDate = props.type === "date" && !props.value;

  return (
    <div className={cn("group flex flex-col gap-1.5", rootClassName)}>
      <label
        htmlFor={inputId}
        className={cn(
          "flex items-center gap-1 text-base font-medium text-slate-600 dark:text-slate-200 transition-colors duration-300",
          labelClassName
        )}
      >
        {label ?? sentenceCase(props.name)}
        {required && <span className="text-rose-500 font-bold">*</span>}
      </label>

      <div className="relative">
        <input
          id={inputId}
          type="text"
          required={required}
          className={cn(
            slimInputClassName,
            // Error state styling overrides
            error && "border-rose-400 focus:border-rose-500 focus:ring-rose-500/10 text-rose-600",
            // Hide native date text when empty so placeholder overlay is visible
            isEmptyDate && "text-transparent",
            className
          )}
          {...props}
        />

        {/* Placeholder overlay for empty date inputs (PWA/mobile compatibility) */}
        {isEmptyDate && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base font-medium">
            mm/dd/yyyy
          </span>
        )}
      </div>

      {/* Error Message with subtle slide-in animation logic */}
      {error && (
        <div className="animate-in slide-in-from-top-1 fade-in duration-200 mt-1 flex items-center gap-1.5 px-1">
          {/* Semantic error dot */}
          <div className="h-1.5 w-1.5 rounded-full bg-rose-500" />
          <span className="text-xs font-medium text-rose-500">{error}</span>
        </div>
      )}
    </div>
  );
}