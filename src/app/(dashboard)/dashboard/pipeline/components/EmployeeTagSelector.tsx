"use client";

import { deleteTag } from "@/actions/tag/deleteTag";
import { getTags } from "@/actions/tag/getTags";
import newTag from "@/actions/tag/newTag";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/DropdownMenu";
import FormError from "@/components/FormError";
import Submit from "@/components/Submit";
import { cn } from "@/lib/cn";
import { INVOICE_COLORS } from "@/lib/consts";
import getUser from "@/lib/getUser";
import { useFormErrorStore } from "@/stores/form-error";
import { Tag, User } from "@prisma/client";
import { ChevronUp, Palette, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type SelectedColor = { textColor: string; bgColor: string } | null;

export function EmployeeTagSelector({
  setValue,
  open,
  setOpen,
  disable = false,
  tagType = "GENERAL",
  employeeTags,
}: {
  setValue?: (tag?: Tag) => void;
  open?: boolean;
  setOpen?: (open: boolean) => void;
  disable?: boolean;
  tagType?: "GENERAL" | "SALES" | "CLIENT" | "INVENTORY";
  employeeTags: Tag[];
}) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [search, setSearch] = useState("");
  const [colorPickerVisible, setColorPickerVisible] = useState(false);
  const [selectedColor, setSelectedColor] = useState<SelectedColor>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    async function fetchUser() {
      const data = await getUser();
      setUser(data);
    }

    fetchUser();
  }, []);

  // Fetch tags on mount
  useEffect(() => {
    const fetchTags = async () => {
      const res = await getTags(tagType);
      if (res.type === "success") setTags(res.data);
    };
    fetchTags();
  }, [tagType]);

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen?.(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setOpen]);

  const filteredTags = useMemo(() => {
    return search
      ? tags.filter((tag) =>
          tag.name.toLowerCase().includes(search.toLowerCase()),
        )
      : tags;
  }, [search, tags]);

  const handleDeleteTag = async (id: number) => {
    const res = await deleteTag(id);
    if (res.type === "success") {
      setTags((prev) => prev.filter((t) => t.id !== id));
      // setOpen?.(false);
    }
  };

  const isRestrictedUser =
    user?.employeeType === "Sales" || user?.employeeType === "Technician";
  disable = isRestrictedUser;
  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger onClick={() => setOpen?.(!open)}>
          {/* <ChevronDown /> */}
        </DropdownMenuTrigger>

        <DropdownMenuContent
          ref={dropdownRef}
          side="bottom"
          align="start"
          sideOffset={8}
          className="z-50 w-full max-w-[300px] overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl ring-1 ring-black/5"
        >
          {/* Search Header */}
          <div className="relative border-b border-slate-100 bg-slate-50/50 p-2">
            <Search
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 transform text-slate-400"
            />
            <input
              type="text"
              placeholder="Search Tags..."
              className="h-9 w-full rounded-lg bg-white pl-9 pr-10 text-sm font-medium ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={search}
              onKeyDown={(e) => e.stopPropagation()}
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
            {filteredTags
              .filter(
                (el) => !employeeTags.map((tag) => tag.name).includes(el.name),
              )
              .map((tagItem) => (
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
                      setValue?.(tagItem);
                      setOpen?.(false);
                    }}
                  >
                    {tagItem.name}
                  </button>
                  <button
                    disabled={disable}
                    onClick={() => handleDeleteTag(tagItem.id)}
                    className={cn(
                      "ml-1.5 transition-transform hover:scale-110",
                      isRestrictedUser ? "hidden" : "",
                    )}
                  >
                    <div className="rounded-full bg-white/20 p-0.5 hover:bg-white/40">
                      <X size={16} strokeWidth={2.5} />
                    </div>
                  </button>
                </div>
              ))}
          </div>

          <FormError />

          {/* Quick Add Footer */}
          <div className="border-t border-slate-100 bg-slate-50/50 p-3">
            <QuickAddForm
              onSuccess={(newTag) => {
                setTags((prev) => [...prev, newTag]);
                setValue?.(newTag);
                setOpen?.(false);
              }}
              setColorPickerVisible={setColorPickerVisible}
              selectedColor={selectedColor}
              tagType={tagType}
            />

            {/* Color Picker */}
            {colorPickerVisible && (
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

function QuickAddForm({
  onSuccess,
  setColorPickerVisible,
  selectedColor,
  tagType = "GENERAL",
}: {
  onSuccess?: (tag: Tag) => void;
  setColorPickerVisible: React.Dispatch<React.SetStateAction<boolean>>;
  selectedColor: SelectedColor;
  tagType?: "GENERAL" | "SALES" | "CLIENT" | "INVENTORY";
}) {
  const { showError } = useFormErrorStore();
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (data: FormData) => {
    const name = data.get("name") as string;

    const res = await newTag({ name, type: tagType, ...selectedColor });
    if (res.type === "error") {
      showError({ field: res.field || "name", message: res.message || "" });
    } else {
      formRef.current?.reset();
      onSuccess?.(res.data);
    }
  };
  return (
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
