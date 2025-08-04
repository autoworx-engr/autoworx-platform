"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { FaChevronDown, FaChevronUp, FaSearch } from "react-icons/fa";
import { IoMdClose } from "react-icons/io";
import { PiPaletteBold } from "react-icons/pi";
import { Tag } from "@prisma/client";

import { INVOICE_COLORS } from "@/lib/consts";
import { useFormErrorStore } from "@/stores/form-error";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/DropdownMenu";
import FormError from "@/components/FormError";
import Submit from "@/components/Submit";
import { getSalesTags, createSalesTag, deleteSalesTag } from "@/actions/pipelines/leadTag";

type SelectedColor = { textColor: string; bgColor: string } | null;

export function SalesTagSelector({
  setValue,
  open,
  setOpen,
  disable = false,
}: {
  setValue?: (tag?: Tag) => void;
  open?: boolean;
  setOpen?: (open: boolean) => void;
  disable?: boolean;
}) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [search, setSearch] = useState("");
  const [colorPickerVisible, setColorPickerVisible] = useState(false);
  const [selectedColor, setSelectedColor] = useState<SelectedColor>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch sales tags on mount
  useEffect(() => {
    const fetchTags = async () => {
      const res = await getSalesTags();
      if (res.type === "success" && res.data) setTags(res.data);
    };
    fetchTags();
  }, []);

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
    const res = await deleteSalesTag(id);
    if (res.type === "success") {
      setTags((prev) => prev.filter((t) => t.id !== id));
    }
  };

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger onClick={() => setOpen?.(!open)}>
          <FaChevronDown />
        </DropdownMenuTrigger>

        <DropdownMenuContent
          ref={dropdownRef}
          side="bottom"
          align="start"
          sideOffset={-10}
          className="w-[70%] space-y-1 p-0"
        >
          {/* Search Box */}
          <div className="relative m-2">
            <FaSearch className="absolute left-2 top-1/2 -translate-y-1/2 text-[#797979]" />
            <input
              type="text"
              placeholder="Search sales tags"
              className="w-full rounded-md border-2 border-slate-400 p-1 pl-6 pr-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button onClick={() => setOpen?.(false)}>
              <FaChevronUp className="absolute right-2 top-1/2 -translate-y-1/2 text-[#797979]" />
            </button>
          </div>

          {/* Tag List */}
          <div className="thin-scrollbar max-h-28 space-y-1 overflow-y-auto">
            {filteredTags.map((tagItem) => (
              <div
                key={tagItem.id}
                className="mx-4 flex cursor-pointer items-center justify-between rounded-full px-4"
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
                  className="text-lg text-[#66738C] disabled:cursor-not-allowed disabled:text-[#66738C]"
                >
                  <IoMdClose />
                </button>
              </div>
            ))}
          </div>

          {/* Quick Add */}
          <FormError />
          <QuickAddSalesTagForm
            onSuccess={(newTag) => {
              setTags((prev) => [...prev, newTag]);
              setValue?.(newTag);
              setOpen?.(false);
            }}
            setColorPickerVisible={setColorPickerVisible}
            selectedColor={selectedColor}
          />

          {/* Color Picker */}
          {colorPickerVisible && (
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

function QuickAddSalesTagForm({
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

    const res = await createSalesTag({ name, ...selectedColor });
    if (res.type === "error") {
      showError({ field: "name", message: res.message || "Failed to create sales tag" });
    } else if (res.data) {
      formRef.current?.reset();
      onSuccess?.(res.data);
    }
  };

  return (
    <form ref={formRef} className="flex w-[200px] gap-2 p-2">
      <input
        name="name"
        type="text"
        required
        placeholder="Sales tag name"
        className="w-[80%] flex-1 rounded-sm border border-solid border-black p-1"
      />
      <button
        type="button"
        className="rounded bg-[#6470FF] p-2 text-white"
        onClick={() => setColorPickerVisible((prev) => !prev)}
      >
        <PiPaletteBold />
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
