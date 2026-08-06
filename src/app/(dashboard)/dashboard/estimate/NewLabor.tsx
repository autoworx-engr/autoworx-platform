"use client";
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
import SelectCategory from "@/components/Lists/SelectCategory";
import { successToast } from "@/lib/toast";
import { useEstimateCreateStore } from "@/stores/estimate-create";
import { useEstimatePopupStore } from "@/stores/estimate-popup";
import { useFormErrorStore } from "@/stores/form-error";
import { useListsStore } from "@/stores/lists";
import { Category, Tag } from "@prisma/client";
import { useEffect, useState } from "react";

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
    if (data?.labor && data.edit && !fromCanned) {
      setName(data.labor.name);
      setCategory(
        categories.find((cat) => cat.id === data.labor.categoryId) ?? null,
      );
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

    const subtotal = (parseFloat(hours) || 0) * (parseFloat(charge) || 0);
    if (discount.trim() && parseFloat(discount) > subtotal) {
      showError({
        field: "discount",
        message: "Discount cannot be greater than the subtotal",
      });
      return false;
    }

    return true;
  };

  const subtotal = (parseFloat(hours) || 0) * (parseFloat(charge) || 0);
  const discountExceedsSubtotal =
    !!discount.trim() && parseFloat(discount) > subtotal;

  async function handleSubmit() {
    if (!validateForm()) return;

    const res = await newLabor({
      name,
      categoryId: category?.id ?? null,
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
      successToast("Labor added successfully");
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
    successToast("Labor updated successfully");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        if (!newOpen) {
          handleDialogClose();
        }
        setOpen(newOpen);
      }}
    >
      <DialogTrigger asChild>
        {newButton ? (
          newButton
        ) : (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            New Labor
          </button>
        )}
      </DialogTrigger>

      <DialogContent
        className="max-h-[94vh] max-w-md grid-rows-[auto,1fr,auto]"
        onOpenAutoFocus={(e) => e.preventDefault()}
        form
      >
        <DialogHeader className="border-b border-slate-200 pb-2">
          <DialogTitle className="text-xl font-semibold text-slate-900">
            {data?.edit && !fromCanned
              ? "Edit Canned Labor"
              : "Add Canned Labor"}
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto px-2.5">
          <FormError />

          <div className="space-y-3 py-3">
            {/* Labor Name */}
            <div className="space-y-2">
              <label
                htmlFor="name"
                className="block text-sm font-medium text-slate-700"
              >
                Labor Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => {
                  const value = e.target.value;
                  setName(value);
                  if (value.trim()) {
                    clearError();
                  }
                }}
                className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg outline-none transition-all placeholder:text-slate-400 focus:border-blue-500"
                placeholder="Enter labor Name"
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Category
              </label>
              <SelectCategory
                onCategoryChange={setCategory}
                labelPosition="none"
                categoryData={category}
                categoryOpen={categoryOpen}
                setCategoryOpen={setCategoryOpen}
                allowEdit={true}
              />
            </div>

            {/* Pricing Section */}
            <div className="pt-2">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">
                Pricing Details
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {/* Hours */}
                <div className="space-y-2">
                  <label
                    htmlFor="hours"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Hours <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      id="hours"
                      value={hours}
                      onChange={(e) => {
                        const value = e.target.value;
                        setHours(value);
                        if (value.trim()) {
                          clearError();
                        }
                      }}
                      step="0.01"
                      className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg outline-none transition-all placeholder:text-slate-400 focus:border-blue-500"
                      placeholder="0.00"
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                      hrs
                    </span>
                  </div>
                </div>

                {/* Rate per Hour */}
                <div className="space-y-2">
                  <label
                    htmlFor="perhour"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Rate/Hour <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                      $
                    </span>
                    <input
                      type="number"
                      id="perhour"
                      value={charge}
                      onChange={(e) => {
                        const value = e.target.value;
                        setCharge(value);
                        if (value.trim()) {
                          clearError();
                        }
                      }}
                      step="0.01"
                      className="w-full pl-8 pr-4 py-2.5 text-sm border border-slate-300 rounded-lg outline-none transition-all placeholder:text-slate-400 focus:border-blue-500"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Discount */}
              <div className="space-y-2 mt-4">
                <label
                  htmlFor="discount"
                  className="block text-sm font-medium text-slate-700"
                >
                  Discount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                    $
                  </span>
                  <input
                    type="number"
                    id="discount"
                    value={discount}
                    onChange={(e) => {
                      setDiscount(e.target.value);
                      clearError();
                    }}
                    step="0.01"
                    className={`w-full pl-8 pr-4 py-2.5 text-sm border rounded-lg outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 ${
                      discountExceedsSubtotal
                        ? "border-red-400"
                        : "border-slate-300"
                    }`}
                    placeholder="0.00"
                  />
                </div>
                {discountExceedsSubtotal && (
                  <p className="text-xs text-red-500">
                    Discount cannot exceed the subtotal (${subtotal.toFixed(2)})
                  </p>
                )}
              </div>

              {/* Total Calculation Display */}
              {hours && charge && (
                <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">Subtotal:</span>
                    <span className="font-medium text-slate-900">
                      ${subtotal.toFixed(2)}
                    </span>
                  </div>
                  {discount && parseFloat(discount) > 0 && (
                    <>
                      <div className="flex justify-between items-center text-sm mt-2">
                        <span className="text-slate-600">Discount:</span>
                        <span className="font-medium text-red-600">
                          -${parseFloat(discount).toFixed(2)}
                        </span>
                      </div>
                      <div className="border-t border-slate-300 mt-2 pt-2 flex justify-between items-center">
                        <span className="font-semibold text-slate-900">
                          Total:
                        </span>
                        <span
                          className={`font-bold text-lg ${
                            discountExceedsSubtotal
                              ? "text-red-600"
                              : "text-slate-900"
                          }`}
                        >
                          ${(subtotal - parseFloat(discount)).toFixed(2)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label
                htmlFor="notes"
                className="block text-sm font-medium text-slate-700"
              >
                Notes
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg outline-none transition-all placeholder:text-slate-400 focus:border-blue-500"
                placeholder="Add any additional notes or details..."
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-row justify-end gap-3   mt-auto">
          <DialogClose
            onClick={handleDialogClose}
            className="px-5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </DialogClose>
          <button
            className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={data?.edit && !fromCanned ? handleEdit : handleSubmit}
            disabled={discountExceedsSubtotal}
            type="button"
          >
            {data?.edit && !fromCanned ? "Update Labor" : "Add Labor"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
