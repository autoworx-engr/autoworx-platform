import newCategory from "@/actions/category/newCategory";
import Selector from "@/components/Selector";
import { CATEGORY_NAME_MAX_LENGTH } from "@/lib/categoryConstants";
import { cn } from "@/lib/cn";
import { useListsStore } from "@/stores/lists";
import { Category } from "@prisma/client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import ClearSelectionButton from "./ClearSelectionButton";

export default function SelectCategory({
  categoryData = null,
  onCategoryChange,
  labelPosition = "top",
  categoryOpen,
  setCategoryOpen,
  required = false,
  className,
  isClear = false,
}: {
  categoryData?: Category | null;
  onCategoryChange: (category: Category | null) => void;
  labelPosition?: "top" | "left" | "none";
  categoryOpen?: boolean;
  setCategoryOpen?: any;
  required?: boolean;
  className?: string;
  /** Show a "Clear Category" action so the selection can be removed. */
  isClear?: boolean;
}) {
  const { categories } = useListsStore();
  const [category, setCategory] = useState<Category | null>(categoryData);
  const [categoryInput, setCategoryInput] = useState("");

  useEffect(() => {
    if (categoryData) {
      setCategory(categoryData as Category);
    } else {
      setCategory(null);
    }
  }, [categoryData]);

  async function handleNewCategory() {
    const res = await newCategory({
      name: categoryInput,
    });

    if (res.type === "success") {
      useListsStore.setState((state) => {
        return { categories: [...state.categories, res.data] };
      });
      setCategory(res.data);
      setCategoryInput("");
      setCategoryOpen && setCategoryOpen(false);
    } else {
      toast.error(res.message || "Failed to create category");
    }
  }

  useEffect(() => {
    // Report `null` too — otherwise clearing the category never reaches the
    // parent form and the old value is still what gets saved.
    onCategoryChange(category);
  }, [category]);

  return (
    <div
      className={cn("flex flex-row", {
        "flex w-full items-start gap-2": labelPosition === "left",
      })}
    >
      {labelPosition !== "none" && (
        <div
          className={cn("relative", {
            "w-[86px] pt-2 max-[375px]:w-[81px] max-[320px]:w-[77px] lg:w-[83px]":
              labelPosition === "left",
          })}
        >
          <label
            className={cn("text-semibold", {
              "text-end text-sm": labelPosition === "left",
            })}
          >
            Category
            {required && (
              <span className="absolute -top-1 ml-0.5 text-red-500">*</span>
            )}
          </label>
        </div>
      )}

      <div
        className={cn("w-full", {
          "flex-1": labelPosition === "left",
        })}
      >
        <Selector
          label={(category: Category | null) =>
            category ? category.name || `Category ${category.id}` : "Category"
          }
          newButton={
            <div className="flex gap-2 p-1">
              <input
                type="text"
                placeholder="New Category..."
                maxLength={CATEGORY_NAME_MAX_LENGTH}
                value={categoryInput}
                onChange={(e) => setCategoryInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && categoryInput) {
                    e.preventDefault();
                    handleNewCategory();
                  }
                }}
                className={cn(
                  "w-full rounded-lg bg-slate-50 px-3 py-1.5 text-sm outline-none transition-all",
                  "ring-1 ring-inset ring-slate-200 placeholder:text-slate-400",
                  "focus:bg-white focus:ring-2 focus:ring-primary/40",
                )}
              />
              <button
                onClick={handleNewCategory}
                type="button"
                disabled={!categoryInput}
                className={cn(
                  "text-nowrap rounded-lg px-4 font-medium text-white transition-all active:scale-95",
                  categoryInput
                    ? "bg-primary shadow-sm shadow-primary/20 hover:bg-[#525ee5]"
                    : "bg-slate-200 cursor-not-allowed text-slate-400",
                )}
              >
                Add
              </button>
            </div>
          }
          items={categories}
          displayList={(category: Category) => (
            <p className="text-sm font-medium text-slate-700 group-hover:text-primary transition-colors">
              {category.name}
            </p>
          )}
          onSearch={(search: string) =>
            categories.filter((cat) =>
              cat.name.toLowerCase().includes(search.toLowerCase()),
            )
          }
          openState={[categoryOpen as boolean, setCategoryOpen]}
          selectedItem={category}
          setSelectedItem={setCategory}
          className={className}
          footer={
            isClear && category ? (
              <ClearSelectionButton
                label="Clear Category"
                onClear={() => {
                  setCategory(null);
                  setCategoryOpen && setCategoryOpen(false);
                }}
              />
            ) : null
          }
        />
      </div>
    </div>
  );
}
