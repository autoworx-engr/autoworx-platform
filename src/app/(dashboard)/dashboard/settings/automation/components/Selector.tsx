"use client";

import { useState, useRef, useEffect } from "react";

import { cn } from "@/lib/cn";
import { sentenceCase } from "change-case";
import type { ReactNode } from "react";
import { FaChevronDown } from "react-icons/fa6";

export type SelectorProps = {
  label?: ReactNode;
  name: string;
  options: string[] | { id: any; title: string }[];
  value?: string | number;
  onChange?: (value: string) => void;
  rootClassName?: string;
  labelClassName?: string;
  required?: boolean;
  error?: string;
  placeholder?: string;
};

export function Selector({
  label,
  name,
  options,
  value,
  onChange,
  rootClassName,
  labelClassName,
  required,
  error,
  placeholder = "Select an option",
}: SelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(value || "");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value !== undefined) {
      setSelectedValue(value);
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelect = (option: string) => {
    setSelectedValue(option);
    setIsOpen(false);
    if (onChange) {
      onChange(option);
    }
  };

  return (
    <div className={cn("block", rootClassName)} ref={dropdownRef}>
      <div className={cn("mb-1 font-medium text-gray-500", labelClassName)}>
        {label ?? sentenceCase(name)}
        {required && <span className="text-red-500"> *</span>}
      </div>
      <div className="relative">
        <button
          type="button"
          className={cn(
            "flex w-full items-center justify-between rounded-sm border border-slate-400 bg-background px-2 py-0.5 text-left leading-6 outline-none",
            error && "border-red-500 focus:border-red-500",
          )}
          onClick={() => setIsOpen(!isOpen)}
          id={name}
        >
          <span className={selectedValue ? "" : "text-gray-400"}>
            {selectedValue
              ? typeof options[0] === "string"
                ? selectedValue
                : (options as { id: number; title: string }[]).find(
                    (opt) => opt.id.toString() === selectedValue,
                  )?.title || placeholder
              : placeholder}
          </span>
          <FaChevronDown className="text-gray-500" />
        </button>

        {isOpen && (
          <div className="thin-scrollbar absolute z-10 mt-1 h-[200px] w-full overflow-y-auto rounded-sm border border-slate-200 bg-white pl-2 shadow-md">
            {options.map((option) => {
              const label = typeof option === "string" ? option : option.title;
              const value =
                typeof option === "string" ? option : option.id.toString();

              return (
                <div
                  key={value}
                  className={cn(
                    "cursor-pointer px-2 py-1 hover:bg-slate-100",
                    selectedValue === value && "bg-blue-50 text-blue-700",
                  )}
                  onClick={() => handleSelect(value)}
                >
                  {label}
                </div>
              );
            })}
          </div>
        )}
      </div>
      {error && <div className="mt-1 px-2 text-xs text-red-500">{error}</div>}
    </div>
  );
}

export default Selector;
