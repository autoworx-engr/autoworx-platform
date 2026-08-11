"use client";
import { cn } from "@/lib/cn";
import { Item } from "@/stores/estimate-create";
import { useEstimatePopupStore } from "@/stores/estimate-popup";
import { ChevronDown, PencilLineIcon, Plus, Search, X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type MobileItemSelectorProps<T> = {
  label: string;
  type: "SERVICE" | "MATERIAL" | "LABOR";
  item: Item;
  list: T[];
  display: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onSelect?: (item: T) => void;
  alwaysShowDeleteButton?: boolean;
  materialIndex?: number;
  onSearch?: (search: string) => T[];
  index: number[];
  dropdownsOpen: any;
  setDropdownsOpen: any;
};

export default function MobileItemSelector<T>({
  label,
  type,
  item,
  list,
  display,
  onEdit,
  onDelete,
  onSelect,
  alwaysShowDeleteButton,
  materialIndex,
  onSearch,
  index,
  dropdownsOpen,
  setDropdownsOpen,
}: MobileItemSelectorProps<T>) {
  const [selected, setSelected] = useState<T | null>(null);
  const { open: openPopup } = useEstimatePopupStore();
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [filteredList, setFilteredList] = useState(list);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [dropdownRect, setDropdownRect] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  // Handle initial selected state
  useEffect(() => {
    if (type === "LABOR" && item.labor) {
      setSelected(item.labor as T);
    }
    if (type === "SERVICE" && item.service) {
      setSelected(item.service as T);
    }
    if (type === "MATERIAL" && item.materials[materialIndex!]) {
      setSelected(item.materials[materialIndex!] as T);
    }
  }, [item, type, materialIndex]);

  // Handle click to toggle dropdown
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(!isOpen);
    // Force dropdown to open and focus the search
    // setIsOpen(true);
    // setTimeout(() => {
    //   searchRef.current?.focus();
    // }, 50);
  };

  // Handle search
  const handleSearch = (value: string) => {
    setSearchText(value);
    if (onSearch) {
      setFilteredList(onSearch(value));
    }
  };

  // Handle option selection
  const handleSelect = (selectedItem: T) => {
    switch (type) {
      case "MATERIAL":
        // For materials, set quantity to 0
        const materialWithQuantity = {
          ...selectedItem,
          quantity: 0,
        };
        setSelected(materialWithQuantity as T);
        onSelect?.(materialWithQuantity as T);
        break;

      case "LABOR":
        // For labor, set hours to 0
        const laborWithHours = {
          ...selectedItem,
          hours: 0,
        };
        setSelected(laborWithHours as T);
        onSelect?.(laborWithHours as T);
        break;

      default:
        // For other types (like SERVICE), just pass the item as is
        setSelected(selectedItem);
        onSelect?.(selectedItem);
    }
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedTrigger = containerRef.current?.contains(target);
      const clickedDropdown = dropdownRef.current?.contains(target);
      if (!clickedTrigger && !clickedDropdown) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setDropdownRect({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
      });
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Main Button */}
      <button
        className={cn(
          "relative flex h-11 w-full items-center justify-between rounded-2xl bg-slate-50 px-4 transition-all",
          "ring-1 ring-inset ring-slate-200 hover:bg-slate-100",
          isOpen && "ring-2 ring-primary/40 bg-white shadow-sm",
          !selected && "text-slate-400 font-normal",
          selected && "text-slate-600 font-bold",
        )}
        onClick={handleClick}
      >
        <span className="truncate text-sm">
          {selected ? (selected as any)[display] : `Select ${label}`}
        </span>

        <div
          className={cn(
            "transition-transform duration-200",
            isOpen ? "rotate-180" : "rotate-0",
          )}
        >
          <ChevronDown
            size={18}
            className={isOpen ? "text-primary" : "text-slate-400"}
          />
        </div>

        {/* Edit/Delete badges - Floating style */}
        {selected && (
          <div className="absolute -top-2.5 -right-1 flex items-center gap-1.5">
            {onEdit && (
              <button
                className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 transition-transform hover:scale-110 active:scale-90"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
              >
                <PencilLineIcon className="w-3 h-3" />
              </button>
            )}
            {onDelete && (alwaysShowDeleteButton || selected) && (
              <button
                className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-red-500 shadow-lg transition-transform hover:scale-110 active:scale-90"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelected(null);
                  onDelete();
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}
      </button>

      {isOpen &&
        dropdownRect &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              top: dropdownRect.top,
              left: dropdownRect.left,
              width: dropdownRect.width,
            }}
            className="z-[999] rounded-2xl border-none bg-white p-2 shadow-2xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Search Input */}
            {onSearch && (
              <div className="relative mb-2">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  ref={searchRef}
                  placeholder={`Find ${label.toLowerCase()}...`}
                  value={searchText}
                  className="w-full rounded-xl bg-slate-50 py-2 pl-9 pr-4 text-sm font-medium outline-none ring-1 ring-inset ring-slate-100 focus:ring-2 focus:ring-primary/20 transition-all"
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
            )}

            {/* Options List */}
            <div className="max-h-52 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
              {filteredList.map((item, i) => (
                <button
                  key={i}
                  className={cn(
                    "w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-all",
                    "hover:bg-primary/5 hover:text-primary",
                    selected && (selected as any).id === (item as any).id
                      ? "bg-primary text-white"
                      : "text-slate-600",
                  )}
                  onClick={() => handleSelect(item)}
                >
                  {(item as any)[display]}
                </button>
              ))}
              {filteredList.length === 0 && (
                <div className="py-4 text-center text-xs text-slate-400">
                  No results found
                </div>
              )}
            </div>

            {/* New Item Button */}
            <div className="mt-2 border-t border-slate-50 pt-2">
              <button
                className="flex w-full items-center justify-center gap-2 rounded-xl py-2 text-sm font-semibold text-primary hover:bg-primary/5 transition-colors"
                onClick={() => {
                  openPopup(type, { itemId: item.id, materialIndex });
                  setIsOpen(false);
                }}
              >
                <Plus size={14} /> New {label}
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
