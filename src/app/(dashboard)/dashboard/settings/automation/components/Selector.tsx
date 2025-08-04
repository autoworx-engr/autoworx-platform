"use client";

import { useState, useRef, useEffect } from "react";
import type { ReactNode } from "react";
import { FaChevronDown } from "react-icons/fa6";
import { cn } from "@/lib/cn";
import { sentenceCase } from "change-case";

export type SelectorProps = {
  label?: ReactNode;
  name: string;
  options: string[] | number[] | { id: string | number; title: string }[];
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
  isSearch = false,
  placeholder = "Select an option",
  disabled = false,
  isClear = false,
}: SelectorProps) {
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
        setSearchTerm(""); // Clear search when closing dropdown
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && isSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, isSearch]);

  const normalizeOptions = () => {
    if (typeof options?.[0] === "string" || typeof options?.[0] === "number") {
      return (options as (string | number)[]).map((opt) => ({
        id: opt?.toString(),
        title: opt?.toString(),
      }));
    }
    return options as { id: string | number; title: string }[];
  };

  const normalizedOptions = normalizeOptions();

  const filteredOptions = searchTerm
    ? normalizedOptions?.filter((opt) =>
        opt.title.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    : normalizedOptions;

  const handleSelect = (id: string) => {
    setSelectedValue(id);
    setIsOpen(false);
    setSearchTerm(""); // Clear search term when option is selected
    if (onChange) {
      onChange(id);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Prevent dropdown from closing when typing in search field
    e.stopPropagation();
  };

  const selectedLabel = normalizedOptions?.find(
    (opt) => opt?.id?.toString() === selectedValue,
  )?.title || (selectedValue ? selectedValue : "");

  const handleClear = () => {
    setSelectedValue("");
    setSearchTerm("");
    setIsOpen(false);
    onChange?.("");
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
            disabled && "cursor-not-allowed bg-gray-100 opacity-50",
          )}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          id={name}
          disabled={disabled} // Also set native disabled for accessibility
        >
          <span className={selectedLabel ? "" : "text-gray-400"}>
            {selectedLabel || placeholder}
          </span>
          <FaChevronDown className="text-gray-500" />
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
            <div className="h-[100px] overflow-y-auto pl-2">
              {filteredOptions?.length > 0 ? (
                filteredOptions?.map((opt) => (
                  <div
                    key={opt?.id}
                    className={cn(
                      "cursor-pointer px-2 py-1 hover:bg-slate-100",
                      selectedValue === opt?.id.toString() &&
                        "bg-blue-50 text-blue-700",
                    )}
                    onClick={() => handleSelect(opt?.id.toString())}
                  >
                    {opt?.title}
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
                <div className="px-2 py-2 text-sm text-gray-500">
                  No matching options
                </div>
              )}
            </div>

            {isClear && value && (
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

export default Selector;
