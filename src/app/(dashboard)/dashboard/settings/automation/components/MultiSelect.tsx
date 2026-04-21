import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, CircleX } from "lucide-react";

export type Option = {
  id: string | number;
  title: string;
};

type MultiSelectProps = {
  options: Option[];
  value: (string | number)[];
  onChange: (newValue: (string | number)[]) => void;
  label?: string;
  placeholder?: string;
  isSearch?: boolean;
  disabled?: boolean;
  required: boolean;
  error?: string;
  labelClassName?: string;
};

const MultiSelect: React.FC<MultiSelectProps> = ({
  options,
  value,
  onChange,
  label,
  required,
  error,
  disabled = false,
  isSearch = false,
  placeholder = "Select options",
  labelClassName = "",
}) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        setSearchTerm("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  // useEffect(() => {
  //   if (open && isSearch && searchInputRef.current) {
  //     searchInputRef.current.focus();
  //   }
  // }, [open, isSearch]);

  // ADDED: Effect to reset search when dropdown closes
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
    }
  }, [open]);
  const handleSelect = (id: string | number) => {
    if (value?.includes(id)) {
      onChange(value?.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  };

  // ADDED: Function to prevent dropdown from closing when clicking search input
  const handleSearchClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // ADDED: Handle search input changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };
  const handleDelete = (id: string | number, event: React.MouseEvent) => {
    event.stopPropagation();
    onChange(value.filter((v) => v !== id));
  };

  // ADDED: Prevent dropdown from closing when typing in search field
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
  };

  // ADDED: Filter options based on search query
  const filteredOptions = searchTerm
    ? options.filter((opt) =>
        opt.title.toLowerCase()?.includes(searchTerm.toLowerCase()),
      )
    : options;
  return (
    <div className="relative" ref={wrapperRef}>
      <div className={cn("mb-1 font-medium text-gray-500", labelClassName)}>
        {label}
        {required && <span className="text-red-500"> *</span>}
      </div>
      <div
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className={cn(
          "flex w-full cursor-pointer flex-wrap items-center gap-2 rounded border border-slate-400 bg-white px-2 py-0.5",
          error && "border-red-500 focus:border-red-500",
          disabled && "cursor-not-allowed bg-gray-100 opacity-50",
        )}
      >
        {value?.length === 0 ? (
          <span className="text-gray-400">{placeholder}</span>
        ) : (
          value?.map((id) => {
            const option = options?.find((opt) => opt?.id === id);
            return (
              <span
                key={id}
                className="flex items-center rounded-[5px] bg-gray-100 px-2 py-1 text-xs"
              >
                {option?.title}
                <CircleX
                  className="ml-1 cursor-pointer text-gray-600 hover:text-red-600"
                  size={14}
                  onClick={(e) => handleDelete(id, e)}
                />
              </span>
            );
          })
        )}
        <ChevronDown size={20} className="ml-auto text-gray-500" />
      </div>

      {open && (
        <div className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded border bg-white shadow">
          {/* ADDED: Search input section */}
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
          {/* END ADDED SECTION */}
          {/* MODIFIED: Use filteredOptions instead of options */}
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <div
                key={option?.id}
                onClick={() => handleSelect(option?.id)}
                className={`cursor-pointer px-4 py-2 hover:bg-indigo-100 ${
                  value?.includes(option?.id)
                    ? "bg-blue-50 font-semibold text-blue-700"
                    : ""
                }`}
              >
                {option?.title}
              </div>
            ))
          ) : (
            // ADDED: No results message
            <div className="px-4 py-3 text-center text-sm text-gray-500">
              No options found
            </div>
          )}
        </div>
      )}

      {error && <div className="mt-1 px-2 text-xs text-red-500">{error}</div>}
    </div>
  );
};

export default MultiSelect;
