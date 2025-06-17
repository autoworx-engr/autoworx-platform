import newCategory from "@/actions/category/newCategory";
import deleteCategory from "@/actions/category/deleteCategory";
import Selector from "@/components/Selector";
import { cn } from "@/lib/cn";
import { useListsStore } from "@/stores/lists";
import { Category } from "@prisma/client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FaTimes } from "react-icons/fa";
import { Popconfirm } from "antd";

export default function SelectCategory({
  categoryData = null,
  onCategoryChange,
  labelPosition = "top",
  categoryOpen,
  setCategoryOpen,
  required = false,
}: {
  categoryData?: Category | null;
  onCategoryChange: (category: Category) => void;
  labelPosition?: "top" | "left" | "none";
  categoryOpen?: boolean;
  setCategoryOpen?: any;
  required?: boolean;
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
            className={cn("text-semibold", {
              "w-28 text-end text-sm": labelPosition === "left",
            })}
          >
            Category
            {required && (
              <span className="absolute -top-1 ml-0.5 text-red-500">*</span>
            )}
          </label>
        </div>
      )}

      <Selector
        label={(category: Category | null) =>
          category ? category.name || `Category ${category.id}` : "Category"
        }
        newButton={
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Category Name"
              value={categoryInput}
              onChange={(e) => setCategoryInput(e.target.value)}
              className="w-full rounded-md border-2 border-slate-400 p-1"
            />
            <button
              onClick={handleNewCategory}
              className={cn(
                "text-nowrap rounded-md px-2 text-white",
                categoryInput ? "bg-slate-700" : "bg-slate-400",
              )}
              type="button"
              disabled={!categoryInput}
            >
              Quick Add
            </button>
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
                <FaTimes cursor="pointer" color="#f87171" fontSize={20} />
              </span>
            </Popconfirm>
          </div>
        )}
        onSearch={(search: string) =>
          categories.filter((cat) =>
            cat.name.toLowerCase().includes(search.toLowerCase()),
          )
        }
        openState={[categoryOpen as boolean, setCategoryOpen]}
        selectedItem={category}
        setSelectedItem={setCategory}
      />
    </div>
  );
}
