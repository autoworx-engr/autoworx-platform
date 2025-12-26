import { cn } from "@/lib/cn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@radix-ui/react-dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/Tooltip";
import React, {
  ChangeEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { ChevronDown, Search, X } from "lucide-react";

interface SelectorProps<T> {
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
  disabledDropdown?: boolean;
  className?: string;
  hasNextPage?: boolean;
  fetchNextPage?: () => void;
  isFetchingNextPage?: boolean;
  useInfiniteScroll?: boolean;
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
}: SelectorProps<T>): JSX.Element {
  const [searchTerm, setSearchTerm] = useState("");
  const [localOpen, setLocalOpen] = useState(false);
  const [isOpen, setIsOpen] = openState || [localOpen, setLocalOpen];
  const [filteredItems, setFilteredItems] = useState<T[]>(items);
  const [selected, setSelected] = useState<T | null | undefined>(selectedItem);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setFilteredItems(items); }, [items]);
  useEffect(() => { setSelected(selectedItem); }, [selectedItem]);

  const handleScroll = useCallback(() => {
    if (!useInfiniteScroll || !scrollContainerRef.current || !hasNextPage || isFetchingNextPage) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 10 && fetchNextPage) fetchNextPage();
  }, [useInfiniteScroll, hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (useInfiniteScroll && scrollContainer) {
      scrollContainer.addEventListener("scroll", handleScroll);
      return () => scrollContainer.removeEventListener("scroll", handleScroll);
    }
  }, [handleScroll, useInfiniteScroll]);

  function handleSearchChange(e: ChangeEvent<HTMLInputElement>) {
    const searchQuery = e.target.value;
    setSearchTerm(searchQuery);
    if (onSearch) {
      setFilteredItems(onSearch(searchQuery));
    } else {
      const searchedItems = searchQuery.trim()
        ? items.filter((item: any) =>
        (item.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.id?.toString().toLowerCase().includes(searchQuery.toLowerCase())))
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
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <div className={cn("w-full transition-all duration-300", className)}>
        <DropdownMenuTrigger
          disabled={disabledDropdown}
          className={cn(
            "group flex h-9 mt-1 w-full items-center justify-between rounded-lg px-4 transition-all duration-300 outline-none",
            "bg-white/80 dark:bg-slate-900/50 backdrop-blur-sm shadow-sm hover:shadow-md",
            "ring-1 ring-slate-200 dark:ring-slate-800",
            isOpen ? "ring-2 ring-[#6571FF]/60 border-transparent" : "hover:ring-slate-300",
            disabledDropdown && "opacity-50 cursor-not-allowed"
          )}
        >
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300 truncate pr-2">
                  {selected ? label(selected) : label(null)}
                </span>
              </TooltipTrigger>
              {selected && label(selected).length > 25 && (
                <TooltipContent className="bg-slate-900 text-white border-none shadow-xl">
                  <p>{label(selected)}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>

          {!disabledDropdown && (
            <ChevronDown
              size={18}
              className={cn(
                "text-slate-400 transition-transform duration-300",
                isOpen && "rotate-180 text-[#6571FF]"
              )}
            />
          )}
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="start"
          sideOffset={8}
          className={cn(
            "z-50 w-[var(--radix-popper-anchor-width)] overflow-hidden rounded-xl",
            "border border-slate-200/60 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200"
          )}
        >
          {/* Modern Search Area */}
          <div className="relative p-2 border-b border-slate-100 dark:border-slate-800">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search items..."
              className="w-full rounded-md bg-slate-50 dark:bg-slate-800/50 py-1.5 pl-8 pr-8 text-sm outline-none ring-1 ring-transparent focus:ring-[#6571FF]/30 focus:bg-white transition-all"
              onChange={handleSearchChange}
              value={searchTerm}
              autoFocus
            />
          </div>

          {/* List Content */}
          <div ref={scrollContainerRef} className="max-h-60 overflow-y-auto p-1 custom-scrollbar space-y-1">
            {filteredItems?.length > 0 ? (
              filteredItems.map((item, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => clickabled && handleSelectItem(item)}
                  className={cn(
                    "w-full border rounded-md px-3 py-2 text-left text-sm transition-all duration-200",
                    "hover:bg-[#6571FF]/10 hover:text-[#6571FF]",
                    selected === item ? "bg-[#6571FF]/5 text-[#6571FF] font-semibold border-[#6571FF]" : "text-slate-600 dark:text-slate-400",
                    border && "my-1 ring-1 ring-slate-100 hover:ring-[#6571FF]/30"
                  )}
                >
                  {displayList(item)}
                </button>
              ))
            ) : (
              <div className="py-3 text-center text-xs text-slate-400">No results found</div>
            )}

            {isFetchingNextPage && (
              <div className="flex justify-center py-3">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-[#6571FF]" />
              </div>
            )}
          </div>

          {/* New Button / Action Footer */}
          <div className="bg-slate-50/50 dark:bg-slate-800/30 p-2 border-t border-slate-100 dark:border-slate-800">
            {newButton}
            {footer && <div className="mt-1">{footer}</div>}
          </div>
        </DropdownMenuContent>
      </div>
    </DropdownMenu>
  );
}