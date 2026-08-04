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
import { cn } from "@/lib/cn";
import { errorToast, successToast } from "@/lib/toast";
import { useFormErrorStore } from "@/stores/form-error";
import { useListsStore } from "@/stores/lists";
import { Category, InventoryProductType, Vendor } from "@prisma/client";
import { useEffect, useState } from "react";
import { createProduct } from "../../../../actions/inventory/create";
import { ProductFormFields } from "./ProductFormFields";

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
      : InventoryProductType.Product,
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
          : formattedError.message,
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
        : InventoryProductType.Product,
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
          bg-gradient-to-r from-primary to-[#5a66ee]
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
        className="max-h-[80%] w-[96%] max-w-xl grid-rows-[auto,1fr,auto] thin-scrollbar"
        form
      >
        <DialogHeader>
          <DialogTitle className="text-slate-600">Add New Product</DialogTitle>
        </DialogHeader>

        <FormError />

        <div className="gap-5 overflow-y-auto pl-1 space-y-2">
          <div className="space-y-2 grid grid-cols-1 md:grid-cols-2 gap-x-5">
            {isDatabase ? (
              <div>
                <label
                  className={cn(
                    "block font-medium text-slate-600",
                    `${product?.category && "py-1.5"}`,
                  )}
                >
                  Category
                </label>
                <div className="rounded-md border border-gray-300 bg-gray-100 px-3 py-2">
                  {product?.category || "No category selected"}
                </div>
              </div>
            ) : (
              <SelectCategory
                categoryData={category}
                onCategoryChange={(selectedCategory) => {
                  setCategory(selectedCategory);
                  clearError();
                }}
                categoryOpen={categoryOpen}
                setCategoryOpen={setCategoryOpen}
                required={false}
              />
            )}

            {/* Product Type */}
            <div className={`${isDatabase ? "hidden" : "block"}`}>
              <label className="font-medium text-slate-600">Product Type</label>
              <div className="mt-1 flex gap-5">
                <div>
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
                <div>
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

            <SlimInput
              name="productName"
              required
              placeholder="Brake Pad Set"
              value={isDatabase ? databaseName : productName}
              onChange={(e) => {
                const value = e.target.value;
                if (isDatabase) {
                  setDatabaseName(value);
                } else {
                  setProductName(value);
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

            <div className="space-y-2">
              <label className="font-medium text-slate-600">
                Vendor <span className="text-red-500">*</span>
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
                      clearError();
                    }}
                    button={
                      <button
                        type="button"
                        className="text-xs text-primary hover:underline"
                      >
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
                        search.toLowerCase(),
                      ),
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

          <div className="py-2 md:py-0">
            <label className="font-medium text-slate-600">Description</label>
            <p className="text-xs text-slate-500 mb-1">
              Description must be less than 250 characters
            </p>
            <textarea
              name="description"
              required={false}
              placeholder="High-performance ceramic brake pads for front axle..."
              minLength={20}
              maxLength={250}
              className={cn(
                "h-20 w-full rounded-md border border-slate-300 outline-none bg-background px-2 py-0.5 leading-6 transition-all duration-300 thin-scrollbar",
                "bg-white/80 backdrop-blur-sm dark:bg-slate-900/50",
                "text-slate-600 dark:text-slate-300 placeholder:text-slate-400",
                "focus:border-primary/60 focus:ring-2 focus:ring-primary/40",
                "disabled:opacity-50 disabled:cursor-not-allowed",
              )}
            />
          </div>

          <ProductFormFields cols={4}>
            <SlimInput
              name="quantity"
              type="number"
              required
              placeholder="e.g. 100"
              value={quantity}
              onChange={handleQuantityChange}
            />
            <SlimInput
              name="price"
              type="number"
              required
              placeholder="e.g. 49.99"
              value={price}
              onChange={handlePriceChange}
            />
            <SlimInput
              name="unit"
              required
              placeholder="pcs, kg, ft"
              value={isDatabase ? databaseUnit : unit}
              onChange={handleUnitChange}
            />
            <SlimInput
              name="lot"
              label="Lot#"
              required={false}
              placeholder="LOT-2024-001"
            />
          </ProductFormFields>

          <div>
            <SlimInput
              name="receipt"
              label="Receipt#"
              required={false}
              placeholder="REC-00123"
            />
          </div>

          <div className="mt-5 rounded-md bg-[#6571FF5E] p-2 md:mt-0">
            <p className="font-semibold">Quantity for Low Inventory</p>
            <i className="text-xs">(Leave blank to disable notifications)</i>
            <SlimInput
              name="lowInventory"
              label={""}
              type="number"
              placeholder="e.g. 10"
              required={false}
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose
            className="
                rounded-xl mt-2 sm:mt-0 px-5 py-2.5 text-sm font-medium text-slate-500 
                hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800
                transition-colors border
              "
          >
            Cancel
          </DialogClose>
          <Submit
            className="
                rounded-xl px-6 py-2.5 text-sm font-medium text-white
                bg-gradient-to-r from-primary to-[#5a66ee]
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
