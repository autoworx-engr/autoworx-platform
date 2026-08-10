"use client";

import newTag from "@/actions/tag/newTag";
import useOutsideClick from "@/hooks/useOutsideClick";
import { cn } from "@/lib/cn";
import { INVOICE_COLORS } from "@/lib/consts";
import { useFormErrorStore } from "@/stores/form-error";
import { useListsStore } from "@/stores/lists";
import { normalizeSearch } from "@/utils/normalizeSearch";
import { Tag } from "@prisma/client";
import { ChevronDown, ChevronUp, Palette, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from "../DropdownMenu";
import FormError from "../FormError";
import Submit from "../Submit";
import { SelectProps } from "./select-props";

type SelectedColor = { textColor: string; bgColor: string } | null;

export function SelectTags({
  name = "tagIds",
  value = [],
  setValue,
  dropdownsOpen = {},
  setDropdownsOpen,
  index = [-1, -1],
  type,
  openStates,
}: SelectProps<Tag[]>) {
  const state = useState(value);
  const [tags, setTags] = setValue ? [value, setValue] : state;
  const tagIds = useMemo(() => new Set(tags.map((x) => x.id)), [tags]);
  const tagList = useListsStore((x) => x.tags);
  const searchRef = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [open, setOpen] = openStates || useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState<SelectedColor>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useOutsideClick(() => {
    setOpen(false);
    setSearchQuery("");
  });

  useEffect(() => {
    if (type) {
      if (
        dropdownsOpen[type][0] === index[0] &&
        dropdownsOpen[type][1] === index[1]
      ) {
        setOpen(true);
      } else {
        setOpen(false);
      }
    }
  }, [dropdownsOpen]);

  return (
    <div className="flex flex-col max-w-sm sm:max-w-full">
      <input
        type="hidden"
        name={name}
        value={tags.map((x) => x.id).join(",")}
      />
      <DropdownMenu open={open} onOpenChange={(open) => {}}>
        {tags && tags.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2 max-w-[260px]">
            {tags.map((tag, i) => (
              <div
                key={tag.id}
                className="relative flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold shadow-sm transition-all"
                style={{
                  backgroundColor: tag.bgColor,
                  color: tag.textColor,
                }}
              >
                {tag.name}
                <button
                  type="button"
                  onClick={() => {
                    setTags((tags) => tags.toSpliced(i, 1));
                  }}
                  className="ml-1.5 transition-transform hover:scale-110"
                >
                  <div
                    className={cn(
                      "rounded-full p-0.5",
                      tag.bgColor
                        ? "bg-white/20 hover:bg-white/40"
                        : "border border-slate-200 hover:bg-slate-100",
                    )}
                  >
                    <X size={10} strokeWidth={4} />
                  </div>
                </button>
              </div>
            ))}
          </div>
        )}

        <DropdownMenuTrigger
          onClick={() => {
            setOpen && setOpen(!open);
            if (setDropdownsOpen) {
              if (
                type &&
                dropdownsOpen[type][0] === index[0] &&
                dropdownsOpen[type][1] === index[1]
              ) {
                setDropdownsOpen({
                  SERVICE: [-1, -1],
                  MATERIAL: [-1, -1],
                  LABOR: [-1, -1],
                  TAG: [-1, -1],
                });
              } else {
                setDropdownsOpen({
                  SERVICE: type === "SERVICE" ? [...index] : [-1, -1],
                  MATERIAL: type === "MATERIAL" ? [...index] : [-1, -1],
                  LABOR: type === "LABOR" ? [...index] : [-1, -1],
                  TAG: type === "TAG" ? [...index] : [-1, -1],
                });
              }

              setOpen(true);
              // setTimeout(() => {
              //   searchRef.current?.focus();
              // }, 50);
            }
          }}
          className="flex min-h-11 min-w-[150px] w-full items-center justify-between rounded-[10px] px-4 ring-1 ring-inset ring-slate-200 transition-all hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <p className="text-sm font-medium text-slate-400">Tags</p>
          <ChevronDown size={18} className="text-slate-400" />
        </DropdownMenuTrigger>

        <DropdownMenuPortal>
          <DropdownMenuContent
            side="bottom"
            align="start"
            sideOffset={8}
            className="z-50 w-full min-w-[240px] max-w-xs overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl ring-1 ring-black/5"
          >
            <DropdownMenuGroup>
              {/* Search Header */}
              <div className="relative border-b border-slate-100 bg-slate-50/50 p-2">
                <Search
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 transform text-slate-400"
                />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Search tags..."
                  className="h-9 w-full rounded-lg bg-white pl-9 pr-10 text-sm font-medium ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  onKeyDown={(e) => e.stopPropagation()}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button
                  onClick={() => {
                    setOpen && setOpen(false);
                    setSearchQuery("");
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <ChevronUp size={16} />
                </button>
              </div>

              {/* Tag List */}
              <div className="thin-scrollbar my-1 max-h-[200px] overflow-y-auto px-2">
                {tagList
                  .filter((x) => !tagIds.has(x.id))
                  .filter((x) =>
                    searchQuery
                      ? normalizeSearch(x.name).includes(
                          normalizeSearch(searchQuery),
                        )
                      : true,
                  )
                  .map((tag) => (
                    <DropdownMenuItem
                      className="mb-1 cursor-pointer rounded-lg p-0 focus:bg-transparent"
                      onClick={(e) => {
                        setTags((tags) => {
                          if (tags && tags.length > 0) {
                            return [...tags, tag];
                          }
                          return [tag];
                        });
                        setDropdownsOpen &&
                          setDropdownsOpen({
                            SERVICE: [-1, -1],
                            MATERIAL: [-1, -1],
                            LABOR: [-1, -1],
                            TAG: [-1, -1],
                          });
                        setOpen(false);
                        setSearchQuery("");
                      }}
                      key={tag.id}
                    >
                      <div
                        className="flex w-full items-center px-3 py-1.5 text-sm font-medium transition-opacity hover:opacity-80"
                        style={{
                          backgroundColor: tag.bgColor,
                          color: tag.textColor,
                          borderRadius: "6px",
                        }}
                      >
                        <span>{tag.name}</span>
                      </div>
                    </DropdownMenuItem>
                  ))}
              </div>
            </DropdownMenuGroup>

            <FormError />

            {/* Quick Add Footer */}
            <DropdownMenuGroup className="border-t border-slate-100 bg-slate-50/50 p-3">
              <QuickAddForm
                onSuccess={(tag) => {
                  setTags((tags) => [...tags, tag]);
                  setDropdownsOpen &&
                    setDropdownsOpen({
                      SERVICE: [-1, -1],
                      MATERIAL: [-1, -1],
                      LABOR: [-1, -1],
                      TAG: [-1, -1],
                    });
                  setOpen(false);
                }}
                setPickerOpen={setPickerOpen}
                selectedColor={selectedColor}
              />

              {pickerOpen && (
                <div className="mt-3 grid grid-cols-5 gap-2 rounded-xl bg-white p-2 shadow-inner ring-1 ring-slate-200">
                  {INVOICE_COLORS.map((color, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        setSelectedColor({
                          textColor: color.textColor,
                          bgColor: color.bgColor,
                        });
                      }}
                      style={{
                        backgroundColor: color.bgColor,
                        color: color.textColor,
                      }}
                      className={cn(
                        "flex h-8 items-center justify-center rounded-lg text-xs font-bold transition-all hover:scale-105",
                        selectedColor?.textColor === color.textColor
                          ? "ring-2 ring-primary ring-offset-1"
                          : "ring-1 ring-transparent",
                      )}
                    >
                      Aa
                    </button>
                  ))}
                </div>
              )}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenu>
    </div>
  );
}

function QuickAddForm({
  onSuccess,
  setPickerOpen,
  selectedColor,
}: {
  onSuccess?: (value: Tag) => void;
  setPickerOpen: any;
  selectedColor: SelectedColor;
}) {
  const { showError } = useFormErrorStore();
  const formRef = useRef<HTMLFormElement | null>(null);

  async function handleSubmit(data: FormData) {
    const name = data.get("name") as string;

    const res = await newTag({ name, type: "GENERAL", ...selectedColor });

    if (res.type === "error") {
      showError({
        field: res.field || "name",
        message: res.message || "",
      });
    } else {
      useListsStore.setState(({ tags }) => ({
        tags: [...tags, res.data],
      }));
      formRef.current?.reset();
      onSuccess?.(res.data);
    }
  }

  return (
    <div>
      <form ref={formRef} className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            name="name"
            type="text"
            required
            placeholder="New tag name..."
            className="h-10 w-full rounded-lg bg-white px-2 text-sm font-medium ring-1 ring-inset ring-slate-200 transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-slate-400"
            onKeyDown={(e) => e.stopPropagation()}
          />
        </div>

        <button
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-900"
          onClick={() => setPickerOpen((prev: boolean) => !prev)}
          type="button"
          title="Choose Color"
        >
          <Palette size={18} strokeWidth={2.5} />
        </button>

        <Submit
          className="h-10 shrink-0 rounded-lg bg-primary px-3 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm shadow-primary/30 transition-all hover:bg-[#525ceb] active:scale-95"
          formAction={handleSubmit}
        >
          Quick Add
        </Submit>
      </form>
    </div>
  );
}
