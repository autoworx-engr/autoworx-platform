"use client";

import { cn } from "@/lib/cn";
import { sentenceCase } from "change-case";
import { Check, ChevronDown, Search, X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

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
  const [dropUp, setDropUp] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
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
  // useEffect(() => {
  //   if (isOpen && isSearch && searchInputRef.current) {
  //     searchInputRef.current.focus();
  //   }
  // }, [isOpen, isSearch]);

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

  const selectedLabel =
    normalizedOptions?.find((opt) => opt?.id?.toString() === selectedValue)
      ?.title || (selectedValue ? selectedValue : "");

  const handleClear = () => {
    setSelectedValue("");
    setSearchTerm("");
    setIsOpen(false);
    onChange?.("");
  };

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      // 220px ≈ max dropdown height (200px list + search + clear)
      setDropUp(spaceBelow < 220);
    }
    setIsOpen((prev) => !prev);
  };

  return (
    <div className={cn("block", rootClassName)} ref={dropdownRef}>
      <div
        className={cn(
          "mb-1 font-medium text-slate-600 dark:text-slate-300",
          labelClassName,
        )}
      >
        {label ?? sentenceCase(name)}
        {required && <span className="text-[#E9405F]"> *</span>}
      </div>
      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          className={cn(
            "group flex h-9 w-full items-center justify-between rounded-lg px-3 text-left outline-none transition-all duration-200",
            "bg-white dark:bg-slate-900/50 shadow-sm hover:shadow-md",
            "ring-1 ring-slate-200 dark:ring-slate-700 hover:ring-slate-300",
            isOpen && "ring-2 ring-primary/60",
            error && "ring-red-400",
            disabled && "cursor-not-allowed opacity-50",
          )}
          onClick={handleToggle}
          id={name}
          disabled={disabled}
        >
          <span
            className={cn(
              "truncate text-sm font-medium",
              selectedLabel
                ? "text-slate-700 dark:text-slate-200"
                : "text-slate-400",
            )}
          >
            {selectedLabel || placeholder}
          </span>
          <ChevronDown
            size={16}
            className={cn(
              "shrink-0 text-slate-400 transition-transform duration-200",
              isOpen && "rotate-180 text-primary",
            )}
          />
        </button>

        {isOpen && (
          <div
            className={cn(
              "absolute z-50 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg animate-in fade-in-0 zoom-in-95 duration-150 dark:border-slate-700 dark:bg-slate-900",
              dropUp ? "bottom-full mb-1" : "top-full mt-1",
            )}
          >
            {isSearch && (
              <div className="relative border-b border-slate-100 px-2 py-2 dark:border-slate-700">
                <Search
                  size={14}
                  strokeWidth={2.5}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  className="w-full rounded-md bg-slate-50 py-1.5 pl-8 pr-3 text-sm outline-none border border-transparent focus:border-primary/40 focus:bg-white placeholder:text-slate-400 transition-colors duration-150 dark:bg-slate-800 dark:text-slate-200"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  onKeyDown={handleSearchKeyDown}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}

            <div className="max-h-52 overflow-y-auto py-1">
              {filteredOptions?.length > 0 ? (
                filteredOptions.map((opt) => {
                  const isSelected = selectedValue === opt.id.toString();
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors duration-100",
                        "hover:bg-primary/5 active:bg-primary/10 dark:hover:bg-primary/10",
                        isSelected && "bg-primary/10 text-primary",
                      )}
                      onClick={() => handleSelect(opt.id.toString())}
                    >
                      <span className="flex-1 truncate">{opt.title}</span>
                      {isSelected && (
                        <Check
                          size={14}
                          strokeWidth={3}
                          className="shrink-0 text-primary"
                        />
                      )}
                    </button>
                  );
                })
              ) : searchTerm ? (
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm text-primary hover:bg-primary/5 transition-colors"
                  onClick={() => handleSelect(searchTerm)}
                >
                  Use &ldquo;{searchTerm}&rdquo;
                </button>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 px-4">
                  <Search size={18} className="text-slate-300 mb-1.5" />
                  <p className="text-sm text-slate-400 text-center">
                    No options available
                  </p>
                </div>
              )}
            </div>

            {isClear && value && (
              <div className="border-t border-slate-100 p-1.5 dark:border-slate-700">
                <button
                  type="button"
                  onClick={handleClear}
                  className="flex w-full items-center justify-center gap-1.5 rounded-md py-1.5 text-sm text-red-500 hover:bg-red-50 transition-colors dark:hover:bg-red-900/20"
                >
                  <X size={13} strokeWidth={2.5} />
                  Clear selection
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {error && <div className="mt-1 px-1 text-xs text-red-500">{error}</div>}
    </div>
  );
}

export default Selector;
