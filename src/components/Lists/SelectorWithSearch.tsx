"use client";

import { slimInputClassName } from "@/components/SlimInput";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/cn";
import { sentenceCase } from "change-case";
import { ChevronDown, Plus } from "lucide-react";
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

export function SelectorWithSearch({
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
    ? normalizedOptions.filter((opt) =>
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

  const handleClear = () => {
    setSelectedValue("");
    setSearchTerm("");
    setIsOpen(false);
    onChange?.("");
  };

  const selectedLabel =
    normalizedOptions?.find((opt) => opt?.id?.toString() === selectedValue)
      ?.title || (selectedValue ? selectedValue : "");

  return (
    <div
      className={cn("group flex flex-col gap-1.5", rootClassName)}
      ref={dropdownRef}
    >
      <Label
        htmlFor={name}
        className={cn("flex items-center gap-1 text-base", labelClassName)}
      >
        {label ?? sentenceCase(name)}
        {required && <span className="font-bold text-destructive">*</span>}
      </Label>
      <div className="relative">
        <button
          type="button"
          className={cn(
            slimInputClassName,
            "items-center justify-between text-left",
            error &&
              "border-destructive text-destructive focus-visible:ring-destructive/30",
          )}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          id={name}
          disabled={disabled}
        >
          <span className={selectedLabel ? "" : "text-muted-foreground"}>
            {selectedLabel || placeholder}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
        </button>

        {isOpen && (
          <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg shadow-slate-200/60 dark:shadow-black/30">
            {isSearch && (
              <div className="sticky top-0 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2">
                <input
                  ref={searchInputRef}
                  type="text"
                  className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
                  placeholder="Search..."
                  value={searchTerm}
                  required={required}
                  onChange={handleSearchChange}
                  onKeyDown={handleSearchKeyDown}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
            <div className="h-[240px] overflow-y-auto">
              {filteredOptions?.length > 0 ? (
                filteredOptions?.map((opt) => (
                  <div
                    key={opt?.id}
                    className={cn(
                      "cursor-pointer px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800",
                      selectedValue === opt?.id.toString() &&
                        "bg-primary/10 text-primary dark:text-[#8ea0ff]",
                    )}
                    onClick={() => handleSelect(opt?.id.toString())}
                  >
                    {opt?.title}
                  </div>
                ))
              ) : searchTerm ? (
                <div
                  className="flex cursor-pointer items-center gap-1.5 px-3 py-2 text-sm font-medium text-primary hover:bg-slate-100 dark:hover:bg-slate-800"
                  onClick={() => handleSelect(searchTerm)}
                >
                  <Plus size={14} strokeWidth={2.5} />
                  Add "{searchTerm}"
                </div>
              ) : (
                <div className="px-3 py-3 text-sm text-slate-500 dark:text-slate-400">
                  {searchTerm
                    ? `No matches found for "${searchTerm}". Press Enter to create it.`
                    : "No matching options found. Type a new value and select it to create."}
                </div>
              )}
            </div>
            {isClear && value && (
              <div className="border-t border-slate-200 dark:border-slate-700 px-3 py-2 bg-slate-50 dark:bg-slate-900/60">
                <button
                  onClick={handleClear}
                  className="w-full rounded-md bg-red-50 dark:bg-red-900/30 py-2 text-sm font-medium text-red-600 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {error && (
        <div className="animate-in slide-in-from-top-1 fade-in duration-200 mt-1 flex items-center gap-1.5 px-1">
          <div className="h-1.5 w-1.5 rounded-full bg-destructive" />
          <span className="text-xs font-medium text-destructive">{error}</span>
        </div>
      )}
    </div>
  );
}

export default SelectorWithSearch;
