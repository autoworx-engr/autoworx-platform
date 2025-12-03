"use client";

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
import NewVendor from "@/components/Lists/NewVendor";
import SelectCategory from "@/components/Lists/SelectCategory";
import Selector from "@/components/Selector";
import { SlimInput } from "@/components/SlimInput";
import Submit from "@/components/Submit";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { errorToast, successToast } from "@/lib/toast";
import { useFormErrorStore } from "@/stores/form-error";
import { useListsStore } from "@/stores/lists";
import { Category, InventoryProductType, Vendor } from "@prisma/client";
import { useEffect, useState } from "react";
import { createProduct } from "../../../../actions/inventory/create";

type ProductProps = {
  product?: {
    productName?: string;
    unit?: string;
    category?: string;
  };
  isDatabase?: boolean;
  view?: string;
};

export default function AddNewProduct({
  product,
  isDatabase,
  view,
}: ProductProps) {
  const [open, setOpen] = useState(false);
  const { vendors } = useListsStore();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [category, setCategory] = useState<Category | null>();
  const [vendorOpen, setVendorOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const { showError, clearError } = useFormErrorStore();
  // const search = useSearchParams()

  // const view = search.get("view") ?? "database"

  // Validation states
  const [productName, setProductName] = useState("");
  const [productNameError, setProductNameError] = useState("");
  const [databaseName, setDatabaseName] = useState(product?.productName || "");
  const [databaseUnit, setDatabaseUnit] = useState(product?.unit || "");
  // New state for product type
  const [productType, setProductType] = useState<InventoryProductType>(
    view === "supply"
      ? InventoryProductType.Supply
      : InventoryProductType.Product
  );

  // New validation states for numeric fields
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("");

  async function handleSubmit(data: FormData) {
    // Clear all errors before validation
    clearError();

    // Get form values
    const name = data.get("productName") as string;
    const description = data.get("description") as string;
    const priceValue = data.get("price") as string;
    const categoryId = category?.id;
    const quantityValue = data.get("quantity") as string;
    const unitValue = data.get("unit") as string;
    const lot = data.get("lot") as string;
    const type = (data.get("type") as InventoryProductType) || productType;
    const receipt = data.get("receipt") as string;
    const lowInventory = data.get("lowInventory") as string;

    // Validation flag
    let hasError = false;

    // Product name validation
    if (!name.trim()) {
      showError({
        field: "productName",
        message: "Product Name is required.",
      });
      hasError = true;
    }

    // Category validation
    if (!isDatabase && !category) {
      showError({
        field: "category",
        message: "Category is required.",
      });
      hasError = true;
    }

    // Vendor validation
    if (!vendor) {
      showError({
        field: "vendor",
        message: "Vendor is required.",
      });
      hasError = true;
    }

    // Type validation (Product/Supply)
    if (!type) {
      showError({
        field: "type",
        message: "Please select either Products or Supplies.",
      });
      hasError = true;
    }

    // Quantity validation
    if (!quantityValue || quantityValue.trim() === "") {
      showError({
        field: "quantity",
        message: "Quantity is required.",
      });
      hasError = true;
    } else if (isNaN(Number(quantityValue)) || Number(quantityValue) <= 0) {
      showError({
        field: "quantity",
        message: "Quantity must be a positive number.",
      });
      hasError = true;
    }

    if (quantity) {
      if (quantity.length > 8) {
        showError({
          field: "quantity",
          message: "Quantity must be less than 8 characters",
        });

        hasError = true;
      }
    }

    // Price validation
    if (!priceValue || priceValue.trim() === "") {
      showError({
        field: "price",
        message: "Price is required.",
      });
      hasError = true;
    } else if (isNaN(Number(priceValue)) || Number(priceValue) <= 0) {
      showError({
        field: "price",
        message: "Price must be a positive number.",
      });
      hasError = true;
    }

    // Unit validation
    if (!unitValue || unitValue.trim() === "") {
      showError({
        field: "unit",
        message: "Unit is required.",
      });
      hasError = true;
    } else if (/\d/.test(unitValue.trim())) {
      showError({
        field: "unit",
        message: "Unit cannot contain any numbers.",
      });
      hasError = true;
    }

    if (description) {
      if (description.length < 20) {
        showError({
          field: "description",
          message: "Description must be greater than 20 characters",
        });

        hasError = true;
      }
      if (description.length > 250) {
        showError({
          field: "description",
          message: "Description must be less than 250 characters",
        });

        hasError = true;
      }
    }

    // If any validation error, stop form submission
    if (hasError) {
      return;
    }
    // Calculate per-unit price
    let perUnitPrice = 0;
    if (Number(quantityValue) > 0) {
      perUnitPrice = Number(priceValue) / Number(quantityValue);
    }

    if (!perUnitPrice) perUnitPrice = 0;
    const roundedPerUnitPrice = parseFloat(perUnitPrice.toFixed(2));
    try {
      const res = await createProduct({
        name,
        description,
        price: roundedPerUnitPrice,
        categoryId,
        categoryName: product ? product?.category : category?.name,
        vendorId: vendor?.id,
        quantity: Number(quantityValue)?.toString(),
        unit: product ? databaseUnit : unitValue,
        lot,
        type,
        receipt,
        lowInventoryAlert: lowInventory ? Number(lowInventory) : undefined,
        isDatabase: true,
      });

      if (res.type === "success") {
        setOpen(false);
        clearError();
        successToast("Product created successfully");
      } else if (res.type === "globalError") {
        showError({
          field: res.field ?? "all",
          message:
            res.errorSource && res.errorSource?.length > 0
              ? res.errorSource[0].message
              : res.message,
        });
      } else if (res.type === "error") {
        showError({
          field: res.field,
          message: res.message || "Failed to create product",
        });
      }
    } catch (error) {
      const formattedError = errorHandler(error);
      errorToast(
        formattedError.errorSource && formattedError.errorSource.length > 0
          ? formattedError.errorSource[0].message
          : formattedError.message
      );
    }
  }

  useEffect(() => setVendorOpen(false), [categoryOpen]);
  useEffect(() => setCategoryOpen(false), [vendorOpen]);

  const handleAddNewProduct = () => {
    setProductName("");
    setProductNameError("");
    setVendor(null);
    setCategory(null);
    setProductType(
      view === "supplies"
        ? InventoryProductType.Supply
        : InventoryProductType.Product
    );
    setQuantity("");
    setPrice("");
    setUnit("");
    clearError();
  };

  const handleClose = () => {
    clearError();
    setOpen(false);
  };

  // Validation handlers for numeric fields
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuantity(value);

    if (!value) {
      showError({
        field: "quantity",
        message: "Quantity is required.",
      });
    } else if (isNaN(Number(value)) || Number(value) <= 0) {
      showError({
        field: "quantity",
        message: "Quantity must be a positive number.",
      });
    } else {
      clearError();
    }
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPrice(value);

    if (!value) {
      showError({
        field: "price",
        message: "Price is required.",
      });
    } else if (isNaN(Number(value)) || Number(value) <= 0) {
      showError({
        field: "price",
        message: "Price must be a positive number.",
      });
    } else {
      clearError();
    }
  };

  const handleUnitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    if (isDatabase) {
      setDatabaseUnit(value);
    } else {
      setUnit(value);
    }

    // Validation
    if (!value) {
      showError({
        field: "unit",
        message: "Unit is required.",
      });
    } else if (/\d/.test(value.trim())) {
      showError({
        field: "unit",
        message: "Unit cannot contain any numbers.",
      });
    } else if (value.length > 10) {
      showError({
        field: "unit",
        message: "Unit must be less than 10 characters",
      });
    } else {
      clearError();
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) handleClose();
        setOpen(isOpen);
      }}
    >
      <DialogTrigger asChild>
        <button
          onClick={handleAddNewProduct}
          className="
          flex items-center justify-center gap-2 w-full text-center rounded-lg px-5 py-2.5 text-sm font-semibold text-white
          bg-gradient-to-r from-[#6571FF] to-[#5a66ee]
          shadow-[0_4px_14px_0_rgba(101,113,255,0.39)]
          hover:shadow-[0_6px_20px_rgba(101,113,255,0.23)]
          hover:-translate-y-0.5
          active:translate-y-0 active:scale-100
          transition-all duration-300 ease-in-out"
        >
          Add New Product
        </button>
      </DialogTrigger>
      <DialogContent
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="max-h-[80%] max-w-[96%] grid-rows-[auto,1fr,auto] md:max-w-xl lg:max-w-3xl"
        form
      >
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
        </DialogHeader>

        <FormError />

        <div className="grid-cols-2 gap-5 overflow-y-auto md:grid">
          <div className="space-y-2">
            {isDatabase ? (
              // Display a non-editable field when isDatabase is true
              <div>
                <label className="block font-medium">Category</label>

                <div className="rounded-md border border-gray-300 bg-gray-100 px-3 py-2">
                  {product?.category || "No category selected"}
                </div>
              </div>
            ) : (
              // Render SelectCategory when isDatabase is false
              <SelectCategory
                onCategoryChange={(selectedCategory) => {
                  setCategory(selectedCategory);
                  clearError();
                }}
                categoryOpen={categoryOpen}
                setCategoryOpen={setCategoryOpen}
                required={true}
              />
            )}
            <SlimInput
              name="productName"
              required
              value={isDatabase ? databaseName : productName}
              onChange={(e) => {
                const value = e.target.value;
                if (isDatabase) {
                  setDatabaseName(value); // Update name when isDatabase is true
                } else {
                  setProductName(value); // Update productName otherwise
                }

                if (!value.trim()) {
                  showError({
                    field: "productName",
                    message: "Product name is required.",
                  });
                } else {
                  clearError();
                }
              }}
            />

            <div className="mt-2">
              <label>
                Vendor
                <span className="ml-1 text-red-500">*</span>
              </label>

              <Selector
                label={(vendor: Vendor | null) =>
                  vendor
                    ? vendor.companyName || "No company found"
                    : "Select Vendor"
                }
                newButton={
                  <NewVendor
                    bgShadow={false}
                    afterSubmit={(ven) => {
                      setVendor(ven);
                      // setVendorOpen(false);
                      clearError();
                    }}
                    button={
                      <button type="button" className="text-xs text-[#6571FF]">
                        + New Vendor
                      </button>
                    }
                  />
                }
                items={vendors}
                displayList={(vendor: Vendor) => (
                  <p>{vendor?.companyName || vendor.name}</p>
                )}
                onSearch={(search: string) =>
                  vendors.filter(
                    (vendor) =>
                      vendor?.companyName
                        ?.toLowerCase()
                        ?.includes(search.toLowerCase()) ||
                      (vendor?.name?.toLowerCase() || "").includes(
                        search.toLowerCase()
                      )
                  )
                }
                openState={[vendorOpen, setVendorOpen]}
                selectedItem={vendor}
                setSelectedItem={(selectedVendor) => {
                  setVendor(selectedVendor);
                  if (selectedVendor) clearError();
                }}
              />
            </div>
          </div>
          <div className="w-full py-2 md:py-0">
            <label>Description</label>
            <p className="text-xs">
              Description must be less than 250 characters
            </p>
            <textarea
              name="description"
              required={false}
              minLength={20}
              maxLength={150}
              className="h-28 w-full rounded-sm border border-primary-foreground border-slate-400 bg-background px-2 py-0.5 leading-6 md:w-[95%]"
            />
            <div>
              <div className={`${isDatabase ? "hidden" : "block"} `}>
                <input
                  id="product"
                  type="radio"
                  name="type"
                  value={InventoryProductType.Product}
                  checked={productType === InventoryProductType.Product}
                  onChange={() => {
                    setProductType(InventoryProductType.Product);
                    clearError();
                  }}
                  className="mr-1"
                />
                <label htmlFor="product">Products</label>
              </div>
              <div className={`${isDatabase ? "hidden" : "block"} `}>
                <input
                  id="supply"
                  type="radio"
                  name="type"
                  value={InventoryProductType.Supply}
                  checked={productType === InventoryProductType.Supply}
                  onChange={() => {
                    setProductType(InventoryProductType.Supply);
                    clearError();
                  }}
                  className="mr-1"
                />
                <label htmlFor="supply">Supplies</label>
              </div>
            </div>
          </div>
          <div className="col-span-3 mt-5 hidden w-[90%] flex-wrap gap-5 md:flex-nowrap lg:flex">
            <SlimInput
              name="quantity"
              type="number"
              required
              value={quantity}
              onChange={handleQuantityChange}
            />

            <SlimInput
              name="price"
              type="number"
              required
              value={price}
              onChange={handlePriceChange}
            />

            <SlimInput
              name="unit"
              required
              value={isDatabase ? databaseUnit : unit}
              onChange={handleUnitChange}
            />
            <SlimInput name="lot" label="Lot#" required={false} />
          </div>
          <div>
            <SlimInput name="receipt" label="Receipt#" required={false} />
          </div>

          {/* mobile form */}
          <div className="mt-5 block space-y-2 md:hidden">
            <SlimInput
              name="quantity"
              type="number"
              required
              value={quantity}
              onChange={handleQuantityChange}
            />

            <SlimInput
              name="price"
              type="number"
              required
              value={price}
              onChange={handlePriceChange}
            />

            <SlimInput
              name="unit"
              required
              value={isDatabase ? databaseUnit : unit}
              onChange={handleUnitChange}
            />
            <SlimInput name="lot" label="Lot#" required={false} />
          </div>
          <div className="mt-5 rounded-md bg-[#6571FF5E] p-2 md:mt-0">
            <p className="font-semibold">Quantity for Low Inventory</p>
            <i className="text-xs">(Leave blank to disable notifications)</i>
            <SlimInput
              name="lowInventory"
              label={""}
              type="number"
              required={false}
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose className="rounded-lg px-5 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors border">
            Cancel
          </DialogClose>
          <Submit
            className="
              rounded-lg px-6 py-2.5 text-sm font-medium text-white
              bg-gradient-to-r from-[#6571FF] to-[#5a66ee]
              shadow-lg shadow-indigo-500/30
              hover:shadow-xl hover:shadow-indigo-500/40
              hover:-translate-y-0.5 hover:scale-[1.02]
              active:translate-y-0 active:scale-100
              transition-all duration-200
            "
            formAction={handleSubmit}
          >
            Add
          </Submit>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
