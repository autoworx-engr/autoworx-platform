import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/Tooltip";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/cn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown, Search } from "lucide-react";
import type { JSX } from "react";
import React, { ChangeEvent, useEffect, useRef, useState } from "react";

interface SelectorProps<T> {
  label: (item: T | null) => string;
  items: T[];
  border?: boolean;
  footer?: React.ReactNode;
  newButton?: React.ReactNode;
  displayList: (item: T) => JSX.Element;
  onSearch?: (search: string) => T[];
  onSelect?: (item: T) => void;
  openState?: [boolean, React.Dispatch<React.SetStateAction<boolean>>];
  selectedItem?: T | null | undefined;
  setSelectedItem?: React.Dispatch<React.SetStateAction<T | null>>;
  clickabled?: boolean;
  disabledDropdown?: boolean;
  className?: string;
  hasNextPage?: boolean;
  fetchNextPage?: () => void;
  isFetchingNextPage?: boolean;
  useInfiniteScroll?: boolean;
  showSearch?: boolean;
  usePortal?: boolean;
  isLoading?: boolean;
}

export default function Selector<T>({
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
  disabledDropdown = false,
  className,
  hasNextPage = false,
  fetchNextPage,
  isFetchingNextPage = false,
  useInfiniteScroll = false,
  showSearch = true,
  usePortal = false,
  isLoading = false,
}: SelectorProps<T>): JSX.Element {
  const [searchTerm, setSearchTerm] = useState("");
  const [localOpen, setLocalOpen] = useState(false);
  const [useCompactTriggerBehavior, setUseCompactTriggerBehavior] =
    useState(false);
  const [isOpen, setIsOpen] = openState || [localOpen, setLocalOpen];
  const [filteredItems, setFilteredItems] = useState<T[]>(items);
  const [selected, setSelected] = useState<T | null | undefined>(selectedItem);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFilteredItems(items);
  }, [items]);
  // useEffect(() => {
  //   setSelected(selectedItem);
  // }, [selectedItem]);

  // Update selected item when selectedItem prop changes
  useEffect(() => {
    setSelected(selectedItem);
  }, [selectedItem]);

  useEffect(() => {
    const updateViewportBehavior = () => {
      setUseCompactTriggerBehavior(window.innerWidth < 660);
    };

    updateViewportBehavior();
    window.addEventListener("resize", updateViewportBehavior);

    return () => {
      window.removeEventListener("resize", updateViewportBehavior);
    };
  }, []);

  // Infinite scroll handler
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
    const trimmedQuery = searchQuery.trim();
    setSearchTerm(searchQuery);
    if (onSearch) {
      setFilteredItems(onSearch(trimmedQuery));
    } else {
      const searchedItems = trimmedQuery
        ? items.filter(
            (item: any) =>
              item.clientName
                ?.toLowerCase()
                .includes(trimmedQuery.toLowerCase()) ||
              item.id
                ?.toString()
                .toLowerCase()
                .includes(trimmedQuery.toLowerCase()),
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

  const dropdownInnerContent = (
    <>
      {/* Search Area */}
      {showSearch && (
        <div className="relative px-2 py-2 border-b border-slate-100">
          <Search
            size={14}
            strokeWidth={2.5}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Search..."
            className="w-full rounded-md bg-slate-50 py-1.5 pl-8 pr-3 text-sm outline-none border border-transparent focus:border-primary/40 focus:bg-white placeholder:text-slate-400 transition-colors duration-150"
            onChange={handleSearchChange}
            value={searchTerm}
          />
        </div>
      )}

      {/* Items list */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex max-h-48 flex-col overflow-y-auto py-1 thin-scrollbar"
      >
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-6 px-4">
            <Spinner className="size-4 text-primary" />
            <p className="text-sm text-slate-400">Loading...</p>
          </div>
        ) : filteredItems?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 px-4">
            <Search size={18} className="text-slate-300 mb-1.5" />
            <p className="text-sm text-slate-400">No results found</p>
          </div>
        ) : (
          filteredItems?.map((item, index) => {
            const key = (item as any)?.id
              ? `item-${(item as any).id}`
              : `index-${index}`;

            const isSelected =
              selected !== null &&
              ((item as any)?.id && (selected as any)?.id
                ? (item as any).id === (selected as any).id
                : item === selected);

            if (clickabled) {
              return (
                <button
                  onClick={() => handleSelectItem(item)}
                  type="button"
                  key={key}
                  className={cn(
                    "flex w-full items-center gap-2 px-2.5 py-2 text-left text-sm transition-colors duration-100",
                    "hover:bg-primary/5 active:bg-primary/10",
                    isSelected && "bg-primary/10",
                    border &&
                      "border-b border-slate-100 rounded-md last:border-b-0",
                  )}
                >
                  <div className="flex-1 min-w-0">{displayList(item)}</div>
                  <span className="flex w-4 shrink-0 items-center justify-center">
                    {isSelected && (
                      <Check
                        size={14}
                        strokeWidth={3}
                        className="text-primary"
                      />
                    )}
                  </span>
                </button>
              );
            } else {
              return (
                <div
                  key={key}
                  className={cn(
                    "flex w-full items-center gap-2 px-2.5 py-2 text-left text-sm",
                    "hover:bg-primary/5",
                    border && "border-b border-slate-100 last:border-b-0",
                  )}
                >
                  <div className="flex-1 min-w-0">{displayList(item)}</div>
                </div>
              );
            }
          })
        )}

        {/* Loading indicator for infinite scroll */}
        {isFetchingNextPage && (
          <div className="flex items-center justify-center gap-2 py-3">
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-200 border-t-primary" />
            <span className="text-xs text-slate-400">Loading...</span>
          </div>
        )}
      </div>

      {/* Footer / Action area */}
      {(newButton || footer) && (
        <div className="border-t border-slate-100 p-1.5">
          {newButton}
          {footer && <div className="mt-1">{footer}</div>}
        </div>
      )}
    </>
  );

  const contentClassName = cn(
    "z-50 w-[var(--radix-popper-anchor-width)] min-w-[220px] overflow-hidden rounded-lg",
    "border border-slate-200 bg-white shadow-lg",
    "animate-in fade-in-0 zoom-in-95 duration-150",
  );

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      {/*
        FIX (alignment): the wrapper previously capped width at `max-w-sm`
        (384px), which kept this control from stretching to match the width
        of sibling SlimInput/DropdownSelection fields in a grid. `className`
        (passed by callers) now comes after `w-full` with no competing
        max-w-* utility, so callers can still constrain width when they
        actually want to.
      */}
      <div className={cn("w-full transition-all duration-300", className)}>
        <DropdownMenuTrigger
          onPointerDown={
            useCompactTriggerBehavior ? (e) => e.preventDefault() : undefined
          }
          onFocus={
            useCompactTriggerBehavior ? (e) => e.preventDefault() : undefined
          }
          onClick={(e) => {
            if (!useCompactTriggerBehavior) {
              return;
            }
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          disabled={disabledDropdown}
          className={cn(
            // FIX (alignment): was `h-9 mt-1 w-[99%]`. The 9-unit height
            // (36px) was 4px shorter than the h-10 (40px) SlimInput/
            // DropdownSelection controls it sits next to in the grid, and
            // `mt-1` added an extra 4px top offset on top of that — together
            // these produced the vertical misalignment between "Assign To"/
            // "Priority" and the other fields in the same row. `w-[99%]`
            // is replaced with `w-full` to match sibling fields exactly.
            "group flex h-10 w-full items-center justify-between rounded-lg px-4 transition-all duration-300 outline-none",
            "bg-white/80 dark:bg-slate-900/50 backdrop-blur-sm shadow-sm hover:shadow-md",
            "ring-1 ring-slate-200 dark:ring-slate-800",
            isOpen
              ? "ring-2 ring-primary/60 border-transparent"
              : "hover:ring-slate-300",
            disabledDropdown && "opacity-50 cursor-not-allowed",
          )}
        >
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300 truncate pr-2">
                  {isLoading && !selected
                    ? "Loading..."
                    : selected
                      ? label(selected)
                      : label(null)}
                </span>
              </TooltipTrigger>
              {selected && label(selected).length > 25 && (
                <TooltipContent className="bg-slate-900 text-white border-none shadow-xl">
                  <p>{label(selected)}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>

          {isLoading ? (
            <Spinner className="size-4 shrink-0 text-primary" />
          ) : (
            !disabledDropdown && (
              <ChevronDown
                size={16}
                className={cn(
                  "text-muted-foreground transition-transform duration-200",
                  isOpen && "rotate-180 text-ring",
                )}
              />
            )
          )}
        </DropdownMenuTrigger>

        {usePortal ? (
          <DropdownMenuPortal>
            <DropdownMenuContent
              align="start"
              sideOffset={4}
              className={contentClassName}
            >
              {dropdownInnerContent}
            </DropdownMenuContent>
          </DropdownMenuPortal>
        ) : (
          <DropdownMenuContent
            align="start"
            sideOffset={4}
            className={contentClassName}
          >
            {dropdownInnerContent}
          </DropdownMenuContent>
        )}
      </div>
    </DropdownMenu>
  );
}
