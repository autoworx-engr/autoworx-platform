"use client";

import { cn } from "@/lib/utils";
import { Category } from "@prisma/client";
import { ChevronDown, Plus, X } from "lucide-react";
import type React from "react";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import SelectCategory from "./Lists/SelectCategory";

export type SelectorWithAddProps = {
  label?: ReactNode;
  name: string;
  options: string[] | number[] | { id: string | number; title: string }[];
  value?: Array<{ id: string | number; title: string }>;
  onChange?: (value: Array<{ id: string | number; title: string }>) => void;
  rootClassName?: string;
  labelClassName?: string;
  required?: boolean;
  error?: string;
  placeholder?: string;
  isSearch?: boolean;
  disabled?: boolean;
  allowClear?: boolean;
  allowAddNew?: boolean;
  addNewLabel?: string;
  onAddNew?: (newItem: string, category?: Category | null) => void;
  addNewPlaceholder?: string;
  selectCategory?: boolean;
};

const sentenceCase = (str: string) => {
  return (
    str.charAt(0).toUpperCase() +
    str
      .slice(1)
      .toLowerCase()
      .replace(/([A-Z])/g, " $1")
  );
};

export function MultiSelectorWithAdd({
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
  placeholder = "Select options",
  disabled = false,
  allowClear = true,
  allowAddNew = false,
  addNewLabel = "Add new item",
  onAddNew,
  addNewPlaceholder = "Enter new item",
  selectCategory = false,
}: SelectorWithAddProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValues, setSelectedValues] = useState<
    Array<{ id: string | number; title: string }>
  >(value || []);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newItemValue, setNewItemValue] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const addNewInputRef = useRef<HTMLInputElement>(null);

  const [category, setCategory] = useState<Category | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);

  useEffect(() => {
    if (value) setSelectedValues(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchTerm("");
        setIsAddingNew(false);
        setNewItemValue("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // useEffect(() => {
  //   if (isOpen && isSearch && searchInputRef.current && !isAddingNew)
  //     searchInputRef.current.focus();
  // }, [isOpen, isSearch, isAddingNew]);

  useEffect(() => {
    if (isAddingNew && addNewInputRef.current) addNewInputRef.current.focus();
  }, [isAddingNew]);

  const normalizeOptions = () => {
    if (typeof options?.[0] === "string" || typeof options?.[0] === "number") {
      return (options as (string | number)[]).map((opt) => ({
        id: opt.toString(),
        title: opt.toString(),
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
    const option = normalizedOptions.find((opt) => opt.id.toString() === id);
    if (!option) return;

    const exists = selectedValues.find((v) => v.id.toString() === id);

    let newValues: typeof selectedValues;
    if (exists) {
      newValues = selectedValues.filter((v) => v.id.toString() !== id);
    } else {
      newValues = [...selectedValues, option];
    }

    setSelectedValues(newValues);
    if (onChange) onChange(newValues);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedValues([]);
    if (onChange) onChange([]);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setSearchTerm(e.target.value);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) =>
    e.stopPropagation();

  const handleAddNewClick = () => {
    setIsAddingNew(true);
    setSearchTerm("");
    setCategoryOpen(false);
  };

  const handleAddNewSubmit = () => {
    if (newItemValue.trim() && onAddNew) {
      onAddNew(newItemValue.trim(), category);
      setNewItemValue("");
      setCategory(null);
      setIsAddingNew(false);
      setIsOpen(false);
      setCategoryOpen(false);
    }
  };

  const handleAddNewKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.key === "Enter") handleAddNewSubmit();
    else if (e.key === "Escape") {
      setIsAddingNew(false);
      setNewItemValue("");
      setCategory(null);
      setCategoryOpen(false);
    }
  };

  const handleAddNewCancel = () => {
    setIsAddingNew(false);
    setNewItemValue("");
    setCategory(null);
    setCategoryOpen(false);
  };

  const handleCategoryChange = (newCategory: Category | null) =>
    setCategory(newCategory);

  const hasValue = selectedValues.length > 0;

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
          disabled={disabled}
        >
          <span className={hasValue ? "" : "text-gray-400"}>
            {hasValue
              ? selectedValues.map((v) => v.title).join(", ")
              : placeholder}
          </span>
          <div className="flex items-center gap-1">
            {hasValue && allowClear && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="flex h-4 w-4 items-center justify-center rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                title="Clear selection"
              >
                <X strokeWidth={2} className="h-2 w-2" />
              </button>
            )}
            <ChevronDown className="text-gray-500" />
          </div>
        </button>

        {isOpen && (
          <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-sm border border-slate-200 bg-white shadow-md">
            {isSearch && !isAddingNew && (
              <div className="sticky top-0 border-b border-slate-200 bg-white p-2">
                <input
                  ref={searchInputRef}
                  type="text"
                  className="w-full rounded-sm border border-slate-400 bg-background px-2 py-0.5 leading-6 outline-none"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  onKeyDown={handleSearchKeyDown}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}

            {isAddingNew ? (
              <div className="p-3 border-b border-slate-200 bg-gray-50">
                <div className="space-y-2">
                  <input
                    ref={addNewInputRef}
                    type="text"
                    className="w-full rounded-sm border border-slate-400 bg-background px-2 py-0.5 leading-6 outline-none"
                    placeholder={addNewPlaceholder}
                    value={newItemValue}
                    onChange={(e) => setNewItemValue(e.target.value)}
                    onKeyDown={handleAddNewKeyDown}
                    onClick={(e) => e.stopPropagation()}
                  />
                  {selectCategory && (
                    <SelectCategory
                      onCategoryChange={handleCategoryChange}
                      labelPosition="none"
                      categoryData={category}
                      categoryOpen={categoryOpen}
                      setCategoryOpen={setCategoryOpen}
                    />
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddNewSubmit}
                      disabled={!newItemValue.trim()}
                      className="h-6 text-xs bg-primary px-2 text-white rounded-md"
                    >
                      Add
                    </button>
                    <button
                      onClick={handleAddNewCancel}
                      className="h-6 text-xs px-2 border rounded-md"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="max-h-[100px] overflow-y-auto">
                  {filteredOptions.length > 0 ? (
                    filteredOptions.map((opt) => (
                      <div
                        key={opt.id}
                        className={cn(
                          "cursor-pointer px-3 py-2 hover:bg-slate-100",
                          selectedValues.some(
                            (v) => v.id.toString() === opt.id.toString(),
                          ) && "bg-blue-50 text-blue-700",
                        )}
                        onClick={() => handleSelect(opt.id.toString())}
                      >
                        {opt.title}
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-gray-500">
                      No matching options
                    </div>
                  )}
                </div>

                {allowAddNew && onAddNew && (
                  <div className="border-t border-slate-200">
                    <div
                      className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50"
                      onClick={handleAddNewClick}
                    >
                      <Plus className="h-3 w-3" />
                      {addNewLabel}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
      {error && <div className="mt-1 px-2 text-xs text-red-500">{error}</div>}
    </div>
  );
}

export default MultiSelectorWithAdd;
