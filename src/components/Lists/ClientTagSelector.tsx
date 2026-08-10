"use client";

import {
  createClientTag,
  deleteClientTag,
  getClientTags,
} from "@/actions/client/clientTag";
import { cn } from "@/lib/cn";
import { INVOICE_COLORS } from "@/lib/consts";
import { useFormErrorStore } from "@/stores/form-error";
import { Tag } from "@prisma/client";
import { Popconfirm } from "antd";
import { ChevronDown, ChevronUp, Palette, Search, X } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../DropdownMenu";
import FormError from "../FormError";
import Submit from "../Submit";

type SelectedColor = { textColor: string; bgColor: string } | null;

export function ClientTagSelector({
  name = "tagId",
  value,
  setValue,
  open,
  setOpen,
  customStyles,
  showPlaceholder = true,
}: {
  name?: string;
  value?: Tag;
  setValue?: React.Dispatch<React.SetStateAction<Tag | undefined>>;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  customStyles?: string;
  showPlaceholder?: boolean;
}) {
  const state = useState(value);
  const [tag, setTag] = setValue ? [value, setValue] : state;
  const [tags, setTags] = useState<Tag[]>([]);
  const [filteredTagList, setFilteredTagList] = useState<Tag[]>([]);
  const [search, setSearch] = useState<string>("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState<SelectedColor>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTags();
  }, []);

  useEffect(() => {
    if (search) {
      setFilteredTagList(
        tags.filter((tag) =>
          tag.name.toLowerCase().includes(search.toLowerCase()),
        ),
      );
    } else {
      setFilteredTagList(tags);
    }
  }, [search, tags]);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  async function fetchTags() {
    const res = await getClientTags();
    if (res.type === "success") {
      setTags(res.data || []);
    }
  }

  async function handleDelete(id: number) {
    const res = await deleteClientTag(id);

    if (res.type === "success") {
      setTags((prev: Tag[]) => {
        return prev.filter((tag) => tag.id !== id);
      });

      if (tag?.id === id) {
        setTag(undefined!);
      }
    }
  }

  const handleClickOutside = (event: MouseEvent) => {
    if (
      dropdownRef.current &&
      !dropdownRef.current.contains(event.target as Node)
    ) {
      setOpen && setOpen(false);
    }
  };

  return (
    <>
      <input type="hidden" name={name} value={tag?.id ?? ""} />
      <DropdownMenu open={open} onOpenChange={(open) => setOpen?.(open)}>
        <DropdownMenuTrigger
          className={cn(
            "flex w-full h-10 items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 shadow-sm transition-all hover:shadow-md",
            customStyles,
          )}
          style={{
            backgroundColor: tag?.bgColor,
            color: tag?.textColor,
            border: tag ? `1px solid ${tag.textColor}` : undefined,
          }}
          onClick={() => setOpen?.(!open)}
        >
          <span className={cn("text-sm font-medium", !tag && "text-slate-500")}>
            {showPlaceholder ? (tag?.name ?? "Select Client Tag") : ""}
          </span>
          <ChevronDown
            size={16}
            className={cn(
              "shrink-0 transition-transform duration-200",
              open ? "rotate-180" : "rotate-0",
              tag ? "" : "text-slate-400",
            )}
          />
        </DropdownMenuTrigger>

        <DropdownMenuContent
          ref={dropdownRef}
          side="bottom"
          align="start"
          sideOffset={8}
          avoidCollisions
          collisionPadding={8}
          className="z-50 w-full min-w-[280px] overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl ring-1 ring-black/5"
        >
          {/* Search Header */}
          <div className="relative border-b border-slate-100 bg-slate-50/50 p-2">
            <Search
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search client tags"
              className="h-9 w-full rounded-lg bg-white pl-9 pr-10 text-sm font-medium ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button
              onClick={() => setOpen?.(false)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <ChevronUp size={16} />
            </button>
          </div>

          {/* Tag List */}
          <div className="thin-scrollbar my-1 max-h-[200px] overflow-y-auto px-2">
            {filteredTagList.map((tagItem) => (
              <div
                key={tagItem.id}
                className="mb-1 flex cursor-pointer items-center justify-between rounded-lg px-3 py-1.5 text-sm font-medium transition-opacity hover:opacity-80"
                style={{
                  backgroundColor: tagItem.bgColor,
                  color: tagItem.textColor,
                }}
              >
                <button
                  className="w-full text-left"
                  onClick={() => {
                    setTag(tagItem);
                    setOpen?.(false);
                  }}
                >
                  {tagItem.name}
                </button>
                <div onClick={(e) => e.stopPropagation()}>
                  <Popconfirm
                    title="Delete Tag"
                    description="Are you sure you want to remove this tag?"
                    okText="Delete"
                    cancelText="Cancel"
                    onConfirm={() => handleDelete(tagItem.id)}
                    onPopupClick={(e) => e.stopPropagation()}
                    overlayClassName="[&_.ant-popover-inner]:rounded-2xl [&_.ant-popover-inner]:p-4 [&_.ant-popover-message-title]:font-semibold [&_.ant-popover-message-title]:text-slate-800"
                    okButtonProps={{
                      className:
                        "!rounded-lg !border-none !bg-[#6571ff] !font-semibold !shadow-sm !shadow-[#6571ff]/30 hover:!bg-[#525ceb]",
                    }}
                    cancelButtonProps={{
                      className:
                        "!rounded-lg !border-slate-200 !font-medium !text-slate-600 hover:!border-slate-300 hover:!bg-slate-50 hover:!text-slate-700",
                    }}
                  >
                    <button
                      type="button"
                      onClick={(e) => e.stopPropagation()}
                      className="ml-1.5 transition-transform hover:scale-110"
                    >
                      <div
                        className={cn(
                          "rounded-full p-0.5",
                          tagItem.bgColor
                            ? "bg-white/20 hover:bg-white/40"
                            : "border border-slate-200 hover:bg-slate-100",
                        )}
                      >
                        <X size={16} strokeWidth={2.5} />
                      </div>
                    </button>
                  </Popconfirm>
                </div>
              </div>
            ))}
          </div>

          <FormError />

          {/* Quick Add Footer */}
          <div className="border-t border-slate-100 bg-slate-50/50 p-3">
            <QuickAddClientTagForm
              onSuccess={(newTag) => {
                setTags((prev) => [...prev, newTag]);
                setTag(newTag);
                setOpen && setOpen(false);
              }}
              setColorPickerVisible={setPickerOpen}
              selectedColor={selectedColor}
            />

            {/* Color Picker */}
            {pickerOpen && (
              <div className="mt-3 grid grid-cols-5 gap-2 rounded-xl bg-white p-2 shadow-inner ring-1 ring-slate-200">
                {INVOICE_COLORS.map((color, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() =>
                      setSelectedColor({
                        textColor: color.textColor,
                        bgColor: color.bgColor,
                      })
                    }
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
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

function QuickAddClientTagForm({
  onSuccess,
  setColorPickerVisible,
  selectedColor,
}: {
  onSuccess?: (tag: Tag) => void;
  setColorPickerVisible: React.Dispatch<React.SetStateAction<boolean>>;
  selectedColor: SelectedColor;
}) {
  const { showError } = useFormErrorStore();
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (data: FormData) => {
    const name = data.get("name") as string;
    const res = await createClientTag({ name, ...selectedColor });
    if (res.type === "error") {
      showError({
        field: "name",
        message: res.message || "Failed to create client tag",
      });
    } else {
      formRef.current?.reset();
      if (res.data) onSuccess?.(res.data);
    }
  };

  return (
    <form ref={formRef} className="flex items-center gap-2">
      <div className="relative flex-1">
        <input
          name="name"
          type="text"
          required
          placeholder="New Tag Name..."
          className="h-10 w-full rounded-lg bg-white px-2 text-sm font-medium ring-1 ring-inset ring-slate-200 transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-slate-400"
          onKeyDown={(e) => e.stopPropagation()}
        />
      </div>

      <button
        type="button"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-900"
        onClick={() => setColorPickerVisible((prev) => !prev)}
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
  );
}
