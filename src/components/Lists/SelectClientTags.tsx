"use client";

import newTag from "@/actions/tag/newTag";
import { cn } from "@/lib/cn";
import { INVOICE_COLORS } from "@/lib/consts";
import { Tag } from "@prisma/client";
import { Popconfirm } from "antd";
import { ChevronDown, ChevronUp, Palette, Search, X } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { deleteTag } from "../../actions/tag/deleteTag";
import { getTags } from "../../actions/tag/getTags";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../DropdownMenu";
import Submit from "../Submit";

type SelectedColor = { textColor: string; bgColor: string } | null;

export function SelectClientTags({
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
  const [error, setError] = useState<string | null>(null);
  const [filteredTagList, setFilteredTagList] = useState<Tag[]>(tags);
  const [search, setSearch] = useState<string>("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState<SelectedColor>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = useCallback(
    (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen && setOpen(false);
      }
    },
    [setOpen],
  );

  const fetchTags = useCallback(async () => {
    try {
      const res = await getTags("CLIENT");
      if (res.type === "success") {
        setTags(res.data);
      } else {
        setError("Failed to load tags.");
      }
    } catch {
      setError("Failed to load tags.");
    }
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

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
  }, [handleClickOutside]);

  async function handleDelete(id: number) {
    try {
      const res = await deleteTag(id);

      if (res.type === "success") {
        setTags((prev: Tag[]) => prev.filter((tag) => tag.id !== id));
        if (tag?.id === id) setTag(undefined!);
      } else {
        setError("Failed to delete tag.");
      }
    } catch {
      setError("Failed to delete tag.");
    }
  }

  return (
    <>
      <input type="hidden" name={name} value={tag?.id ?? ""} />
      <DropdownMenu
        open={open}
        onOpenChange={(open) => {
          setOpen && setOpen(open);
        }}
      >
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
          onClick={() => {
            setOpen && setOpen(!open);
          }}
        >
          <span className={cn("text-sm font-medium", !tag && "text-slate-500")}>
            {showPlaceholder ? (tag?.name ?? "Select Tag") : ""}
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
          side="bottom"
          align="start"
          sideOffset={8}
          avoidCollisions
          collisionPadding={8}
          className="z-50 w-full min-w-[280px] overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl ring-1 ring-black/5"
          ref={dropdownRef}
        >
          {/* Search Header */}
          <div className="relative border-b border-slate-100 bg-slate-50/50 p-2">
            <Search
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <Input search={search} setSearch={setSearch} key="search" />
            <button
              onClick={() => {
                setOpen && setOpen(!open);
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <ChevronUp size={16} />
            </button>
          </div>

          <div className="thin-scrollbar my-1 max-h-[200px] overflow-y-auto px-2">
            {filteredTagList.map((tagItem) => (
              <div
                key={tagItem.id}
                className="mb-1 flex cursor-pointer items-center justify-between rounded-lg px-3 py-1.5 text-sm font-medium transition-opacity hover:opacity-80"
                style={{
                  backgroundColor: tagItem?.bgColor,
                  color: tagItem?.textColor,
                  border:
                    tagItem?.id === tag?.id ? `1px solid ${tag.textColor}` : "",
                }}
              >
                <button
                  onClick={() => {
                    setTag(tagItem);
                    setOpen && setOpen(false);
                  }}
                  className="w-full text-left"
                >
                  {tagItem.name}
                </button>
                <Popconfirm
                  title="Delete Tag"
                  description="Are you sure you want to delete this tag?"
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
                    <div className="rounded-full border text-slate-500 border-slate-100 p-0.5 hover:bg-red-100 hover:text-red-600">
                      <X size={16} strokeWidth={2.5} />
                    </div>
                  </button>
                </Popconfirm>
              </div>
            ))}
          </div>

          {error && (
            <div className="mx-2 mb-1 flex items-center justify-between rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 ring-1 ring-red-200">
              <span>{error}</span>
            </div>
          )}

          {/* Quick Add Footer */}
          <div className="border-t border-slate-100 bg-slate-50/50 p-3">
            <QuickAddForm
              onSuccess={(tag) => {
                setTag(tag);
                if (setOpen) setOpen(false);
              }}
              setTags={setTags}
              setPickerOpen={setPickerOpen}
              selectedColor={selectedColor}
            />
            {pickerOpen && (
              <div className="mt-3 grid grid-cols-5 gap-2 rounded-xl bg-white p-2 shadow-inner ring-1 ring-slate-200">
                {INVOICE_COLORS.map((color, index) => (
                  <button
                    key={index}
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
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

const Input = ({
  search,
  setSearch,
}: {
  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
}) => {
  return (
    <input
      type="text"
      placeholder="Search Tags"
      className="h-9 w-full rounded-lg bg-white pl-9 pr-10 text-sm font-medium ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/30"
      value={search}
      onChange={(e) => {
        setSearch(e.target.value);
      }}
    />
  );
};

function QuickAddForm({
  onSuccess,
  setPickerOpen,
  selectedColor,
  setTags,
}: {
  onSuccess?: (value: Tag) => void;
  setPickerOpen: any;
  selectedColor: SelectedColor;
  setTags: React.Dispatch<React.SetStateAction<Tag[]>>;
}) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(data: FormData) {
    const name = data.get("name") as string;

    if (!name?.trim()) {
      setError("Tag name is required.");
      return;
    }

    const res = await newTag({ name, type: "CLIENT", ...selectedColor });

    if (res.type === "error") {
      setError(res.message || "Failed to create tag.");
    } else {
      setError(null);
      setTags((prev: Tag[]) => [...prev, res.data]);
      formRef.current?.reset();
      onSuccess?.(res.data);
    }
  }

  return (
    <form ref={formRef} className="flex flex-col gap-2">
      <div className="relative flex-1">
        <input
          name="name"
          type="text"
          required
          placeholder="New tag name..."
          onChange={() => error && setError(null)}
          className={cn(
            "h-10 w-full rounded-lg bg-white px-2 text-sm font-medium ring-1 ring-inset transition-all focus:outline-none focus:ring-2 placeholder:text-slate-400",
            error
              ? "ring-red-300 focus:ring-red-400/30"
              : "ring-slate-200 focus:ring-primary/30",
          )}
        />
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>

      <div className="flex w-full items-center justify-end gap-2">
        <button
          type="button"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-900"
          onClick={() => setPickerOpen((prev: boolean) => !prev)}
          title="Choose Color"
        >
          <Palette size={18} strokeWidth={2.5} />
        </button>

        <Submit
          className="h-10 flex-1 shrink-0 rounded-lg bg-primary px-3 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm shadow-primary/30 transition-all hover:bg-[#525ceb] active:scale-95"
          formAction={handleSubmit}
        >
          Quick Add
        </Submit>
      </div>
    </form>
  );
}
