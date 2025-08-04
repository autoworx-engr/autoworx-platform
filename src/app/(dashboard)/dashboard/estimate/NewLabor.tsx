"use client";
import SelectCategory from "@/components/Lists/SelectCategory";
import { SelectTags } from "@/components/Lists/SelectTags";
import { useEstimateCreateStore } from "@/stores/estimate-create";
import { useEstimatePopupStore } from "@/stores/estimate-popup";
import { useListsStore } from "@/stores/lists";
import { Category, Tag } from "@prisma/client";
import { useEffect, useState } from "react";
import { newLabor } from "@/actions/estimate/labor/newLabor";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/Dialog";
import FormError from "@/components/FormError";
import { useFormErrorStore } from "@/stores/form-error";

export default function NewLabor({
  newButton,
  isCanned = false,
  fromCanned = false,
}: {
  newButton?: React.ReactNode;
  isCanned?: boolean;
  fromCanned?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { categories } = useListsStore();
  const { currentSelectedCategoryId } = useEstimateCreateStore();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [notes, setNotes] = useState<string>("");
  const [hours, setHours] = useState<string>("");
  const [charge, setCharge] = useState<string>("");
  const [discount, setDiscount] = useState<string>("");
  
  const { clearError, showError } = useFormErrorStore();

  const { close, data } = useEstimatePopupStore();
  const itemId = data?.itemId;

  const [tagsOpen, setTagsOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);

  // Reset form function to avoid code duplication
  const resetForm = () => {
    setName("");
    setCategory(null);
    setTags([]);
    setNotes("");
    setHours("");
    setCharge("");
    setDiscount("");
    clearError();
  };

  useEffect(() => {
    if (currentSelectedCategoryId) {
      setCategory(
        categories.find((cat) => cat.id === currentSelectedCategoryId)!,
      );
    }
  }, [currentSelectedCategoryId]);

  useEffect(() => {
    setTagsOpen(false);
  }, [categoryOpen]);

  useEffect(() => {
    setCategoryOpen(false);
  }, [tagsOpen]);

  useEffect(() => {
    if (data?.labor && data.edit && !fromCanned) {
      setName(data.labor.name);
      setCategory(categories.find((cat) => cat.id === data.labor.categoryId)!);
      setTags(data.labor.tags);
      setNotes(data.labor.notes);
      setHours(data.labor.hours?.toString() || "");
      setCharge(data.labor.charge?.toString() || "");
      setDiscount(data.labor.discount?.toString() || "");
    } else {
      resetForm();
    }
  }, [data]);

  // Handle dialog close from any source
  const handleDialogClose = () => {
    close();
    setOpen(false);
    resetForm();
  };

  // Validate form inputs
  const validateForm = () => {
    if (!name.trim()) {
      showError({
        field: "serviceName",
        message: "Labor name is required",
      });
      return false;
    }

    if (!hours.trim()) {
      showError({
        field: "hours",
        message: "No. of hours is required",
      });
      return false;
    }
    if (!charge.trim()) {
      showError({
        field: "charge",
        message: "$/hr is required",
      });
      return false;
    }
    
    return true;
  };

  async function handleSubmit() {
    if (!validateForm()) return;
    
    const res = await newLabor({
      name,
      categoryId: category?.id!,
      tags,
      notes,
      hours: parseFloat(hours) || 1,
      charge: parseFloat(charge) || 0,
      discount: parseFloat(discount) || 0,
      cannedLabor: isCanned,
    });

    if (res.type === "success") {
      // Change the service where itemId is the same
      useEstimateCreateStore.setState((state) => {
        const items = state.items.map((item) => {
          if (item.id === itemId) {
            return {
              ...item,
              labor: res.data,
            };
          }
          return item;
        });
        return { items };
      });

      // Add to listsStore
      useListsStore.setState((state) => {
        return { labors: [...state.labors, res.data] };
      });

      handleDialogClose();
    } else if (res.type === "globalError") {
      showError({
        field: res.field,
        message:
          res.errorSource && res.errorSource?.length > 0
            ? res.errorSource[0].message
            : res.message,
      });
    }
  }

  async function handleEdit() {
    if (!validateForm()) return;

    // Change the service where itemId is the same
    // @ts-ignore
    useEstimateCreateStore.setState((state) => {
      const items = state.items.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            labor: {
              ...item.labor,
              name,
              categoryId: category?.id,
              tags,
              notes,
              hours: parseFloat(hours) || 0,
              charge: parseFloat(charge) || 0,
              discount: parseFloat(discount) || 0,
            },
          };
        }
        return item;
      });
      return { items };
    });
    handleDialogClose();
  }

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) {
        // This handles the X button click or clicking outside the dialog
        handleDialogClose();
      }
      setOpen(newOpen);
    }}>
      <DialogTrigger asChild>
        {newButton ? (
          newButton
        ) : (
          <button type="button" className="# px-4text-xs text-[#6571FF]">
            + New Vehicle
          </button>
        )}
      </DialogTrigger>

      <DialogContent
        className="max-h-full max-w-md grid-rows-[auto,1fr,auto]"
        form
      >
        <DialogHeader>
          <DialogTitle>Add New Labor</DialogTitle>
        </DialogHeader>

        <FormError />

        <div className="flex flex-col gap-y-8 py-5 md:p-5">
          <div className="#items-center flex gap-2">
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => {
                const value = e.target.value;
                setName(value);
                // Clear error when user starts typing
                if (value.trim()) {
                  clearError();
                }
              }}
              className="#text-xs w-full rounded-md border-2 border-slate-400 p-1 px-4"
              placeholder="Labor Name*"
            />
          </div>

          <SelectCategory
            onCategoryChange={setCategory}
            labelPosition="none"
            categoryData={category}
            categoryOpen={categoryOpen}
            setCategoryOpen={setCategoryOpen}
          />

          <div className="#items-center flex gap-2">
            <div className="w-full">
              <SelectTags
                value={tags}
                setValue={setTags}
                openStates={[tagsOpen, setTagsOpen]}
              />
            </div>
          </div>

          <div className="#items-center flex gap-2">
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-30 #text-xs w-full rounded-md border-2 border-slate-400 p-1 px-4"
              placeholder="Notes"
            />
          </div>

          <div className="#items-center flex gap-2">
            <input
              type="number"
              id="hours"
              value={hours}
              onChange={(e) => {
                const value = e.target.value;
                setHours(value)
              // Clear error when user starts typing
                if (value.trim()) {
                  clearError();
                }
              }}
              step="0.01"
              className="#text-xs w-full rounded-md border-2 border-slate-400 p-1 px-4"
              placeholder="No. of Hours*"
              required
            />
          </div>

          <div className="#items-center flex gap-2">
            <input
              type="number"
              id="perhour"
              value={charge}
              onChange={(e) => {
                const value = e.target.value;
                setCharge(value)
               // Clear error when user starts typing
                if (value.trim()) {
                  clearError();
                }
              }}
              step="0.01"
              className="#text-xs w-full rounded-md border-2 border-slate-400 p-1 px-4"
              placeholder="$/hr*"
              required
            />
          </div>

          <div className="#items-center flex gap-2">
            <input
              type="number"
              id="discount"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              step="0.01"
              className="#text-xs w-full rounded-md border-2 border-slate-400 p-1 px-4"
              placeholder="Discount"
            />
          </div>
        </div>

        <DialogFooter className="flex justify-between gap-4 md:gap-0">
          <DialogClose
            onClick={handleDialogClose}
            className="rounded-lg border-2 border-slate-400 p-2"
          >
            Cancel
          </DialogClose>
          <button
            className="rounded-lg bg-[#6571FF] p-2 text-white md:px-5"
            onClick={data?.edit && !fromCanned ? handleEdit : handleSubmit}
            type="button"
          >
            Done
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}