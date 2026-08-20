import { cn } from "@/lib/cn";
import { Item } from "@/stores/estimate-create";
import { useEstimatePopupStore } from "@/stores/estimate-popup";
import { DropdownMenuContent } from "@radix-ui/react-dropdown-menu";
import {
  ChevronDown,
  ChevronUp,
  PencilLineIcon,
  Plus,
  Search,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useMediaQuery } from "react-responsive";
import { DropdownMenu, DropdownMenuTrigger } from "./DropdownMenu";

export default function ItemSelector<T>({
  label,
  item,
  list,
  onEdit,
  onDelete,
  onSelect,
  display,
  type,
  alwaysShowDeleteButton,
  materialIndex,
  onSearch,
  dropdownsOpen,
  setDropdownsOpen,
  index,
}: {
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
}) {
  const [open, setOpen] = useState(false);
  const [itemIist, setItemIist] = useState<T[]>(list);
  const [selected, setSelected] = useState<T | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const { open: openPopup } = useEstimatePopupStore();
  const isMax640 = useMediaQuery({ query: "(max-width: 640px)" });
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    if (
      dropdownsOpen[type][0] === index[0] &&
      dropdownsOpen[type][1] === index[1] &&
      !isMax640 &&
      !selected
    ) {
      setOpen(true);
    } else {
      setOpen(false);
    }

    if (onSearch) {
      const results = onSearch("");
      setSearchText("");
      setItemIist(results);
    }
  }, [dropdownsOpen, selected]);

  useEffect(() => {
    setItemIist(list);
  }, [list]);

  useEffect(() => {
    if (type === "LABOR" && item.labor) {
      // @ts-ignore
      setSelected(item.labor);
    }
  }, [item.labor]);

  useEffect(() => {
    if (type === "SERVICE" && item.service) {
      // @ts-ignore
      setSelected(item.service);
    }
  }, [item.service]);

  useEffect(() => {
    if (type === "MATERIAL" && item.materials[materialIndex!]) {
      // @ts-ignore
      setSelected(item.materials[materialIndex!]);
    }
  }, [item.materials]);

  return (
    <div
      onClick={(e) => {
        if (searchRef?.current?.contains(e.target as Node)) {
          return;
        }

        if (
          dropdownsOpen[type][0] === index[0] &&
          dropdownsOpen[type][1] === index[1]
        ) {
          setDropdownsOpen({
            SERVICE: [-1, -1],
            MATERIAL: [-1, -1],
            LABOR: [-1, -1],
            TAG: [-1, -1],
            [type]: [index[0], index[1]],
          });
        } else {
          setDropdownsOpen({
            SERVICE: type === "SERVICE" ? [...index] : [-1, -1],
            MATERIAL: type === "MATERIAL" ? [...index] : [-1, -1],
            LABOR: type === "LABOR" ? [...index] : [-1, -1],
            TAG: [-1, -1],
          });

          // setDropdownsOpen({
          //   SERVICE: type === "SERVICE" ? [...index] : -1,
          //   MATERIAL: type === "MATERIAL" ? [...index] : -1,
          //   LABOR: type === "LABOR" ? [...index] : -1,
          //   TAG: -1,
          // });
        }
        // Force dropdown to open and focus the search
        // setOpen(true);
        // setTimeout(() => {
        //   searchRef.current?.focus();
        // }, 50);
      }}
    >
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <div className="relative basis-full md:basis-96">
          {/* Delete button - Floating Action */}
          {alwaysShowDeleteButton && !selected && (
            <button
              className="absolute -right-2 -top-2 z-10 transition-transform hover:scale-110"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelected(null);
                onDelete && onDelete();
              }}
            >
              <div className="rounded-full bg-primary p-1.5 text-white shadow-md shadow-primary/40">
                <X size={10} strokeWidth={3} />
              </div>
            </button>
          )}

          {!selected ? (
            <DropdownMenuTrigger
              onClick={() => setOpen(true)}
              className={cn(
                "flex h-11 w-full items-center justify-between rounded-lg shadow-sm shadow-black/20 bg-gray-100/40 px-4 ring-1 ring-inset ring-slate-200 transition-all hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/30",
                open && "invisible",
              )}
            >
              <p className="text-sm font-medium text-slate-400">{label}</p>
              <ChevronDown size={18} className="text-slate-400" />
            </DropdownMenuTrigger>
          ) : (
            <div
              className={cn(
                "relative flex min-h-11 w-full items-center justify-between gap-2 rounded-lg bg-gray-100/40 px-4 shadow-sm shadow-black/20 ring-1 ring-inset ring-slate-200",
              )}
            >
              <p className="truncate text-sm font-semibold text-slate-700">
                {/* @ts-ignore */}
                {selected[display]}
              </p>

              <div className="flex shrink-0 items-center gap-1">
                {/* Edit button */}
                <button
                  className="transition-transform hover:scale-110"
                  type="button"
                  onClick={() => {
                    onEdit && onEdit();
                  }}
                >
                  <div className="rounded-lg bg-primary p-1.5 text-white shadow-sm shadow-primary/30">
                    <PencilLineIcon size={12} strokeWidth={2.5} />
                  </div>
                </button>

                {/* Delete button */}
                <button
                  className="transition-transform hover:scale-110"
                  type="button"
                  onClick={() => {
                    if (searchRef?.current?.value) searchRef.current.value = "";
                    if (onSearch) {
                      const results = onSearch("");
                      setSearchText("");
                      setItemIist(results);
                    }
                    onDelete && onDelete();
                    setSelected(null);
                  }}
                >
                  <div className="rounded-lg bg-slate-200 p-1.5 text-slate-600 transition-colors hover:bg-rose-100 hover:text-rose-600">
                    <X size={12} strokeWidth={2.5} />
                  </div>
                </button>
              </div>
            </div>
          )}

          <DropdownMenuContent
            align="start"
            sideOffset={-44}
            className="z-50 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl ring-1 ring-black/5"
            style={{ minWidth: "var(--radix-popper-anchor-width)" }}
          >
            {/* Search Header */}
            <div className="relative border-b border-slate-100 bg-slate-50/50 p-2">
              <Search
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 transform text-slate-400"
              />
              <input
                ref={searchRef}
                type="text"
                placeholder={`Search ${label}...`}
                className="h-9 w-full rounded-lg bg-white pl-9 pr-10 text-sm font-medium ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/30"
                onChange={(e) => {
                  if (onSearch) {
                    const search = e.target.value;
                    setSearchText(search);
                    const results = onSearch(search);
                    setItemIist(results);
                  }
                }}
              />
              <button
                onClick={() => setOpen(false)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <ChevronUp size={16} />
              </button>
            </div>

            {/* List Area */}
            <div className="thin-scrollbar my-2 max-h-[200px] space-y-0.5 overflow-y-auto px-2">
              {itemIist.length > 0 ? (
                itemIist.map((item, i) => (
                  <button
                    key={i}
                    type="button"
                    className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 transition-colors hover:bg-primary/10 hover:text-primary"
                    onClick={() => {
                      setSelected(item);
                      onSelect && onSelect(item);
                      setOpen(false);
                      setDropdownsOpen(() => ({
                        ...dropdownsOpen,
                        [type]: [-1, -1],
                      }));
                    }}
                  >
                    {/* @ts-ignore */}
                    {item[display]}
                  </button>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-6 px-4">
                  <Search size={18} className="text-slate-300 mb-1.5" />
                  <p className="text-center text-sm text-slate-400">
                    No results found
                  </p>
                </div>
              )}
            </div>

            {/* Footer "New" Button */}
            <div className="bg-slate-50 p-2">
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 py-2 text-xs font-bold uppercase tracking-wider text-slate-500 transition-all hover:border-primary hover:bg-white hover:text-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  openPopup(type, { itemId: item.id, materialIndex });
                  setOpen(false);
                  setDropdownsOpen({
                    SERVICE: [-1, -1],
                    MATERIAL: [-1, -1],
                    LABOR: [-1, -1],
                    TAG: [-1, -1],
                  });
                }}
              >
                <Plus size={14} /> New {label}
              </button>
            </div>
          </DropdownMenuContent>
        </div>
      </DropdownMenu>
    </div>
  );
}
