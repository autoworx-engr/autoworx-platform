"use client";
import newService from "@/actions/estimate/service/newService";
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
import { errorToast, successToast } from "@/lib/toast";
import { useEstimateCreateStore } from "@/stores/estimate-create";
import { useEstimatePopupStore } from "@/stores/estimate-popup";
import { useFormErrorStore } from "@/stores/form-error";
import { useListsStore } from "@/stores/lists";
import { Category } from "@prisma/client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function NewService({
  newButton,
}: {
  newButton?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { close, data } = useEstimatePopupStore();
  const itemId = data?.itemId;
  const edit = data?.edit as boolean | undefined;

  const { showError, clearError } = useFormErrorStore();

  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [category, setCategory] = useState<Category | null>(null);
  const [description, setDescription] = useState("");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const descriptionLength = description.length;
  const maxDescriptionLength = 1500;
  // Reset form when dialog opens or closes

  // Reset form function
  const resetForm = () => {
    setName("");
    setCategory(null);
    setDescription("");
    setNameError("");
    clearError();
  };

  useEffect(() => {
    if (!open) return;

    if (data?.service && data.edit) {
      setName(data.service.name);
      setCategory(
        useListsStore
          .getState()
          .categories.find((cat) => cat.id === data.service.categoryId) || null,
      );
      setDescription(data.service.description);
    } else {
      resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, data]);

  // Validation function
  const validateName = (value: string) => {
    if (!value.trim()) {
      setNameError("Service name is required");
      showError({
        field: "serviceName",
        message: "Service name is required",
      });
      return false;
    } else {
      setNameError("");
      clearError();
      return true;
    }
  };

  async function handleSubmit() {
    try {
      setIsLoading(true);

      setNameTouched(true);

      if (!validateName(name)) {
        setIsLoading(false);
        return;
      }

      const res = await newService({
        name,
        categoryId: category?.id ?? null,
        description,
        canned: true,
      });

      if (res.type === "success") {
        // Change the service where itemId is the same
        useEstimateCreateStore.setState((state) => {
          const items = state.items.map((item) => {
            if (item.id === itemId) {
              return {
                ...item,
                service: res.data,
              };
            }
            return item;
          });
          return { items };
        });

        // Add to listsStore
        useListsStore.setState((state) => {
          return { services: [...state.services, res.data] };
        });

        resetForm();
        close();
        setOpen(false);
        successToast("Service added successfully");
      } else if (res.type === "globalError") {
        errorToast(res.message);
        showError({
          field: res.field,
          message:
            res.errorSource && res.errorSource.length > 0
              ? res.errorSource[0].message
              : res.message,
        });
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      errorToast("An error occurred while saving the service");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleEdit() {
    try {
      setIsLoading(true);

      setNameTouched(true);

      if (!validateName(name)) {
        setIsLoading(false);
        return;
      }
      // Update the service in the items
      useEstimateCreateStore.setState((state: any) => {
        const items = state.items.map((item: any) => {
          if (item.id === itemId) {
            return {
              ...item,
              service: {
                ...item.service,
                name,
                categoryId: category?.id ?? null,
                description,
              },
            };
          }
          return item;
        });
        return { items };
      });

      resetForm();
      close();
      setOpen(false);
      successToast("Service updated successfully");
    } catch (error) {
      console.error("Error editing service:", error);
      errorToast("An error occurred while editing the service");
    } finally {
      setIsLoading(false);
    }
  }

  const handleClose = () => {
    resetForm();
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          handleClose();
          resetForm();
        }
        setOpen(value);
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
            New Service
          </button>
        )}
      </DialogTrigger>

      <DialogContent
        className="max-h-[94vh] max-w-md grid-rows-[auto,1fr,auto]"
        onOpenAutoFocus={(e) => e.preventDefault()}
        form
      >
        <DialogHeader className="border-b border-slate-200 pb-4">
          <DialogTitle className="text-xl font-semibold text-slate-900">
            {edit ? "Edit Service" : "Add New Service"}
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto px-1">
          <div className="space-y-3 py-3">
            {/* Service Name */}
            <div className="space-y-2">
              <label
                htmlFor="service-name"
                className="block text-sm font-medium text-slate-700"
              >
                Service Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="service-name"
                placeholder="Enter Service Name"
                value={name}
                onChange={(e) => {
                  const value = e.target.value;
                  setName(value);
                  // Clear error when user starts typing
                  if (value.trim()) {
                    setNameError("");
                    clearError();
                  }
                }}
                onBlur={() => setNameTouched(true)}
                className={`w-full px-4 py-2.5 text-sm border rounded-lg outline-none transition-all placeholder:text-slate-400 ${
                  nameError
                    ? "border-red-500 focus:border-red-600"
                    : "border-slate-300 focus:border-blue-500"
                }`}
                aria-invalid={nameError ? "true" : "false"}
                aria-describedby={nameError ? "name-error" : undefined}
              />
              {nameError && nameTouched && (
                <p
                  id="name-error"
                  className="flex items-center gap-1 text-xs text-red-600"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {nameError}
                </p>
              )}
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
                required={false}
                allowEdit={true}
                isClear
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label
                htmlFor="description"
                className="block text-sm font-medium text-slate-700"
              >
                Description
              </label>

              <textarea
                id="description"
                placeholder="Add any additional details about this service..."
                value={description}
                onChange={(e) => {
                  const value = e.target.value;

                  if (value.length > maxDescriptionLength) {
                    toast.error(
                      "Description must be less than 1500 characters",
                    );
                    return false;
                  }
                  setDescription(value);
                }}
                rows={5}
                className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 resize-none"
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  Provide a detailed description of what this service includes
                </p>
                <span
                  className={`text-xs ${
                    descriptionLength > maxDescriptionLength * 0.9
                      ? "text-red-600 font-medium"
                      : "text-slate-500"
                  }`}
                >
                  {descriptionLength}/{maxDescriptionLength}
                </span>
              </div>
            </div>

            {/* Info Box */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex gap-3">
                <svg
                  className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-blue-900 mb-1">
                    Service Information
                  </h4>
                  <p className="text-xs text-blue-700 leading-relaxed">
                    Services added here will be available in your canned
                    services list for quick selection when creating estimates.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-row justify-end gap-3   mt-auto">
          <DialogClose
            className="px-5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            onClick={handleClose}
          >
            Cancel
          </DialogClose>
          <button
            className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            onClick={edit ? handleEdit : handleSubmit}
            type="button"
            disabled={isLoading}
          >
            {isLoading && (
              <svg
                className="animate-spin h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            )}
            {isLoading
              ? "Processing..."
              : edit
                ? "Update Service"
                : "Add Service"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
