"use client";
import { cn } from "@/lib/cn";
import { Item } from "@/stores/estimate-create";
import { useEstimatePopupStore } from "@/stores/estimate-popup";
import { SquarePen } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { FaTimes, FaSearch, FaChevronDown, FaChevronUp } from "react-icons/fa";

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
  const searchRef = useRef<HTMLInputElement>(null);

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
    setTimeout(() => {
      searchRef.current?.focus();
    }, 50);
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Main Button */}
      <button
        className={cn(
          "relative flex h-10 w-full items-center justify-between rounded-md border-2 border-slate-400 px-4",
          !selected && "text-slate-400"
        )}
        onClick={handleClick}
      >
        <span className="truncate text-sm font-medium">
          {selected ? (selected as any)[display] : label}
        </span>
        {isOpen ? (
          <FaChevronUp className="ml-2" />
        ) : (
          <FaChevronDown className="ml-2" />
        )}

        {/* Edit/Delete buttons for selected items */}
        {selected && (
          <>
            {onEdit && (
              <button
                className="absolute -top-3 right-3.5"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
              >
                <div className="rounded-full bg-[#6571FF] p-1 text-white">
                  <SquarePen className="w-3 h-3 cursor-pointer" />
                </div>
              </button>
            )}
            {onDelete && (alwaysShowDeleteButton || selected) && (
              <button
                className="absolute -right-2 -top-3"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelected(null);
                  onDelete();
                }}
              >
                <div className="rounded-full bg-[#6571FF] p-1 text-white">
                  <FaTimes className="text-[10px]" />
                </div>
              </button>
            )}
          </>
        )}
      </button>

      {/* Dropdown Content */}
      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-1 rounded-md border-2 border-slate-400 bg-background shadow-lg">
          {/* Search Input */}
          {onSearch && (
            <div className="relative m-2">
              <FaSearch className="absolute left-2 top-1/2 -translate-y-1/2 text-[#797979]" />
              <input
                type="text"
                ref={searchRef}
                placeholder="Search..."
                value={searchText}
                className="w-full rounded-md border-2 border-slate-400 p-2 pl-8"
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
          )}

          {/* Options List */}
          <div className="max-h-48 overflow-y-auto p-2">
            {filteredList.map((item, i) => (
              <button
                key={i}
                className="my-1 w-full rounded-md border border-[#6571FF] p-2 text-left text-[#6571FF]"
                onClick={() => handleSelect(item)}
              >
                {(item as any)[display]}
              </button>
            ))}
          </div>

          {/* New Item Button */}
          <div className="border-t-2 border-slate-400 p-2">
            <button
              className="text-[#6571FF]"
              onClick={() => {
                openPopup(type, {
                  itemId: item.id,
                  materialIndex,
                });
                setIsOpen(false);
              }}
            >
              + New {label}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
