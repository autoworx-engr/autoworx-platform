"use client";

import { useFormErrorStore } from "@/stores/form-error";
import { useState } from "react";

export default function Input({
  name,
  type = "text",
  required,
  defaultValue,
  autoFocus,
  className,
  placeholder,
  value,
  onChange,
  min,
  max,
  step,
  onBlur,
  onKeyDown,
  autoComplete,
  invalid,
  describedBy,
  disabled,
}: {
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: any;
  autoFocus?: boolean;
  className?: string;
  placeholder?: string;
  value?: any;
  onChange?: (e: any) => void;
  min?: string;
  max?: string;
  step?: string;
  onBlur?: (e: any) => void;
  onKeyDown?: (e: any) => void;
  autoComplete?: string;
  invalid?: boolean;
  describedBy?: string;
  disabled?: boolean;
}) {
  const [inputValue, setInputValue] = useState(defaultValue || "");
  const { error } = useFormErrorStore();

  return (
    <>
      <input
        type={type}
        name={name}
        id={name}
        className={className}
        required={required}
        autoFocus={autoFocus}
        value={value ?? inputValue}
        onChange={(e) => {
          onChange ? onChange(e) : setInputValue(e.target.value);
        }}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        disabled={disabled}
        autoComplete={autoComplete}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
      />

      {/* {error && error.field === name && (
        <p className="text-red-500">{error.message}</p>
      )} */}
    </>
  );
}
