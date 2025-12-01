"use client";

import React, { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { ChevronDown } from "lucide-react";

export type CustomOption = {
  id: string | number;
  title: string;
  flagUrl?: string | null;
  code?: string | null; // calling code like +1
};

export type CustomSelectorProps = {
  label?: ReactNode;
  name: string;
  options: string[] | number[] | CustomOption[];
  value?: string | number;
  onChange?: (value: string) => void;
  rootClassName?: string;
  labelClassName?: string;
  required?: boolean;
  error?: string;
  placeholder?: string;
  isSearch?: boolean;
  disabled?: boolean;
  isClear?: boolean;
};

export default function CustomSelector({
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
  isSearch = false,
  disabled = false,
  isClear = false,
}: CustomSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(value?.toString() || "");
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value !== undefined) {
      setSelectedValue(value?.toString());
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && isSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, isSearch]);

  const normalizeOptions = (): CustomOption[] => {
    if (!options) return [];
    if (typeof options[0] === "string" || typeof options[0] === "number") {
      return (options as (string | number)[]).map((opt) => ({
        id: opt?.toString(),
        title: opt?.toString(),
      }));
    }
    return options as CustomOption[];
  };

  const normalizedOptions = normalizeOptions();

  const filteredOptions = searchTerm
    ? normalizedOptions.filter((opt) =>
        opt.title.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : normalizedOptions;

  const handleSelect = (id: string) => {
    setSelectedValue(id);
    setIsOpen(false);
    setSearchTerm("");
    onChange?.(id);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
  };

  const selectedOption = normalizedOptions.find(
    (opt) => opt.id?.toString() === selectedValue
  );

  const selectedLabel = selectedOption
    ? selectedOption.title
    : selectedValue
    ? selectedValue
    : "";

  const handleClear = () => {
    setSelectedValue("");
    setSearchTerm("");
    setIsOpen(false);
    onChange?.("");
  };

  return (
    <div className={cn("block", rootClassName)} ref={dropdownRef}>
      <div className={cn("mb-1 font-medium text-gray-500", labelClassName)}>
        {label ?? name}
        {required && <span className="text-red-500"> *</span>}
      </div>

      <div className="relative">
        <button
          type="button"
          className={cn(
            "flex w-full items-center justify-between rounded-sm border border-slate-400 bg-background px-2 py-0.5 text-left leading-6 outline-none",
            error && "border-red-500 focus:border-red-500",
            disabled && "cursor-not-allowed bg-gray-100 opacity-50"
          )}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          id={name}
          disabled={disabled}
        >
          <span className={selectedLabel ? "" : "text-gray-400"}>
            {selectedOption ? (
              <div className="flex items-center gap-2">
                {selectedOption.flagUrl && (
                  <img
                    src={selectedOption.flagUrl}
                    alt={selectedOption.title}
                    width={18}
                    height={12}
                    className="rounded-sm object-cover"
                  />
                )}
                <span>{selectedOption.title}</span>
                {selectedOption.code && (
                  <span className="ml-1 text-[12px] text-gray-500">{selectedOption.code}</span>
                )}
              </div>
            ) : (
              (selectedLabel || placeholder)
            )}
          </span>
          <ChevronDown size={18} className="text-gray-500" />
        </button>

        {isOpen && (
          <div className="thin-scrollbar absolute z-10 mt-1 w-full overflow-hidden rounded-sm border border-slate-200 bg-white shadow-md">
            {isSearch && (
              <div className="sticky top-0 border-b border-slate-200 bg-white p-2">
                <input
                  ref={searchInputRef}
                  type="text"
                  className="w-full rounded-sm border border-slate-300 px-2 py-1 text-sm outline-none focus:border-blue-500"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  onKeyDown={handleSearchKeyDown}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}

            <div className="h-[200px] overflow-y-auto">
              {filteredOptions?.length > 0 ? (
                filteredOptions.map((opt) => (
                  <div
                    key={opt.id}
                    className={cn(
                      "cursor-pointer px-4 py-1 hover:bg-indigo-100 flex items-center gap-2",
                      selectedValue === opt?.id.toString() &&
                        "bg-blue-50 text-blue-700"
                    )}
                    onClick={() => handleSelect(opt?.id.toString())}
                  >
                     {opt?.code && <div className="text-sm text-gray-500">{opt.code}</div>}
                    {opt?.flagUrl && (
                      <img
                        src={opt.flagUrl}
                        alt={opt.title}
                        width={20}
                        height={14}
                        className="rounded-sm object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <div>{opt?.title}</div>
                    </div>
                   
                  </div>
                ))
              ) : searchTerm ? (
                <div
                  className="cursor-pointer px-2 py-1 hover:bg-slate-100 text-blue-600"
                  onClick={() => handleSelect(searchTerm)}
                >
                  "{searchTerm}"
                </div>
              ) : (
                <div className="px-2 py-2 text-sm text-gray-500">No matching options</div>
              )}
            </div>

            {isClear && selectedValue && (
              <div className="border-t border-slate-200 px-2 py-1">
                <button
                  onClick={handleClear}
                  className="w-full rounded-sm bg-red-50 py-1 text-sm text-red-600 hover:bg-red-100"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {error && <div className="mt-1 px-2 text-xs text-red-500">{error}</div>}
    </div>
  );
}
