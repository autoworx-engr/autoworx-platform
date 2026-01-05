import type { ComponentProps, ReactNode } from "react";
import { sentenceCase } from "change-case";
import { cn } from "@/lib/cn";

export type SlimTextareaProps = {
  label?: ReactNode;
  name: string;
  rootClassName?: string;
};

export const slimTextareaClassName = cn(
  "border-primary-foreground bg-background w-full rounded-md border border-slate-300 px-2 py-0.5 leading-6 outline-none ",
  "bg-white/80 backdrop-blur-sm dark:bg-slate-900/50", // Subtle glass texture
  "text-slate-600 dark:text-slate-300 placeholder:text-slate-400",
  "focus:border-[#6571FF]/60 focus:ring-2 focus:ring-[#6571FF]/40", // Brand focus state
  "disabled:opacity-50 disabled:cursor-not-allowed")

export function SlimTextarea({
  label,
  className,
  rootClassName,
  ...props
}: SlimTextareaProps & ComponentProps<"textarea">) {
  return (
    <label className={cn("block", rootClassName)}>
      <div className="mb-1 px-2 font-medium text-slate-600">
        {label ?? sentenceCase(props.name)}
      </div>
      <textarea className={cn(slimTextareaClassName, className)} {...props} />
    </label>
  );
}
