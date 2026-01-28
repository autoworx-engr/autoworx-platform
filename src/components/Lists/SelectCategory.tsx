import newCategory from "@/actions/category/newCategory";
import deleteCategory from "@/actions/category/deleteCategory";
import Selector from "@/components/Selector";
import { cn } from "@/lib/cn";
import { useListsStore } from "@/stores/lists";
import { Category } from "@prisma/client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Popconfirm } from "antd";
import { X } from "lucide-react";

export default function SelectCategory({
  categoryData = null,
  onCategoryChange,
  labelPosition = "top",
  categoryOpen,
  setCategoryOpen,
  required = false,
  onBlur,
  className,
}: {
  categoryData?: Category | null;
  onCategoryChange: (category: Category) => void;
  labelPosition?: "top" | "left" | "none";
  categoryOpen?: boolean;
  setCategoryOpen?: any;
  required?: boolean;
  onBlur?: () => void;
  className?: string;
}) {
  const { categories } = useListsStore();
  const [error, setError] = useState<string | null>();
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

  async function handleDeleteCategory(categoryId: number) {
    const res = await deleteCategory({ categoryId });

    if (res.type === "success") {
      setCategory(null);
      useListsStore.setState((state) => {
        return {
          categories: state.categories.filter((cat) => cat.id !== categoryId),
        };
      });

      toast.success("Category deleted successfully");
    } else {
      toast.error(res.message || "Failed to delete category");
    }

    setCategoryInput("");
  }

  useEffect(() => {
    if (category) {
      onCategoryChange(category);
    }
  }, [category]);

  return (
    <div
      className={cn({
        "flex w-full items-center gap-2": labelPosition === "left",
      })}
    >
      {labelPosition !== "none" && (
        <div className="relative">
          <label
            className={cn("font-medium text-slate-600", {
              "w-28 text-end text-sm": labelPosition === "left",
            })}
          >
            Category
            {required && (
              <span className="absolute -top-1 ml-0.5 text-red-500">*</span>
            )}
          </label>
          <p className="text-xs">Category must be less than 25 characters</p>
        </div>
      )}

      <Selector
        label={(category: Category | null) =>
          category
            ? category.name || `Category ${category.id}`
            : required
              ? "Select Category*"
              : "Category"
        }
        newButton={
          <div className="flex gap-2">
            <div>
              <input
                type="text"
                placeholder="Category Name"
                value={categoryInput}
                onChange={(e) => {
                  const value = e.target.value;

<<<<<<< HEAD
              <button
                onClick={handleNewCategory}
                type="button"
                disabled={!categoryInput || !!error}
                className={cn(
                  "rounded-lg px-4 text-xs font-bold uppercase tracking-wider text-white transition-all active:scale-95",
                  categoryInput && !error
                    ? "bg-[#6571FF] shadow-lg shadow-[#6571FF]/20 hover:bg-[#525ee5]"
                    : "bg-slate-300 cursor-not-allowed"
                )}
              >
                Quick Add
              </button>
            </div>
            {error && (
              <p className="ml-1 text-[10px] font-bold uppercase tracking-tight text-red-500 animate-in fade-in slide-in-from-top-1">
                {error}
              </p>
            )}
=======
                  if (value.length > 25) {
                    setError("Category must be less than 25 characters");
                    return false;
                  }
                  setCategoryInput(e.target.value);
                }}
                className="w-full rounded-md border-2 border-slate-400 p-1"
              />
              {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
            </div>

            <button
              onClick={handleNewCategory}
              className={cn(
                "text-nowrap rounded-md px-2 text-white",
                categoryInput ? "bg-slate-700" : "bg-slate-400"
              )}
              type="button"
              disabled={!categoryInput}
            >
              Quick Add
            </button>
>>>>>>> 562aae035edd611117b1950291edabf2b6d02c1d
          </div>
        }
        items={categories}
        displayList={(category: Category) => (
          <div className="flex items-center justify-between">
            <p>{category.name} </p>
            <Popconfirm
              title="Delete the category"
              description="Are you sure to delete this category?"
              okText="Yes"
              cancelText="No"
              onConfirm={() => handleDeleteCategory(category?.id)}
            >
              <span
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                <X size={20} cursor="pointer" color="#f87171" />
              </span>
            </Popconfirm>
          </div>
        )}
        onSearch={(search: string) =>
          categories.filter((cat) =>
            cat.name.toLowerCase().includes(search.toLowerCase())
          )
        }
        openState={[
          categoryOpen as boolean,
          (open: React.SetStateAction<boolean>) => {
            const newValue =
              typeof open === "function" ? open(categoryOpen as boolean) : open;
            setCategoryOpen && setCategoryOpen(newValue);
            // Trigger validation when dropdown closes
            if (!newValue && onBlur) {
              onBlur();
            }
          },
        ]}
        selectedItem={category}
        setSelectedItem={setCategory}
        className={className}
      />
    </div>
  );
}
