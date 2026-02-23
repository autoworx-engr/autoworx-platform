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
import newTag from "@/actions/tag/newTag";
import { getTags } from "../../actions/tag/getTags";
import { deleteTag } from "../../actions/tag/deleteTag";
import { ChevronDown, ChevronUp, Palette, Search, X } from "lucide-react";

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
  }, [search]);

  useEffect(() => {
    setFilteredTagList(tags);
  }, [tags]);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  async function fetchTags() {
    const res = await getTags("CLIENT");
    if (res.type === "success") {
      setTags(res.data);
    }
  }

  async function handleDelete(id: number) {
    const res = await deleteTag(id);

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
          className={`flex w-full justify-between h-10 items-center gap-x-8 rounded-md border border-slate-300 bg-white px-3 py-2 ${customStyles}`}
          style={{
            backgroundColor: tag?.bgColor,
            color: tag?.textColor,
            border: tag ? `1px solid ${tag.textColor}` : "",
          }}
          onClick={() => {
            setOpen && setOpen(!open);
          }}
        >
          <span className="text-slate-600 text-sm font-medium">{showPlaceholder ? (tag?.name ?? "Select Tag") : ""}</span>
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

          <div className="thin-scrollbar max-h-28 space-y-1 overflow-y-auto">
            {filteredTagList.map((tagItem) => (
              <div
                key={tagItem.id}
                className="mx-4 flex cursor-pointer items-center justify-between rounded-full px-4 py-2"
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
                <button
                  className="text-lg text-slate-600 hover:text-slate-800"
                  onClick={() => handleDelete(tagItem.id)}
                >
                  <X size={20} />
                </button>
              </div>
            ))}
          </div>
          <FormError />
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
            <div className="grid grid-cols-4 gap-2 p-2">
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
                    border:
                      selectedColor?.textColor === color.textColor
                        ? `1px solid ${color.textColor}`
                        : "none",
                  }}
                  className="rounded-md p-2"
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
      placeholder="Search"
      className="w-full rounded-md border border-slate-300 p-2 pl-8 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
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
  const { showError } = useFormErrorStore();
  const formRef = useRef<HTMLFormElement | null>(null);

  async function handleSubmit(data: FormData) {
    const name = data.get("name") as string;

    const res = await newTag({ name, type: "CLIENT", ...selectedColor });

    if (res.type === "error") {
      showError({
        field: res.field || "name",
        message: res.message || "",
      });
    } else {
      setTags((prev: Tag[]) => {
        return [...prev, res.data];
      });
      formRef.current?.reset();
      onSuccess?.(res.data);
    }
  }

  return (
    <form ref={formRef} className="flex w-full gap-2 p-2">
      <input
        name="name"
        type="text"
        required
        className="w-[80%] flex-1 rounded-md border border-slate-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
      />

      <button
        className="rounded bg-[#6470FF] p-2 text-white"
        onClick={() => setPickerOpen((prev: boolean) => !prev)}
        type="button"
      >
        <Palette size={18} />
      </button>

      <Submit
        className="rounded bg-[#6571FF] p-1 text-xs leading-3 text-white"
        formAction={handleSubmit}
      >
        Quick
        <br /> Add
      </Submit>
    </form>
  );
}
