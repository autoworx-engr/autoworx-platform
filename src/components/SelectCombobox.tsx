"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/Tooltip";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from "@/components/ui/combobox";
import { cn } from "@/lib/cn";
import type { JSX } from "react";
import React, { ChangeEvent, useEffect, useRef, useState } from "react";

interface SelectComboboxProps<T> {
  label: (item: T | null) => string;
  items: T[];
  border?: boolean;
  footer?: React.ReactNode;
  newButton: React.ReactNode;
  displayList: (item: T) => JSX.Element;
  onSearch?: (search: string) => T[];
  onSelect?: (item: T) => void;
  openState?: [boolean, React.Dispatch<React.SetStateAction<boolean>>];
  selectedItem?: T | null | undefined;
  setSelectedItem?: React.Dispatch<React.SetStateAction<T | null>>;
  clickabled?: boolean;
  disabled?: boolean;
  className?: string;
  hasNextPage?: boolean;
  fetchNextPage?: () => void;
  isFetchingNextPage?: boolean;
  useInfiniteScroll?: boolean;
}

export default function SelectCombobox<T>({
  label,
  items,
  border,
  newButton,
  displayList,
  onSearch,
  onSelect,
  openState,
  footer,
  selectedItem,
  setSelectedItem,
  clickabled = true,
  disabled = false,
  className,
  hasNextPage = false,
  fetchNextPage,
  isFetchingNextPage = false,
  useInfiniteScroll = false,
}: SelectComboboxProps<T>): JSX.Element {
  const [searchTerm, setSearchTerm] = useState("");
  const [localOpen, setLocalOpen] = useState(false);
  const [isOpen, setIsOpen] = openState || [localOpen, setLocalOpen];
  const [filteredItems, setFilteredItems] = useState<T[]>(items);
  const [selected, setSelected] = useState<T | null | undefined>(selectedItem);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFilteredItems(items);
  }, [items]);

  useEffect(() => {
    setSelected(selectedItem);
  }, [selectedItem]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!useInfiniteScroll || !hasNextPage || isFetchingNextPage) return;

    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;

    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 20;

    if (isNearBottom) {
      fetchNextPage?.();
    }
  };

  function handleSearchChange(e: ChangeEvent<HTMLInputElement>) {
    const searchQuery = e.target.value;
    setSearchTerm(searchQuery);
    if (onSearch) {
      setFilteredItems(onSearch(searchQuery));
    } else {
      const searchedItems = searchQuery.trim()
        ? items.filter(
            (item: any) =>
              item.clientName
                ?.toLowerCase()
                .includes(searchQuery.toLowerCase()) ||
              item.id
                ?.toString()
                .toLowerCase()
                .includes(searchQuery.toLowerCase()),
          )
        : items;
      setFilteredItems(searchedItems);
    }
  }

  function handleSelectItem(item: T) {
    setSelected(item);
    if (setSelectedItem) setSelectedItem(item);
    if (onSelect) onSelect(item);
    setIsOpen(false);
    setSearchTerm("");
    setFilteredItems(items);
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setSearchTerm("");
      setFilteredItems(items);
    }
  };

  return (
    <Combobox
      items={filteredItems}
      value={selected ?? undefined}
      onValueChange={(item) => {
        if (item) {
          handleSelectItem(item);
        }
      }}
      open={isOpen}
      onOpenChange={handleOpenChange}
      disabled={disabled}
    >
      <div
        className={cn("w-full max-w-sm transition-all duration-300", className)}
      >
        <ComboboxTrigger
          render={
            <Button
              variant="outline"
              className={cn(
                "group flex h-9 mt-1 w-[99%] items-center justify-between rounded-lg px-4 transition-all duration-300 outline-none",
                "bg-white/80 dark:bg-slate-900/50 backdrop-blur-sm shadow-sm hover:shadow-md",
                "ring-1 ring-slate-200 dark:ring-slate-800",
                isOpen
                  ? "ring-2 ring-primary/60 border-transparent"
                  : "hover:ring-slate-300",
                disabled && "opacity-50 cursor-not-allowed",
              )}
            >
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300 truncate pr-2">
                      <ComboboxValue placeholder={label(null)} />
                    </span>
                  </TooltipTrigger>
                  {selected && label(selected).length > 25 && (
                    <TooltipContent className="bg-slate-900 text-white border-none shadow-xl">
                      <p>{label(selected)}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </Button>
          }
        />
        <ComboboxContent
          className={cn(
            "z-50 w-[var(--radix-popper-anchor-width)] min-w-[280px] overflow-hidden rounded-xl",
            "border border-slate-200/60 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200",
          )}
        >
          <div className="relative p-2 border-b border-slate-100 dark:border-slate-800">
            <ComboboxInput
              placeholder="Search items..."
              className="w-full rounded-md bg-slate-50 dark:bg-slate-800/50 py-1.5 pl-8 pr-8 text-sm outline-none ring-1 ring-transparent focus:ring-primary/30 focus:bg-white transition-all"
              onChange={handleSearchChange}
              value={searchTerm}
              autoFocus
              showTrigger={false}
            />
          </div>
          <ComboboxEmpty>No items found.</ComboboxEmpty>
          <ComboboxList
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="mb-5 flex max-h-40 flex-col overflow-y-auto"
          >
            {(item) => {
              const key = (item as any)?.id
                ? `item-${(item as any).id}`
                : `item-${JSON.stringify(item)}`;
              if (clickabled) {
                return (
                  <ComboboxItem
                    key={key}
                    value={item}
                    className={cn(
                      "w-full p-1 px-2 text-left hover:bg-gray-100",
                      border &&
                        "relative border-b border-slate-200 dark:border-slate-800 px-2 py-1.5 rounded-xl",
                    )}
                  >
                    {displayList(item)}
                  </ComboboxItem>
                );
              } else {
                return (
                  <div
                    key={key}
                    className={cn(
                      "w-full p-1 px-2 text-left",
                      border &&
                        "relative border-b border-slate-200 dark:border-slate-800 px-2 py-1.5 rounded-xl",
                    )}
                  >
                    {displayList(item)}
                  </div>
                );
              }
            }}
          </ComboboxList>
          {useInfiniteScroll && isFetchingNextPage && (
            <div className="flex justify-center py-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
            </div>
          )}
          <div className="bg-slate-50/50 dark:bg-slate-800/30 p-2 border-t border-slate-100 dark:border-slate-800">
            {newButton}
            {footer && <div className="mt-1">{footer}</div>}
          </div>
        </ComboboxContent>
      </div>
    </Combobox>
  );
}
