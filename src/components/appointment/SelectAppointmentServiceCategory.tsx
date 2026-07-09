"use client";

import Selector from "@/components/Selector";
import { useListsStore } from "@/stores/lists";
import { Category } from "@prisma/client";
import newCategory from "@/actions/category/newCategory";
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

const STATIC_CATEGORY_COLORS = [
  "#60A5FA",
  "#34D399",
  "#A78BFA",
  "#F87171",
  "#22D3EE",
  "#EC4899",
  "#FACC15",
  "#4ADE80",
];

type SelectAppointmentServiceCategoryProps = {
  name?: string;
  value?: number | null;
  setValue?: Dispatch<SetStateAction<number | null>>;
  openDropdown?: boolean;
  setOpenDropdown?: Dispatch<SetStateAction<boolean>>;
};

export function SelectAppointmentServiceCategory({
  name = "serviceCategoryId",
  value = null,
  setValue,
  openDropdown,
  setOpenDropdown,
}: SelectAppointmentServiceCategoryProps) {
  const categories = useListsStore((x) => x.categories) as (Category & {
    color?: string;
  })[];
  const state = useState(value);
  const [serviceCategoryId, setServiceCategoryId] = setValue
    ? [value, setValue]
    : state;
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [selectedColor, setSelectedColor] = useState(STATIC_CATEGORY_COLORS[0]);

  useEffect(() => {
    if (!serviceCategoryId) {
      setSelectedCategory(null);
      return;
    }

    const matchedCategory = categories.find(
      (category) => category.id === serviceCategoryId,
    );
    setSelectedCategory(matchedCategory ?? null);
  }, [serviceCategoryId, categories]);

  useEffect(() => {
    if (selectedCategory) {
      setServiceCategoryId(selectedCategory.id);
    }
  }, [selectedCategory, setServiceCategoryId]);

  const localOpenState = useState(false);
  const [isOpen, setIsOpen] = setOpenDropdown
    ? [openDropdown ?? false, setOpenDropdown]
    : localOpenState;

  const getCategoryColor = (color?: string) => {
    if (!color) return "#94A3B8";
    return /^#([0-9A-Fa-f]{3}){1,2}$/.test(color) ? color : "#94A3B8";
  };

  const normalizedSearch = searchTerm.trim();
  const hasExactMatch = useMemo(() => {
    if (!normalizedSearch) return false;
    return categories.some(
      (category) =>
        category.name.toLowerCase() === normalizedSearch.toLowerCase(),
    );
  }, [categories, normalizedSearch]);

  const canCreateCategory = normalizedSearch.length > 0 && !hasExactMatch;

  const handleCreateCategory = async () => {
    if (!canCreateCategory || isCreating) return;

    try {
      setIsCreating(true);
      const res = await newCategory({
        name: normalizedSearch,
        color: selectedColor,
      });

      if (res.type !== "success") {
        toast.error(res.message || "Failed to create category");
        return;
      }

      const createdCategory = res.data as Category;
      useListsStore.setState((state) => ({
        categories: [...state.categories, createdCategory],
      }));
      setSelectedCategory(createdCategory);
      setServiceCategoryId(createdCategory.id);
      setSearchTerm("");
      setSelectedColor(STATIC_CATEGORY_COLORS[0]);
      setIsOpen(false);
      toast.success("Category created successfully.");
    } catch (error) {
      console.error(error);
      toast.error("Failed to create category");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <input type="hidden" name={name} value={serviceCategoryId ?? ""} />

      <Selector
        className="min-w-full"
        label={(category: Category | null) =>
          category ? category.name : "Select Service Category"
        }
        newButton={
          canCreateCategory ? (
            <div className="p-1">
              <p className="mb-2 text-center text-sm text-slate-500">
                New category: "{normalizedSearch}"
              </p>
              <div className="mb-3 flex items-center justify-center gap-2">
                {STATIC_CATEGORY_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className="size-4 rounded-full border-2 transition-transform hover:scale-105"
                    style={{
                      backgroundColor: color,
                      borderColor:
                        selectedColor === color ? "#0F172A" : "#FFFFFF",
                    }}
                    aria-label={`Select color ${color}`}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={handleCreateCategory}
                disabled={isCreating}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-[#6571FF] px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-[#5A65F0] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus className="h-4 w-4" />
                {isCreating ? "Adding..." : "Add Category"}
              </button>
            </div>
          ) : null
        }
        items={categories}
        showSearch
        openState={[isOpen, setIsOpen as Dispatch<SetStateAction<boolean>>]}
        selectedItem={selectedCategory}
        setSelectedItem={setSelectedCategory}
        onSearch={(search: string) => {
          setSearchTerm(search);
          return categories.filter((category) =>
            category.name.toLowerCase().includes(search.toLowerCase()),
          );
        }}
        displayList={(category: Category) => (
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full border border-slate-200"
              style={{
                backgroundColor: getCategoryColor((category as any).color),
              }}
            />
            <p className="text-sm font-medium text-slate-700 group-hover:text-[#6571FF] transition-colors">
              {category.name}
            </p>
          </div>
        )}
        onSelect={(category) => {
          setSelectedCategory(category);
          setServiceCategoryId(category.id);
        }}
      />
    </>
  );
}
