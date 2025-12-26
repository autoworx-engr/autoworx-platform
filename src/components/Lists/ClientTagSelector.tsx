"use client";

import { INVOICE_COLORS } from "@/lib/consts";
import { useFormErrorStore } from "@/stores/form-error";
import { Tag } from "@prisma/client";
import React, { useEffect, useRef, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../DropdownMenu";
import FormError from "../FormError";
import Submit from "../Submit";
import {
  getClientTags,
  createClientTag,
  deleteClientTag,
} from "@/actions/client/clientTag";
import { ChevronDown, ChevronUp, Palette, Search, X } from "lucide-react";

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
  const [filteredTagList, setFilteredTagList] = useState<Tag[]>(tags);
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
          tag.name.toLowerCase().includes(search.toLowerCase())
        )
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

      if (setOpen) setOpen(false);
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
      <DropdownMenu
        open={open}
        onOpenChange={(open) => {
          setOpen && setOpen(open);
        }}
      >
        <DropdownMenuTrigger
          className={`flex h-10 items-center gap-x-8 rounded-md border border-slate-300 bg-white px-3 py-2 ${customStyles}`}
          style={{
            backgroundColor: tag?.bgColor,
            color: tag?.textColor,
            border: tag ? `1px solid ${tag.textColor}` : "",
          }}
          onClick={() => {
            setOpen && setOpen(!open);
          }}
        >
          <span>
            {showPlaceholder ? (tag?.name ?? "Select Client Tag") : ""}
          </span>
          <ChevronDown className="text-slate-500" />
        </DropdownMenuTrigger>

        <DropdownMenuContent
          side="bottom"
          align="start"
          sideOffset={8}
          className="space-y-1 rounded-md border border-slate-300 bg-background p-0 shadow-md"
          ref={dropdownRef}
        >
          {/* Search */}
          <div className="relative m-2">
            <Search
              size={18}
              className="absolute left-2 top-1/2 -translate-y-1/2 transform text-slate-500"
            />
            <Input search={search} setSearch={setSearch} key="search" />
            <button
              onClick={() => {
                setOpen && setOpen(!open);
              }}
            >
              <ChevronUp className="absolute right-2 top-1/2 -translate-y-1/2 transform text-slate-500" />
            </button>
          </div>

          {/* Tag List */}
          <div className="thin-scrollbar max-h-28 space-y-1 overflow-y-auto">
            {filteredTagList.map((tagItem) => (
              <div
                key={tagItem.id}
                className="mx-4 flex cursor-pointer items-center justify-between rounded-full px-4 py-2"
                style={{
                  backgroundColor: tagItem.bgColor,
                  color: tagItem.textColor,
                }}
              >
                <button
                  className="w-full text-left"
                  onClick={() => {
                    setTag(tagItem);
                    setOpen && setOpen(false);
                  }}
                >
                  {tagItem.name}
                </button>
                <button
                  onClick={() => handleDelete(tagItem.id)}
                  className="text-lg text-slate-600 hover:text-slate-800"
                >
                  <X size={20} />
                </button>
              </div>
            ))}
          </div>

          {/* Quick Add */}
          <FormError />
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
            <div className="grid grid-cols-4 gap-2 p-2">
              {INVOICE_COLORS.map((color, idx) => (
                <button
                  key={idx}
                  onClick={() =>
                    setSelectedColor({
                      textColor: color.textColor,
                      bgColor: color.bgColor,
                    })
                  }
                  className="rounded-md p-2"
                  style={{
                    backgroundColor: color.bgColor,
                    color: color.textColor,
                    border:
                      selectedColor?.textColor === color.textColor
                        ? `1px solid ${color.textColor}`
                        : "none",
                  }}
                >
                  Aa
                </button>
              ))}
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

function Input({
  search,
  setSearch,
}: {
  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
}) {
  return (
    <input
      type="text"
      placeholder="Search client tags"
      className="w-full rounded-md border border-slate-300 p-2 pl-8 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
      value={search}
      onChange={(e) => setSearch(e.target.value)}
    />
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
      if (res.data) {
        onSuccess?.(res.data);
      }
    }
  };

  return (
    <form ref={formRef} className="flex w-[200px] gap-2 p-2">
      <input
        name="name"
        type="text"
        required
        placeholder="Client tag name"
        className="w-[80%] flex-1 rounded-md border border-slate-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
      />
      <button
        type="button"
        className="rounded bg-[#6470FF] p-2 text-white"
        onClick={() => setColorPickerVisible((prev) => !prev)}
      >
        <Palette size={18} />
      </button>
      <Submit
        className="rounded bg-slate-500 p-1 text-xs leading-3 text-white"
        formAction={handleSubmit}
      >
        Quick
        <br />
        Add
      </Submit>
    </form>
  );
}
