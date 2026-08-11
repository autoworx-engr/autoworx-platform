"use client";

import deleteCategory from "@/actions/category/deleteCategory";
import newCategory from "@/actions/category/newCategory";
import updateCategory from "@/actions/category/updateCategory";
import Selector from "@/components/Selector";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { CATEGORY_NAME_MAX_LENGTH } from "@/lib/categoryConstants";
import ServiceCategoryRow from "./ServiceCategoryRow";
import { useListsStore } from "@/stores/lists";
import { Category } from "@prisma/client";
import { Plus } from "lucide-react";
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
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(
    null,
  );

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

  const normalizedSearch = searchTerm.trim();
  const hasExactMatch = useMemo(() => {
    if (!normalizedSearch) return false;
    return categories.some(
      (category) =>
        category.name.toLowerCase() === normalizedSearch.toLowerCase(),
    );
  }, [categories, normalizedSearch]);

  const canCreateCategory =
    normalizedSearch.length > 0 &&
    normalizedSearch.length <= CATEGORY_NAME_MAX_LENGTH &&
    !hasExactMatch;

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

  const handleSaveCategory = async (
    categoryId: number,
    newName: string,
    newColor: string,
  ) => {
    try {
      setSavingId(categoryId);
      const res = await updateCategory({
        categoryId,
        name: newName,
        color: newColor,
      });

      if (res.type !== "success") {
        toast.error(res.message || "Failed to update category");
        return false;
      }

      useListsStore.setState((state) => ({
        categories: state.categories.map((c) =>
          c.id === categoryId ? { ...c, name: newName, color: newColor } : c,
        ),
      }));
      // Keep the trigger label in step when the selected category is renamed.
      setSelectedCategory((prev) =>
        prev && prev.id === categoryId
          ? { ...prev, name: newName, color: newColor }
          : prev,
      );
      toast.success("Category updated successfully.");
      return true;
    } catch (error) {
      console.error(error);
      toast.error("Failed to update category");
      return false;
    } finally {
      setSavingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete || deletingId) return;
    const category = categoryToDelete;

    try {
      setDeletingId(category.id);
      const res = await deleteCategory({ categoryId: category.id });

      if (res.type !== "success") {
        toast.error(res.message || "Failed to delete category");
        return;
      }

      useListsStore.setState((state) => ({
        categories: state.categories.filter((c) => c.id !== category.id),
      }));
      if (serviceCategoryId === category.id) {
        setSelectedCategory(null);
        setServiceCategoryId(null);
      }
      toast.success("Category deleted successfully.");
      setCategoryToDelete(null);
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete category");
    } finally {
      setDeletingId(null);
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
                className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-[#5A65F0] disabled:cursor-not-allowed disabled:opacity-60"
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
        // Tracks clearing the box too — `onSearch` short circuits on an empty
        // query, which left the "New category" panel showing a stale term.
        onSearchChange={setSearchTerm}
        onSearch={(search: string) => {
          setSearchTerm(search);
          return categories.filter((category) =>
            category.name.toLowerCase().includes(search.toLowerCase()),
          );
        }}
        displayList={(category: Category) => (
          <ServiceCategoryRow
            category={category}
            colors={STATIC_CATEGORY_COLORS}
            isSaving={savingId === category.id}
            onSave={handleSaveCategory}
            onRequestDelete={setCategoryToDelete}
          />
        )}
        onSelect={(category) => {
          setSelectedCategory(category);
          setServiceCategoryId(category.id);
        }}
      />

      <ConfirmModal
        open={!!categoryToDelete}
        onOpenChange={(open) => {
          if (!open && !deletingId) setCategoryToDelete(null);
        }}
        title="Delete category?"
        description={
          categoryToDelete
            ? `"${categoryToDelete.name}" will be removed from any items using it. This action can't be undone.`
            : undefined
        }
        confirmText="Delete"
        destructive
        loading={!!deletingId}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
