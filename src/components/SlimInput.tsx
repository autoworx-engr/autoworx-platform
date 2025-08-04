import type { ComponentProps, ReactNode } from "react";
import { sentenceCase } from "change-case";
import { cn } from "@/lib/cn";

export type SlimInputProps = {
  label?: ReactNode;
  name: string;
  rootClassName?: string;
  labelClassName?: string;
  required?: boolean;
  error?: string; // Add error prop
};

export const slimInputClassName =
  "border-slate-400 bg-background w-full rounded-sm border px-2 py-0.5 leading-6 outline-none";

export function SlimInput({
  label,
  className,
  rootClassName,
  labelClassName,
  required,
  error,

  ...props
}: SlimInputProps & ComponentProps<"input">) {
  return (
    <label className={cn("block", rootClassName)}>
      <div className={cn("mb-1 font-medium", labelClassName)}>
        {label ?? sentenceCase(props.name)}
        {required && <span className="text-red-500"> *</span>}
      </div>
      <div className="relative flex items-center">
        <input
          type="text"
          className={cn(
            slimInputClassName,
            className,
            "pr-6", // Add padding to the right to avoid overlap with the `%`
            error && "border-red-500 focus:border-red-500", // Add error state styling
          )}
          id={props.id ?? props.name}
          required={required}
          {...props}
        />
      </div>
      {error && <div className="mt-1 px-2 text-xs text-red-500">{error}</div>}
    </label>
  );
}
