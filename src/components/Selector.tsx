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
import { ChevronDown, ChevronUp, Search } from "lucide-react";

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
  // Infinite scroll props
  hasNextPage?: boolean;
  fetchNextPage?: () => void;
  isFetchingNextPage?: boolean;
  useInfiniteScroll?: boolean;
}

/**
 * Selector Component
 *
 * This component is a reusable dropdown selector with search functionality.
 *
 * @template T - The type of items in the dropdown list.
 * @param {SelectorProps<T>} props - The props for the Selector component.
 * @param {(item: T | null) => string} props.label - A function to render the label for the selected item or the default label if no item is selected.
 * @param {T[]} props.items - The list of items to display in the dropdown.
 * @param {React.ReactNode} props.newButton - A button or element to display at the bottom of the dropdown.
 * @param {(item: T) => JSX.Element} props.displayList - A function to render each item in the list.
 * @param {(search: string) => T[]} [props.onSearch] - A function to handle search input and return the filtered items.
 * @param {(item: T) => void} [props.onSelect] - A function to handle item selection.
 * @param {[boolean, React.Dispatch<React.SetStateAction<boolean>>]} [props.openState] - Optional state for controlling the open state from outside.
 * @param {T | null | undefined} [props.selectedItem] - The currently selected item.
 * @param {React.Dispatch<React.SetStateAction<T | null>>} [props.setSelectedItem] - Function to set the selected item.
 * @param {boolean} [props.clickabled] - Optional prop to enable/disable item selection.
 * @param {boolean} [props.disabledDropdown] - Optional prop to disable the dropdown.
 * @returns {JSX.Element} The rendered Selector component.
 */
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
  // Infinite scroll props
  hasNextPage = false,
  fetchNextPage,
  isFetchingNextPage = false,
  useInfiniteScroll = false,
}: SelectorProps<T>): JSX.Element {
  // Using provided open state or setting local state
  const [searchTerm, setSearchTerm] = useState("");
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [isOpen, setIsOpen] = openState || useState(false);
  // Local state to manage the list of items to display
  const [filteredItems, setFilteredItems] = useState<T[]>(items);
  // Local state to manage the selected item
  const [selected, setSelected] = useState<T | null | undefined>(selectedItem);

  // Ref for the scrollable container
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Update item list when items prop changes
  useEffect(() => {
    setFilteredItems(items);
  }, [items]);

  // Update selected item when selectedItem prop changes
  useEffect(() => {
    setSelected(selectedItem);
  }, [selectedItem]);

  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    if (
      !useInfiniteScroll ||
      !scrollContainerRef.current ||
      !hasNextPage ||
      isFetchingNextPage
    ) {
      return;
    }

    const { scrollTop, scrollHeight, clientHeight } =
      scrollContainerRef.current;
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 10;

    if (isNearBottom && fetchNextPage) {
      fetchNextPage();
    }
  }, [useInfiniteScroll, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Attach scroll event listener
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (useInfiniteScroll && scrollContainer) {
      scrollContainer.addEventListener("scroll", handleScroll);
      return () => scrollContainer.removeEventListener("scroll", handleScroll);
    }
  }, [handleScroll, useInfiniteScroll]);

  /**
   * Handle search input change
   *
   * @param {ChangeEvent<HTMLInputElement>} e - The change event of the input field.
   */
  function handleSearchChange(e: ChangeEvent<HTMLInputElement>) {
    const searchQuery = e.target.value;
    setSearchTerm(searchQuery);
    if (onSearch) {
      const searchResults = onSearch(searchQuery);
      setFilteredItems(searchResults);
    } else {
      const searchedItems = searchQuery.trim()
        ? filteredItems.filter((item: any) => {
            return (
              item.clientName
                .toLowerCase()
                .includes(searchQuery.toLowerCase()) ||
              item.id
                .toString()
                .toLowerCase()
                .includes(searchQuery.toLowerCase())
            );
          })
        : items;

      setFilteredItems(searchedItems);
    }
  }

  /**
   * Handle item selection
   *
   * @param {T} item - The selected item.
   */
  function handleSelectItem(item: T) {
    setSelected(item);
    if (setSelectedItem) setSelectedItem(item);
    if (onSelect) onSelect(item);
    if (setIsOpen) setIsOpen(false);
    if (onSearch) {
      const searchResults = onSearch("");
      setFilteredItems(searchResults);
    }
    setSearchTerm(""); // Clear search term on selection
  }

  /**
   * Handle dropdown close
   */
  function handleCloseDropdown() {
    setIsOpen(false);
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <div className={cn("w-full max-w-96", className)}>
        <DropdownMenuTrigger
          disabled={disabledDropdown}
          onClick={() => setIsOpen && setIsOpen(true)}
          className={cn(
            "flex h-10 w-full items-center  justify-between rounded-md border-2 border-slate-400 px-4",
            isOpen && "invisible"
          )}
        >
          {/* Display selected item or label */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="text-sm font-medium text-slate-700 cursor-default">
                  {selected
                    ? label(selected).length > 25
                      ? label(selected).substring(0, 25) + "..."
                      : label(selected)
                    : label(null)}
                </p>
              </TooltipTrigger>
              {selected && label(selected).length > 25 && (
                <TooltipContent>
                  <p>{label(selected)}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
          {!disabledDropdown && <ChevronDown className="ms-4 text-[#797979]" />}
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="start"
          sideOffset={-40}
          className="z-50 w-[300px] rounded-lg border-2 border-slate-400 bg-background md:w-full"
          style={{
            minWidth: "var(--radix-popper-anchor-width)",
            // maxWidth: "var(--radix-popper-anchor-width)",
          }}
        >
          {/* Search input */}
          <div className="relative m-2">
            <Search
              size={18}
              className="absolute left-2 top-1/2 -translate-y-1/2 transform text-[#797979]"
            />
            <input
              type="text"
              placeholder="Search"
              className="w-full rounded-md border-2 border-slate-400 p-1 pl-6 pr-10 focus:outline-none"
              onChange={handleSearchChange}
              value={searchTerm}
            />
            <button onClick={handleCloseDropdown}>
              <ChevronUp className="absolute right-2 top-1/2 -translate-y-1/2 transform text-[#797979]" />
            </button>
          </div>

          {/* Display list of items */}
          <div
            ref={scrollContainerRef}
            className="mb-5 flex max-h-40 flex-col overflow-y-auto"
          >
            {filteredItems?.map((item, index) => {
              // Use a unique key that combines the item's id if available, otherwise fall back to index
              const key = (item as any)?.id
                ? `item-${(item as any).id}`
                : `index-${index}`;

              if (clickabled) {
                return (
                  <button
                    onClick={() => {
                      handleSelectItem(item);
                    }}
                    type="button"
                    key={key}
                    className={cn(
                      "w-full p-1 px-2 text-left hover:bg-gray-100",
                      border &&
                        "relative left-1/2 my-1 w-[95%] -translate-x-1/2 rounded-md border-2 border-slate-400 py-[0.3rem]"
                    )}
                  >
                    {displayList(item)}
                  </button>
                );
              } else {
                return (
                  <div
                    key={key}
                    className={cn(
                      "w-full p-1 px-2 text-left hover:bg-gray-100",
                      border &&
                        "relative left-1/2 my-1 w-[95%] -translate-x-1/2 rounded-md border-2 border-slate-400 py-[0.3rem]"
                    )}
                  >
                    {displayList(item)}
                  </div>
                );
              }
            })}

            {/* Loading indicator for infinite scroll */}
            {useInfiniteScroll && isFetchingNextPage && (
              <div className="flex justify-center py-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
              </div>
            )}

            {/* End of list indicator */}
            {useInfiniteScroll && !hasNextPage && filteredItems.length > 0 && (
              <div className="py-2 text-center text-xs text-gray-500">
                No more items to load
              </div>
            )}
          </div>
          {/* Footer content like Clear button */}
          {footer && (
            <div className="mt-1 border-t pt-1" onClick={handleCloseDropdown}>
              {footer}
            </div>
          )}
          {/* New button */}
          <div className="border-t-2 border-slate-400 p-2">{newButton}</div>
        </DropdownMenuContent>
      </div>
    </DropdownMenu>
  );
}
