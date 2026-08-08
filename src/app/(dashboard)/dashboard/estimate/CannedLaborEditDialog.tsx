"use client";
import { updateLabor } from "@/actions/estimate/labor/updateLabor";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/Dialog";
import SelectCategory from "@/components/Lists/SelectCategory";
import { cn } from "@/lib/cn";
import { errorToast, successToast } from "@/lib/toast";
import { useEstimateCreateStore } from "@/stores/estimate-create";
import { useListsStore } from "@/stores/lists";
import { Category, Labor } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LABOR_NAME_MAX_LENGTH } from "./create/laborValidation";

const INPUT_CLASS =
  "w-full rounded-lg border border-gray-300 p-2 text-base focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 transition-colors";
const LABEL_CLASS = "mb-2 block text-sm font-medium text-gray-700";

/**
 * Edit dialog for a canned labor row. Shared by the table and card views of
 * CannedLaborItem, and deliberately mirrors the field set of the "Add Labor"
 * dialog (NewLabor) — hours and discount used to be missing here, so a labor
 * created with a discount lost it the moment it was edited.
 */
export default function CannedLaborEditDialog({
  labor,
  trigger,
}: {
  labor: Labor & { category?: Category };
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(labor.name);
  const [nameError, setNameError] = useState("");
  const [hours, setHours] = useState("");
  const [charge, setCharge] = useState("");
  const [discount, setDiscount] = useState("");
  const [notes, setNotes] = useState("");
  const [category, setCategory] = useState<Category | null>(
    labor.category || null,
  );
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const { categories } = useListsStore();
  const { currentSelectedCategoryId } = useEstimateCreateStore();
  const router = useRouter();

  // Load the row's saved values every time the dialog opens, so a cancelled
  // edit is discarded and a refreshed row is picked up.
  useEffect(() => {
    if (!open) return;
    setName(labor.name);
    setCategory(labor.category || null);
    setHours(labor.hours ? Number(labor.hours).toString() : "");
    setCharge(labor.charge ? Number(labor.charge).toFixed(2) : "");
    setDiscount(labor.discount ? Number(labor.discount).toString() : "");
    setNotes(labor.notes || "");
    setNameError("");
  }, [open, labor]);

  useEffect(() => {
    if (currentSelectedCategoryId && !category) {
      setCategory(
        categories.find((cat) => cat.id === currentSelectedCategoryId) ?? null,
      );
    }
  }, [currentSelectedCategoryId, category, categories]);

  // Subtotal is net of the discount, matching the Add Labor dialog.
  const laborCost = (parseFloat(hours) || 0) * (parseFloat(charge) || 0);
  const discountAmount = parseFloat(discount) || 0;
  const subtotal = laborCost - discountAmount;
  const discountExceedsLaborCost =
    !!discount.trim() && discountAmount > laborCost;

  const handleEdit = async () => {
    if (!name.trim()) {
      setNameError("Labor name is required");
      return;
    }
    if (name.trim().length > LABOR_NAME_MAX_LENGTH) {
      setNameError(
        `Labor name cannot exceed ${LABOR_NAME_MAX_LENGTH} characters`,
      );
      return;
    }
    if (discountExceedsLaborCost) return;

    setIsPending(true);
    const res = await updateLabor({
      id: labor.id,
      name,
      charge: parseFloat(charge) || 0,
      hours: parseFloat(hours) || 0,
      discount: parseFloat(discount) || 0,
      categoryId: category?.id ?? null,
      notes: notes.trim() || null,
    });

    if (res.success) {
      successToast("Labor updated successfully");
      setOpen(false);
      // Re-fetch the server data in place instead of reloading the whole page
      router.refresh();
    } else {
      errorToast(res?.message || "Failed to update labor");
    }
    setIsPending(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        className="max-h-[94vh] max-w-md"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Edit Canned Labor</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 overflow-y-auto">
          <div>
            <label className={LABEL_CLASS}>
              Labor Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError("");
              }}
              autoFocus={false}
              maxLength={LABOR_NAME_MAX_LENGTH}
              className={cn(
                "w-full rounded-lg border p-2 text-base focus:ring-2 focus:ring-indigo-500 transition-colors",
                nameError
                  ? "border-red-500"
                  : "border-gray-300 focus:border-indigo-500",
              )}
              placeholder="Labor Name"
            />
            <div className="mt-1 flex items-start justify-between gap-2">
              <p className="text-xs text-red-500">{nameError}</p>
              <p className="shrink-0 text-xs text-gray-400">
                {name.length}/{LABOR_NAME_MAX_LENGTH}
              </p>
            </div>
          </div>

          <div>
            <label className={LABEL_CLASS}>Category</label>
            <SelectCategory
              onCategoryChange={setCategory}
              labelPosition="none"
              categoryData={category}
              categoryOpen={categoryOpen}
              setCategoryOpen={setCategoryOpen}
              allowEdit={true}
              className="min-w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL_CLASS}>Hours</label>
              <input
                type="number"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                step="0.01"
                min="0"
                className={INPUT_CLASS}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>$/Hour</label>
              <input
                type="number"
                value={charge}
                onChange={(e) => setCharge(e.target.value)}
                step="0.01"
                min="0"
                className={INPUT_CLASS}
                placeholder="$/Hour"
              />
            </div>
          </div>

          <div>
            <label className={LABEL_CLASS}>Discount</label>
            <input
              type="number"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              step="0.01"
              min="0"
              className={cn(
                INPUT_CLASS,
                discountExceedsLaborCost && "border-red-500",
              )}
              placeholder="0.00"
            />
            {discountExceedsLaborCost ? (
              <p className="mt-1 text-xs text-red-500">
                Discount cannot exceed the labor cost (${laborCost.toFixed(2)})
              </p>
            ) : (
              <p className="mt-1 text-xs text-gray-500">
                Labor cost ${laborCost.toFixed(2)}
                {discountAmount > 0 &&
                  ` − discount $${discountAmount.toFixed(2)}`}{" "}
                = subtotal ${subtotal.toFixed(2)}
              </p>
            )}
          </div>

          <div>
            <label className={LABEL_CLASS}>Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className={cn(INPUT_CLASS, "resize-none")}
              placeholder="Add any notes about this labor item..."
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <button className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
          </DialogClose>
          <button
            onClick={handleEdit}
            disabled={isPending || discountExceedsLaborCost}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-gray-400"
          >
            {isPending ? "Updating..." : "Update Labor"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
