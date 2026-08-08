import deleteCategory from "@/actions/category/deleteCategory";
import newCategory from "@/actions/category/newCategory";
import Selector from "@/components/Selector";
import { cn } from "@/lib/cn";
import { useListsStore } from "@/stores/lists";
import { Category } from "@prisma/client";
import { Popconfirm } from "antd";
import { X } from "lucide-react";
import { usePathname } from "next/navigation";
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
  onBlur,
  className,
  allowEdit = false,
  isClear = false,
}: {
  categoryData?: Category | null;
  onCategoryChange: (category: Category | null) => void;
  labelPosition?: "top" | "left" | "none";
  categoryOpen?: boolean;
  setCategoryOpen?: any;
  required?: boolean;
  onBlur?: () => void;
  className?: string;
  allowEdit?: boolean;
  /** Show a "Clear Category" action so the selection can be removed. */
  isClear?: boolean;
}) {
  const { categories } = useListsStore();
  const [error, setError] = useState<string | null>();
  const [category, setCategory] = useState<Category | null>(categoryData);
  const [categoryInput, setCategoryInput] = useState("");
  const pathname = usePathname();

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
      if (category?.id === categoryId) {
        setCategory(null);
      }
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
    onCategoryChange(category);
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
              ? "Select Category"
              : "Category"
        }
        newButton={
          <div className="flex flex-col gap-2 p-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="New Category..."
                  value={categoryInput}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.length > 25) {
                      setError("Category must be less than 25 characters");
                      return;
                    }
                    setError(""); // Clear error when typing
                    setCategoryInput(value);
                  }}
                  className={cn(
                    "w-full rounded-lg bg-slate-50 px-3 py-2 text-sm font-medium outline-none transition-all",
                    "ring-1 ring-inset ring-slate-200 placeholder:text-slate-400",
                    "focus:bg-white focus:ring-2 focus:ring-primary/40",
                    error && "ring-red-200 focus:ring-red-400",
                  )}
                />
              </div>

              <button
                onClick={handleNewCategory}
                type="button"
                disabled={!categoryInput || !!error}
                className={cn(
                  "rounded-lg px-4 text-xs font-bold uppercase tracking-wider text-white transition-all active:scale-95",
                  categoryInput && !error
                    ? "bg-primary shadow-lg shadow-primary/20 hover:bg-[#525ee5]"
                    : "bg-slate-300 cursor-not-allowed",
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
          </div>
        }
        items={categories}
        displayList={(category: Category) => (
          <div className="flex items-center justify-between group py-0.5">
            <p className="text-sm font-medium text-slate-700 group-hover:text-primary transition-colors">
              {category.name}
            </p>

            <div onClick={(e) => e.stopPropagation()}>
              <Popconfirm
                title="Delete Category"
                description="Are you sure you want to remove this?"
                okText="Delete"
                cancelText="Cancel"
                onConfirm={() => handleDeleteCategory(category?.id)}
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
                <div
                  className="rounded-lg p-1.5 hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <X size={16} strokeWidth={2.5} />
                </div>
              </Popconfirm>
            </div>
          </div>
        )}
        onSearch={(search: string) =>
          categories.filter((cat) =>
            cat.name.toLowerCase().includes(search.toLowerCase()),
          )
        }
        openState={[
          categoryOpen as boolean,
          (open: React.SetStateAction<boolean>) => {
            const newValue =
              typeof open === "function" ? open(categoryOpen as boolean) : open;
            setCategoryOpen && setCategoryOpen(newValue);
            if (!newValue && onBlur) onBlur();
          },
        ]}
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
        disabledDropdown={
          !allowEdit && !!category && pathname.includes("/estimate/")
        }
      />
    </div>
  );
}
