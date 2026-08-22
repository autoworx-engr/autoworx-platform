"use client";

import { cn } from "@/lib/cn";
import { useFormErrorStore } from "@/stores/form-error";
import { Eye, EyeOff } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { slimInputClassName } from "./SlimInput";

export default function Input({
  name,
  className,
  placeholder,
  value,
  onChange,
  required,
  onBlur,
  autoComplete,
  invalid,
  describedBy,
}: {
  name: string;
  className?: string;
  placeholder?: string;
  value?: any;
  onChange?: (e: any) => void;
  required?: boolean;
  onBlur?: (e: any) => void;
  autoComplete?: string;
  invalid?: boolean;
  describedBy?: string;
}) {
  const [inputValue, setInputValue] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { error } = useFormErrorStore();

  const pathname = usePathname();
  const isLoginPage = pathname === "/login" || pathname === "/register";

  return (
    <div className="relative">
      <input
        type={showPassword ? "text" : "password"}
        name={name}
        id={name}
        className={
          isLoginPage
            ? "w-full rounded-xl border-2 border-slate-200 bg-white/50 px-4 py-2.5 transition-colors focus:border-primary/50 focus:outline-none dark:border-slate-700 dark:bg-slate-800/50 dark:focus:border-primary"
            : cn(slimInputClassName, "pr-10", className)
        }
        required={required}
        value={value ?? inputValue}
        onChange={(e) => {
          onChange ? onChange(e) : setInputValue(e.target.value);
        }}
        onBlur={onBlur}
        autoComplete={autoComplete}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        placeholder={placeholder}
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm leading-5"
      >
        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
      </button>

      {/* {error && error.field === name && (
        <p className="text-red-500">{error.message}</p>
      )} */}
    </div>
  );
}
