import { cn } from "@/lib/cn";
import { InfoCircleOutlined } from "@ant-design/icons";
import { Tooltip } from "antd";
import { sentenceCase } from "change-case";
import type { ComponentProps, ReactNode } from "react";

export type SlimTextareaProps = {
  label?: ReactNode;
  name: string;
  rootClassName?: string;
  labelClassName?: string;
  tooltipText?: string;
};

export const slimTextareaClassName = cn(
  "border-primary-foreground bg-background w-full rounded-md border border-slate-300 px-2 py-0.5 leading-6 outline-none ",
  "bg-white/80 backdrop-blur-sm dark:bg-slate-900/50", // Subtle glass texture
  "text-slate-600 dark:text-slate-300 placeholder:text-slate-400",
  "focus:border-primary/60 focus:ring-2 focus:ring-primary/40", // Brand focus state
  "disabled:opacity-50 disabled:cursor-not-allowed",
);

export function SlimTextarea({
  label,
  className,
  rootClassName,
  labelClassName,
  tooltipText,
  ...props
}: SlimTextareaProps & ComponentProps<"textarea">) {
  const IconComponent = InfoCircleOutlined;
  return (
    <label className={cn("block", rootClassName)}>
      <div
        className={cn(
          "mb-1  font-medium text-slate-600 flex items-center gap-1",
          labelClassName,
        )}
      >
        {label ?? sentenceCase(props.name)}
        {tooltipText && (
          <Tooltip title={tooltipText} placement="top">
            <IconComponent className="text-gray-400 hover:text-gray-600 cursor-help text-xs" />
          </Tooltip>
        )}
      </div>
      <textarea className={cn(slimTextareaClassName, className)} {...props} />
    </label>
  );
}
