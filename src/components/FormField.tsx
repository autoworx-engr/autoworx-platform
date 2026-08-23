"use client";

import { ReactNode } from "react";

export default function FormField({
  name,
  label,
  required,
  error,
  children,
  className,
  belowControl,
  labelAction,
}: {
  name: string;
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
  className?: string;
  belowControl?: ReactNode;
  /** Rendered opposite the label, e.g. a "Forgot password?" link */
  labelAction?: ReactNode;
}) {
  return (
    <div className={`group transition-all duration-300 ${className ?? ""}`}>
      <div className="mb-1.5 flex items-center justify-between">
        <label
          htmlFor={name}
          className="block text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          {label} {required && <span className="text-destructive">*</span>}
        </label>
        {labelAction}
      </div>

      {children}
      {belowControl}

      {error && (
        <p
          id={`${name}-error`}
          role="alert"
          className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400"
        >
          {error}
        </p>
      )}
    </div>
  );
}
