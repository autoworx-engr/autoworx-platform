"use client";
import { cn } from "@/lib/cn";
import { capitalCase } from "change-case";
import { ChevronDown, ChevronUp, Filter } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

type TFilterModalState = {
  [key: string]: boolean;
};

type CategoryType = {
  id: number | string;
  name: string;
};

type TProps = {
  selectedItem: string;
  items: CategoryType[];
  type: string;
  modalName: string;
  closeModal: (modalName: string) => void;
  toggleModal: (modalName: string) => void;
  activeModal: TFilterModalState;
};

export default function CannedFilterBySelection({
  selectedItem,
  items,
  type,
  modalName,
  closeModal,
  activeModal,
  toggleModal,
}: TProps) {
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();

  const pageKeyMap: Record<string, string> = {
    laborCategory: "laborPage",
    serviceCategory: "servicePage",
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        closeModal(modalName);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [closeModal, modalName]);

  const handleSelection = (value: string) => {
    const searchParams = new URLSearchParams(params!);
    searchParams.set(type, value);
    const pageKey = pageKeyMap[type];
    if (pageKey) {
      searchParams.set(pageKey, "1");
    }
    const newPath = `${pathname}?${searchParams.toString()}`;
    router.push(newPath);
    closeModal(modalName);
  };

  const handleClear = () => {
    const searchParams = new URLSearchParams(params!);
    searchParams.delete(type);
    const pageKey = pageKeyMap[type];
    if (pageKey) {
      searchParams.set(pageKey, "1");
    }
    const newPath = `${pathname}?${searchParams.toString()}`;
    router.replace(newPath);
    closeModal(modalName);
  };

  const isModalOpen = activeModal[modalName];
  const filterText = type === "types" ? "Types" : capitalCase(type);
  return (
    <div className="relative w-full md:w-auto z-10">
      <button
        ref={buttonRef}
        onClick={() => toggleModal(modalName)}
        className={cn(
          "flex w-full items-center justify-between gap-2 border p-2.5 px-4 text-sm font-medium transition-all duration-200 md:w-48 rounded-lg",
          selectedItem
            ? "border-indigo-500 text-indigo-600 bg-indigo-50 hover:bg-indigo-100"
            : "border-gray-300 text-gray-600 hover:border-indigo-400 bg-white",
          isModalOpen
            ? "rounded-b-none border-b-0 shadow-lg"
            : "shadow-sm hover:shadow-md",
        )}
        title={`Filter by ${filterText}`}
      >
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 shrink-0" />
          <span className="truncate">
            {selectedItem ? selectedItem : filterText}
          </span>
        </div>
        {isModalOpen ? (
          <ChevronUp className="w-4 h-4 shrink-0 text-indigo-600" />
        ) : (
          <ChevronDown className="w-4 h-4 shrink-0 text-gray-500" />
        )}
      </button>

      {isModalOpen && (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 z-50 flex max-h-56 w-full flex-col space-y-1 overflow-y-auto thin-scrollbar rounded-b-lg border border-t-0 border-gray-300 bg-white p-3 shadow-xl md:w-48"
        >
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => handleSelection(item.name)}
              className={`text-sm flex items-center p-2 rounded-md text-start transition-colors duration-150 border ${
                item.name === selectedItem
                  ? "bg-indigo-50 text-indigo-600 font-semibold hover:bg-indigo-100"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {item.name}
            </button>
          ))}
          <button
            onClick={handleClear}
            disabled={!selectedItem}
            className={cn(
              "sticky -bottom-2 z-50 border rounded-md border-gray-200 bg-white py-2 mt-1 text-sm font-medium transition-colors",
              !selectedItem
                ? "text-gray-300 cursor-not-allowed bg-gray-50 hover:text-gray-300 hover:bg-gray-50"
                : "text-red-500 hover:text-red-700",
            )}
          >
            Clear Filter
          </button>
        </div>
      )}
    </div>
  );
}
