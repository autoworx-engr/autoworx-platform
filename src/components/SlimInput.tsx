import type { ComponentProps, ReactNode } from "react";
import { sentenceCase } from "change-case";
import { cn } from "@/lib/cn";
import { Tooltip } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";

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
  "w-full rounded-md border border-slate-300 px-3 py-1.5 text-base font-medium leading-6 outline-none transition-all duration-300",
  "bg-white/80 backdrop-blur-sm dark:bg-slate-900/50", // Subtle glass texture
  "text-slate-600 dark:text-slate-300 placeholder:text-slate-400",
  "focus:border-[#6571FF]/60 focus:ring-2 focus:ring-[#6571FF]/40", // Brand focus state
  "disabled:opacity-50 disabled:cursor-not-allowed",
  // Preserve styling on autofill using webkit-specific properties
  "autofill:[-webkit-text-fill-color:rgb(71,85,105)] dark:autofill:[-webkit-text-fill-color:rgb(203,213,225)]",
  "autofill:shadow-[inset_0_0_0px_1000px_rgb(255,255,255,0.8)] dark:autofill:shadow-[inset_0_0_0px_1000px_rgb(15,23,42,0.5)]",
  "autofill:transition-[background-color] autofill:duration-[5000s]",
  // Preserve styling on autofill hover
  "autofill:hover:[-webkit-text-fill-color:rgb(71,85,105)] dark:autofill:hover:[-webkit-text-fill-color:rgb(203,213,225)]",
  "autofill:hover:shadow-[inset_0_0_0px_1000px_rgb(255,255,255,0.8)] dark:autofill:hover:shadow-[inset_0_0_0px_1000px_rgb(15,23,42,0.5)]",
  // Preserve styling on autofill focus
  "autofill:focus:[-webkit-text-fill-color:rgb(71,85,105)] dark:autofill:focus:[-webkit-text-fill-color:rgb(203,213,225)]",
  "autofill:focus:shadow-[inset_0_0_0px_1000px_rgb(255,255,255,0.8)] dark:autofill:focus:shadow-[inset_0_0_0px_1000px_rgb(15,23,42,0.5)]",
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
  return (
    <div className={cn("group flex flex-col gap-1.5", rootClassName)}>
      <label
        htmlFor={inputId}
        className={cn(
          "flex items-center gap-1 text-base font-medium text-slate-600 dark:text-slate-200 transition-colors duration-300",
          labelClassName,
        )}
      >
        {label ?? sentenceCase(props.name)}
        {required && <span className="text-rose-500 font-bold">*</span>}
        {tooltipText && (
          <Tooltip title={tooltipText} placement="top">
            <IconComponent className="text-gray-400 hover:text-gray-600 cursor-help text-xs" />
          </Tooltip>
        )}
      </label>

      <div className="relative">
        <input
          id={inputId}
          required={required}
          className={cn(
            slimInputClassName,
            // Error state styling overrides
            error &&
              "border-rose-400 focus:border-rose-500 focus:ring-rose-500/10 text-rose-600",
            className,
          )}
          {...props}
        />
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
