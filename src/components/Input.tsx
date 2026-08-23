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
  onBlur,
  autoComplete,
  invalid,
  describedBy,
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
  onBlur?: (e: any) => void;
  autoComplete?: string;
  invalid?: boolean;
  describedBy?: string;
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
        autoComplete={autoComplete}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        placeholder={placeholder}
        min={min}
        max={max}
      />

      {/* {error && error.field === name && (
        <p className="text-red-500">{error.message}</p>
      )} */}
    </>
  );
}
