"use client";

import { normalizeSearch } from "@/utils/normalizeSearch";

import type React from "react";

import { cn } from "@/lib/utils";
import { Category } from "@prisma/client";
import { Popconfirm } from "antd";
import {
  AlertCircle,
  Check,
  ChevronDown,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import SelectCategory from "./Lists/SelectCategory";
import { Spinner } from "@/components/ui/spinner";

export type SelectorWithAddProps = {
  label?: ReactNode;
  name: string;
  options: string[] | number[] | { id: string | number; title: string }[];
  value?: string | { id: string | number; title: string };
  onChange?: (value: string | { id: string | number; title: string }) => void;
  rootClassName?: string;
  labelClassName?: string;
  required?: boolean;
  error?: string;
  placeholder?: string;
  isSearch?: boolean;
  disabled?: boolean;
  isLoading?: boolean;
  allowClear?: boolean;
  allowAddNew?: boolean;
  addNewLabel?: string;
  onAddNew?: (newItem: string, category?: Category | null) => void;
  addNewPlaceholder?: string;
  selectCategory?: boolean;
  allowDelete?: boolean;
  onDelete?: (id: string | number) => void;
  deleteConfirmTitle?: string;
  deleteConfirmDescription?: string;
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

export function SelectorWithAdd({
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
  isLoading = false,
  allowClear = true,
  allowAddNew = false,
  addNewLabel = "Add new item",
  onAddNew,
  addNewPlaceholder = "Enter new item",
  selectCategory = false,
  allowDelete = false,
  onDelete,
  deleteConfirmTitle = "Remove this option",
  deleteConfirmDescription = "Are you sure you want to remove this?",
}: SelectorWithAddProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(value?.toString() || "");
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newItemValue, setNewItemValue] = useState("");
  const [deleteConfirmOpenId, setDeleteConfirmOpenId] = useState<string | null>(
    null,
  );
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const addNewInputRef = useRef<HTMLInputElement>(null);

  const [category, setCategory] = useState<Category | null>(null);

  const [categoryOpen, setCategoryOpen] = useState(false);
  useEffect(() => {
    if (value !== undefined) {
      setSelectedValue(value?.toString());
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      const target = event.target as HTMLElement | null;
      // Ignore clicks inside antd portaled popups (e.g. the delete Popconfirm),
      // otherwise the dropdown unmounts before the confirm action can run.
      if (target?.closest?.(".ant-popover, .ant-popconfirm")) {
        return;
      }
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

    document.addEventListener("pointerdown", handleClickOutside);
    return () => {
      document.removeEventListener("pointerdown", handleClickOutside);
    };
  }, []);

  // Focus search input when dropdown opens
  // useEffect(() => {
  //   if (isOpen && isSearch && searchInputRef.current && !isAddingNew) {
  //     searchInputRef.current.focus();
  //   }
  // }, [isOpen, isSearch, isAddingNew]);

  // Focus add new input when adding new item
  useEffect(() => {
    if (isAddingNew && addNewInputRef.current) {
      addNewInputRef.current.focus();
    }
  }, [isAddingNew]);

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

  const filteredOptions = searchTerm.trim()
    ? normalizedOptions.filter((opt) =>
        normalizeSearch(opt.title).includes(normalizeSearch(searchTerm)),
      )
    : normalizedOptions;

  const handleSelect = (id: string) => {
    setSelectedValue(id);
    setIsOpen(false);
    setSearchTerm("");
    setIsAddingNew(false);
    setNewItemValue("");
    setCategory(null);
    setCategoryOpen(false);
    if (onChange) {
      const selectedOption = normalizedOptions.find(
        (opt) => opt.id.toString() === id,
      );
      onChange(selectedOption || id);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedValue("");
    if (onChange) {
      onChange("");
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
  };

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
    if (e.key === "Enter") {
      handleAddNewSubmit();
    } else if (e.key === "Escape") {
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

  const handleCategoryChange = (newCategory: Category | null) => {
    setCategory(newCategory);
  };
  const selectedLabel = normalizedOptions?.find(
    (opt) => opt?.id?.toString() === selectedValue,
  )?.title;

  const hasValue = selectedValue && selectedValue !== "";
  const isInteractionBlocked = disabled || isLoading;
  const showClear = Boolean(hasValue && allowClear && !isInteractionBlocked);

  return (
    <div className={cn("block group", rootClassName)} ref={dropdownRef}>
      {/* Label Styling */}
      <div
        className={cn(
          "mb-1.5 flex items-center gap-1 text-base font-medium",
          labelClassName,
        )}
      >
        {label ?? sentenceCase(name)}
        {required && <span className="text-destructive">*</span>}
      </div>

      <div className="relative">
        <button
          type="button"
          className={cn(
            "flex w-full touch-manipulation items-center justify-between rounded-lg border-none px-3 py-2 text-left text-sm leading-6 transition-all duration-300 outline-none ring-1",
            showClear ? "pr-[4.5rem]" : "pr-10",
            isOpen
              ? "bg-white ring-primary shadow-lg shadow-primary/10"
              : "bg-slate-50/50 ring-slate-200 hover:bg-white hover:ring-slate-300 hover:shadow-sm",
            error && "ring-rose-500 focus:ring-rose-500",
            isInteractionBlocked &&
              "cursor-not-allowed bg-slate-100 opacity-60 ring-slate-200",
          )}
          onClick={() => !isInteractionBlocked && setIsOpen(!isOpen)}
          id={name}
          disabled={isInteractionBlocked}
        >
          <span
            className={cn(
              "truncate transition-colors",
              selectedLabel ? "font-medium text-slate-700" : "text-slate-400",
            )}
          >
            {selectedLabel || (isLoading ? "Loading..." : placeholder)}
          </span>
        </button>

        <div className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {showClear && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear selection"
              title="Clear selection"
              className="pointer-events-auto flex size-7 items-center justify-center rounded-full bg-slate-200/50 text-slate-500 transition-colors hover:bg-rose-100 hover:text-rose-600"
            >
              <X strokeWidth={3} className="h-3 w-3" />
            </button>
          )}
          {isLoading ? (
            <Spinner className="size-4 shrink-0 text-primary" />
          ) : (
            <ChevronDown
              className={cn(
                "h-4 w-4 text-slate-400 transition-transform duration-300",
                isOpen && "rotate-180 text-primary",
              )}
            />
          )}
        </div>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border-none bg-white/90 shadow-2xl backdrop-blur-xl ring-1 ring-slate-200/60 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Search Input Section */}
            {isSearch && !isAddingNew && (
              <div className="sticky top-0 z-20 border-b border-slate-100 bg-white/50 p-2.5">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    className="w-full rounded-lg bg-slate-100/50 py-1.5 pl-8 pr-3 text-sm text-slate-600 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-primary/20"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    onKeyDown={handleSearchKeyDown}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            )}

            {/* Add New Item Surface */}
            {isAddingNew ? (
              <div className="border-b border-slate-100 bg-slate-50/50 p-4">
                <div className="space-y-3">
                  <input
                    ref={addNewInputRef}
                    type="text"
                    className="w-full rounded-lg border-none bg-white px-3 py-2 text-sm text-slate-600 shadow-sm ring-1 ring-slate-200 outline-none transition-all focus:ring-2 focus:ring-primary/40"
                    placeholder={addNewPlaceholder}
                    value={newItemValue}
                    onChange={(e) => setNewItemValue(e.target.value)}
                    onKeyDown={handleAddNewKeyDown}
                    onClick={(e) => e.stopPropagation()}
                  />

                  {selectCategory && (
                    <div className="rounded-lg bg-white ring-1 ring-slate-100">
                      <SelectCategory
                        onCategoryChange={handleCategoryChange}
                        labelPosition="none"
                        categoryData={category}
                        categoryOpen={categoryOpen}
                        setCategoryOpen={setCategoryOpen}
                      />
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleAddNewSubmit}
                      disabled={!newItemValue.trim()}
                      className="flex-1 touch-manipulation rounded-lg bg-primary py-2 text-xs font-bold text-white shadow-md shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
                    >
                      Create New
                    </button>
                    <button
                      type="button"
                      onClick={handleAddNewCancel}
                      className="touch-manipulation rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-500 ring-1 ring-slate-200 transition-all hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Scrollable Options List */}
                <div className="max-h-56 overflow-y-auto p-1.5">
                  {filteredOptions?.length > 0 ? (
                    filteredOptions?.map((opt) => {
                      const optionId = opt?.id?.toString();
                      const isSelected = selectedValue === optionId;
                      const isDeletable =
                        allowDelete &&
                        !!onDelete &&
                        !String(opt?.id).startsWith("custom_");
                      return (
                        <div
                          key={opt?.id}
                          className={cn(
                            "group/item flex cursor-pointer touch-manipulation items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-all duration-200",
                            isSelected
                              ? "bg-primary/10 text-primary font-semibold"
                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                          )}
                          onClick={(e) => {
                            const target = e.target as HTMLElement;
                            if (
                              target.closest("[data-selector-delete-trigger]")
                            ) {
                              return;
                            }

                            handleSelect(opt?.id?.toString());
                          }}
                        >
                          <span className="truncate">{opt?.title}</span>
                          <div className="flex shrink-0 items-center gap-1.5">
                            {isSelected && (
                              <Check className="h-4 w-4" strokeWidth={3} />
                            )}
                            {isDeletable && (
                              <span data-selector-delete-trigger>
                                <Popconfirm
                                  title={deleteConfirmTitle}
                                  description={deleteConfirmDescription}
                                  okText="Yes"
                                  cancelText="No"
                                  onOpenChange={(open) => {
                                    setDeleteConfirmOpenId(
                                      open ? optionId : null,
                                    );
                                  }}
                                  onCancel={(e) => {
                                    e?.stopPropagation();
                                    setDeleteConfirmOpenId(null);
                                  }}
                                  onConfirm={(e) => {
                                    e?.stopPropagation();
                                    setDeleteConfirmOpenId(null);
                                    onDelete?.(opt.id);
                                  }}
                                >
                                  <button
                                    type="button"
                                    title="Remove"
                                    aria-label={`Remove ${opt?.title}`}
                                    // Always visible: hiding it behind hover
                                    // made it undiscoverable on touch devices
                                    // and unreachable by keyboard.
                                    className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-600"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </Popconfirm>
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="px-3 py-6 text-center">
                      <p className="text-xs font-medium text-slate-400 italic">
                        No matching results found
                      </p>
                    </div>
                  )}
                </div>

                {/* Bottom Footer Action */}
                {allowAddNew && onAddNew && (
                  <div className="border-t border-slate-100 bg-slate-50/30 p-1.5">
                    <button
                      type="button"
                      className="flex w-full touch-manipulation items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-primary transition-all hover:bg-primary/5 active:scale-[0.98]"
                      onClick={handleAddNewClick}
                    >
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">
                        <Plus className="h-3 w-3" strokeWidth={3} />
                      </div>
                      {addNewLabel}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mt-1.5 flex items-center gap-1 px-1 text-[11px] font-medium text-rose-500 animate-in fade-in slide-in-from-top-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </div>
      )}
    </div>
  );
}

export default SelectorWithAdd;
