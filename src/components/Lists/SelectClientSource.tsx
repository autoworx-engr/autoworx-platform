import type { JSX } from "react";
import { cn } from "@/lib/cn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@radix-ui/react-dropdown-menu";
import { ChevronDown, ChevronUp, Search } from "lucide-react";
import React, { ChangeEvent, useEffect, useState } from "react";

interface SelectorProps<T> {
  label: (item: T | null) => string;
  items: T[];
  border?: boolean;
  newButton: React.ReactNode;
  displayList: (item: T) => JSX.Element;
  onSearch?: (search: string) => T[];
  onSelect?: (item: T) => void;
  openState?: [boolean, React.Dispatch<React.SetStateAction<boolean>>];
  selectedItem?: T | null | undefined;
  setSelectedItem?: React.Dispatch<React.SetStateAction<T | null>>;
  clickabled?: boolean;
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
 * @returns {JSX.Element} The rendered Selector component.
 */
export default function SelectClientSource<T>({
  label,
  items,
  border,
  newButton,
  displayList,
  onSearch,
  onSelect,
  openState,
  selectedItem,
  setSelectedItem,
  clickabled = true,
}: SelectorProps<T>): JSX.Element {
  // Using provided open state or setting local state
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [isOpen, setIsOpen] = openState || useState(false);
  // Local state to manage the list of items to display
  const [filteredItems, setFilteredItems] = useState<T[]>(items);
  // Local state to manage the selected item
  const [selected, setSelected] = useState<T | null | undefined>(selectedItem);

  // Update item list when items prop changes
  useEffect(() => {
    setFilteredItems(items);
  }, [items]);

  // Update selected item when selectedItem prop changes
  useEffect(() => {
    setSelected(selectedItem);
  }, [selectedItem]);

  /**
   * Handle search input change
   *
   * @param {ChangeEvent<HTMLInputElement>} e - The change event of the input field.
   */
  function handleSearchChange(e: ChangeEvent<HTMLInputElement>) {
    if (onSearch) {
      const searchQuery = e.target.value;
      const searchResults = onSearch(searchQuery);
      setFilteredItems(searchResults);
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
    setIsOpen(false);
  }

  /**
   * Handle dropdown close
   */
  function handleCloseDropdown() {
    setIsOpen(false);
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <div className="w-full">
        <DropdownMenuTrigger
          onClick={() => setIsOpen(true)}
          className={cn(
            "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 shadow-sm outline-none transition-colors focus-visible:ring-1 focus-visible:ring-ring",
            isOpen && "invisible",
          )}
        >
          {/* Display selected item or label */}
          <p
            className={cn(
              "text-sm font-medium",
              selected ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {selected ? label(selected) : label(null)}
          </p>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="start"
          sideOffset={-36}
          className="z-50 w-full rounded-md border border-input bg-background shadow-md"
          style={{
            minWidth: "var(--radix-popper-anchor-width)",
            maxWidth: "var(--radix-popper-anchor-width)",
          }}
        >
          {/* Search input */}
          <div className="relative m-2">
            <Search
              size={16}
              className="absolute left-2 top-1/2 -translate-y-1/2 transform text-slate-500"
            />
            <input
              type="text"
              placeholder="Search"
              className="w-full rounded-md border border-slate-300 p-2 pl-8 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
              onChange={handleSearchChange}
            />
            <button onClick={handleCloseDropdown}>
              <ChevronUp className="absolute right-2 top-1/2 -translate-y-1/2 transform text-slate-500" />
            </button>
          </div>

          {/* Display list of items */}
          <div className="mb-5 max-h-40 overflow-y-auto">
            {filteredItems.map((item, index) => {
              if (clickabled) {
                return (
                  <button
                    onClick={() => handleSelectItem(item)}
                    type="button"
                    key={index}
                    className={cn(
                      "w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-100",
                      border &&
                        "relative left-1/2 my-1 w-[95%] -translate-x-1/2 rounded-md border border-slate-300",
                    )}
                  >
                    {displayList(item)}
                  </button>
                );
              } else {
                return (
                  <div
                    key={index}
                    className={cn(
                      "w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-100",
                      border &&
                        "relative left-1/2 my-1 w-[95%] -translate-x-1/2 rounded-md border border-slate-300",
                    )}
                  >
                    {displayList(item)}
                  </div>
                );
              }
            })}
          </div>

          {/* New button */}
          <div className="border-t border-slate-300 bg-slate-50 p-2">
            {newButton}
          </div>
        </DropdownMenuContent>
      </div>
    </DropdownMenu>
  );
}
