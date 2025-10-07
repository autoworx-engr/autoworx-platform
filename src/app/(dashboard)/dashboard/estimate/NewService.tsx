"use client";
import SelectCategory from "@/components/Lists/SelectCategory";
import { useEstimateCreateStore } from "@/stores/estimate-create";
import { useEstimatePopupStore } from "@/stores/estimate-popup";
import { useListsStore } from "@/stores/lists";
import { Category } from "@prisma/client";
import { useEffect, useState } from "react";
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
import { useFormErrorStore } from "@/stores/form-error";
import { errorToast, successToast } from "@/lib/toast";
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
  const { categories } = useListsStore();

  const { showError, clearError } = useFormErrorStore();

  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [category, setCategory] = useState<Category | undefined>();
  const [categoryError, setCategoryError] = useState("");
  const [description, setDescription] = useState("");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Reset form when dialog opens or closes
  useEffect(() => {
    if (open) {
      if (data?.service && data.edit) {
        setName(data.service.name);
        setCategory(
          categories.find((cat) => cat.id === data.service.categoryId)
        );
        setDescription(data.service.description);
      } else {
        resetForm();
      }
    }
  }, [open, data]);

  // Reset form function
  const resetForm = () => {
    setName("");
    setCategory(undefined);
    setDescription("");
    setNameError("");
    setCategoryError("");
    clearError();
  };

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

  const validateCategory = (category: Category | undefined) => {
    if (!category) {
      setCategoryError("Category is required");
      showError({
        field: "category",
        message: "Category is required",
      });
      return false;
    } else {
      setCategoryError("");
      clearError();
      return true;
    }
  };

  async function handleSubmit() {
    try {
      setIsLoading(true);

      // Validate both service name and category
      const isNameValid = validateName(name);
      const isCategoryValid = validateCategory(category);

      if (!isNameValid || !isCategoryValid) {
        setIsLoading(false);
        return;
      }

      const res = await newService({
        name,
        categoryId: category?.id, // Will be defined since we validated it
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
      // Validate both service name and category
      const isNameValid = validateName(name);
      const isCategoryValid = validateCategory(category);

      if (!isNameValid || !isCategoryValid) {
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
                categoryId: category?.id, // Will be defined since we validated it
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
          <button type="button" className="px-4 text-xs text-[#6571FF]">
            + New Service
          </button>
        )}
      </DialogTrigger>

      <DialogContent
        className="max-h-full max-w-md grid-rows-[auto,1fr,auto]"
        form
      >
        <DialogHeader>
          <DialogTitle>{edit ? "Edit Service" : "Add New Service"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5 py-5 md:p-5">
          <div className="flex flex-col">
            <input
              type="text"
              placeholder="Service Name*"
              value={name}
              onChange={(e) => {
                const value = e.target.value;

                if (value.length > 50) {
                  setNameError("Service name must be less than 50 characters");
                  return false;
                }
                setName(value);
                // Clear error when user starts typing
                if (value.trim()) {
                  setNameError("");
                  clearError();
                }
              }}
              onBlur={() => validateName(name)}
              className={`rounded-md border-2 ${
                nameError ? "border-red-500" : "border-slate-400"
              } p-2`}
              aria-invalid={nameError ? "true" : "false"}
              aria-describedby={nameError ? "name-error" : undefined}
            />
            {nameError && (
              <span id="name-error" className="mt-1 text-xs text-red-500">
                {nameError}
              </span>
            )}
          </div>

          <div className="flex flex-col">
            <SelectCategory
              onCategoryChange={(selectedCategory) => {
                setCategory(selectedCategory);
                // Clear error when category is selected
                if (selectedCategory) {
                  setCategoryError("");
                  clearError();
                }
              }}
              labelPosition="none"
              categoryData={category}
              categoryOpen={categoryOpen}
              setCategoryOpen={setCategoryOpen}
              required={true}
              onBlur={() => validateCategory(category)}
            />
            {categoryError && (
              <span className="mt-1 text-xs text-red-500">{categoryError}</span>
            )}
          </div>

          <textarea
            placeholder="Description"
            value={description}
            onChange={(e) => {
              const value = e.target.value;

              if (value.length > 250) {
                toast.error("Description must be less than 250 characters");
                return false;
              }
              setDescription(value);
            }}
            className="h-40 rounded-md border-2 border-slate-400 p-2"
          />
        </div>
        <DialogFooter className="flex justify-between gap-4 md:gap-0">
          <DialogClose
            className="rounded-lg border-2 border-slate-400 p-2"
            onClick={handleClose}
          >
            Cancel
          </DialogClose>
          <button
            className="rounded-lg bg-[#6571FF] p-2 text-white disabled:cursor-not-allowed disabled:opacity-50 md:px-5"
            onClick={edit ? handleEdit : handleSubmit}
            type="button"
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : "Done"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
