"use client";

import Selector from "@/components/Selector";
import { useListsStore } from "@/stores/lists";
import { Category } from "@prisma/client";
import newCategory from "@/actions/category/newCategory";
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

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
      const res = await newCategory({ name: normalizedSearch });

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
      setIsOpen(false);
    } catch (error) {
      void error;
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
          category ? category.name : "Select service category"
        }
        newButton={
          canCreateCategory ? (
            <div className="p-1">
              <p className="mb-2 text-center text-sm text-slate-500">
                New category: "{normalizedSearch}"
              </p>
              <button
                type="button"
                onClick={handleCreateCategory}
                disabled={isCreating}
                className="w-full rounded-lg border border-slate-200 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCreating ? "Adding..." : "+ Add Category"}
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
