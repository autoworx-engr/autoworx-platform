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
import {
  Category,
  InventoryProduct,
  InventoryProductType,
  Vendor,
} from "@prisma/client";
import { PencilLineIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { editProduct } from "../../../../actions/inventory/edit";
import { ProductFormFields } from "./ProductFormFields";

type TProps = {
  productData: InventoryProduct & { category: Category; vendor: Vendor };
};

type TInputType = {
  productName: string | null;
  description: string | null;
  price: number | null;
  unit: string | null;
  lot: string | null;
  type: InventoryProductType;
  receipt: string | null;
  lowInventory: number | null;
};

export default function EditProduct({ productData }: TProps) {
  const [open, setOpen] = useState(false);
  const { vendors } = useListsStore(); // useful
  const [vendor, setVendor] = useState<Vendor | null>(productData.vendor);
  const [category, setCategory] = useState<Category | null>(
    productData.category,
  );

  const { showError, clearError } = useFormErrorStore();
  const [vendorOpen, setVendorOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);

  const [product, setProduct] = useState<TInputType>({
    productName: productData.name,
    description: productData.description,
    price: Number(productData.price) as number,
    unit: productData.unit,
    lot: productData.lot,
    type: productData.type,
    receipt: productData.receipt,
    lowInventory: productData.lowInventoryAlert,
  });

  useEffect(() => setVendorOpen(false), [categoryOpen]);
  useEffect(() => setCategoryOpen(false), [vendorOpen]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const name = e.target.name as string;
    const value = e.target.value as string;
    setProduct({ ...product, [name]: value });
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numericValue = parseFloat(value);
    if (!isNaN(numericValue)) clearError();
    setProduct((prev) => ({ ...prev, price: numericValue }));
    if (!value.trim() || isNaN(numericValue)) {
      showError({
        field: "price",
        message: "Price is required and must be a valid number.",
      });
    }
  };

  const handleUnitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setProduct({ ...product, unit: value });
    if (!value.trim()) {
      showError({ field: "unit", message: "Unit is required." });
    } else if (/\d/.test(value.trim())) {
      showError({ field: "unit", message: "Unit cannot contain any numbers." });
    } else {
      clearError();
    }
  };

  async function handleSubmit() {
    // Add validation check first
    if (!product.productName?.trim()) {
      showError({
        field: "productName",
        message: "Product name is required.",
      });
      return; // Stop submission if validation fails
    }

    const name = product.productName as string;
    const description = product.description as string;
    const price = Number(product.price) as number;
    const categoryId = category?.id ?? null;
    const unit = product.unit as string;
    const lot = product.lot as string;
    const type = product.type as InventoryProductType;
    const receipt = product.receipt as string;
    const lowInventory = Number(product.lowInventory) as number;
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

    // Price validation
    if (price === undefined || price === null) {
      showError({
        field: "price",
        message: "Price is required.",
      });
      hasError = true;
    } else if (isNaN(Number(price)) || Number(price) < 0) {
      showError({
        field: "price",
        message: "Price must be a valid number.",
      });
      hasError = true;
    }

    // Unit validation
    if (!unit || unit.trim() === "") {
      showError({
        field: "unit",
        message: "Unit is required.",
      });
      hasError = true;
    } else if (/\d/.test(unit.trim())) {
      showError({
        field: "unit",
        message: "Unit cannot contain any numbers.",
      });
      hasError = true;
    }

    // If any validation error, stop form submission
    if (hasError) {
      return;
    }

    try {
      const res = await editProduct({
        id: productData.id,
        name,
        description,
        price,
        categoryId,
        vendorId: vendor?.id,
        unit: unit,
        lot,
        type,
        receipt,
        lowInventoryAlert: lowInventory,
      });

      if (res.type === "success") {
        setOpen(false);
        clearError();
        successToast("Product updated successfully");
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
    } catch (err) {
      const formattedError = errorHandler(err);
      errorToast(
        formattedError.errorSource && formattedError.errorSource.length > 0
          ? formattedError.errorSource[0].message
          : formattedError.message,
      );
    }
  }
  const handleClose = () => {
    clearError();
    setOpen(false);
  };
  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(isOpen) => {
          if (!isOpen) handleClose();
          setOpen(isOpen);
        }}
      >
        <div>
          <DialogTrigger asChild>
            <PencilLineIcon className="w-5 h-5" />
          </DialogTrigger>
        </div>
        {/* <div className="block md:hidden">
          <DialogTrigger>Edit Profile</DialogTrigger>
        </div>   */}
        <DialogContent
          className="max-h-[80%] w-[96%] max-w-xl grid-rows-[auto,1fr,auto]"
          form
        >
          <DialogHeader>
            <DialogTitle className="text-slate-600">Edit product</DialogTitle>
          </DialogHeader>

          <FormError />

          <div className="gap-5 overflow-y-auto pl-1 space-y-2">
            <div className="space-y-2 grid grid-cols-1 md:grid-cols-2 gap-x-5">
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

              {/* radio buttons for product type */}
              <div>
                <label className="font-medium text-slate-600">
                  Product Type
                </label>
                <div className="mt-1 flex gap-5">
                  <div>
                    <input
                      id="product"
                      type="radio"
                      name="type"
                      value={InventoryProductType.Product}
                      onChange={handleChange}
                      className="mr-1"
                      checked={product.type === InventoryProductType.Product}
                    />
                    <label htmlFor="product">Products</label>
                  </div>
                  <div>
                    <input
                      id="supply"
                      type="radio"
                      name="type"
                      value={InventoryProductType.Supply}
                      onChange={handleChange}
                      className="mr-1"
                      checked={product.type === InventoryProductType.Supply}
                    />
                    <label htmlFor="supply">Supplies</label>
                  </div>
                </div>
              </div>

              <SlimInput
                value={product.productName as string}
                name="productName"
                required
                onChange={(e) => {
                  const value = e.target.value;
                  // Update the product state
                  setProduct({ ...product, productName: value });

                  // Use your existing error system
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
                      ? vendor?.companyName ||
                        vendor.name ||
                        `Vendor ${vendor.id}`
                      : "Vendor"
                  }
                  newButton={
                    <NewVendor
                      afterSubmit={(ven) => {
                        setVendor(ven);
                        setVendorOpen(false);
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
                  displayList={(vendor: Vendor) => (
                    <p>{vendor?.companyName || vendor.name}</p>
                  )}
                  openState={[vendorOpen, setVendorOpen]}
                  selectedItem={vendor}
                  setSelectedItem={setVendor}
                />
              </div>
            </div>

            <div className="py-2 md:py-0">
              <label className="font-medium text-slate-600">Description</label>
              <textarea
                onChange={handleChange}
                name="description"
                required={false}
                className={cn(
                  "h-20 w-full rounded-md border border-slate-300 outline-none bg-background px-2 py-0.5 leading-6 transition-all duration-300 mt-1",
                  "bg-white/80 backdrop-blur-sm dark:bg-slate-900/50", // Subtle glass texture
                  "text-slate-600 dark:text-slate-300 placeholder:text-slate-400",
                  "focus:border-primary/60 focus:ring-2 focus:ring-primary/40", // Brand focus state
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                )}
                value={product.description as string}
              />
            </div>

            <ProductFormFields cols={3}>
              <SlimInput
                onChange={handlePriceChange}
                value={product.price as number}
                name="price"
                type="number"
                required
              />
              <SlimInput
                onChange={handleUnitChange}
                value={product.unit as string}
                name="unit"
                type="text"
                required
              />
              <SlimInput
                onChange={handleChange}
                value={product.lot as string}
                name="lot"
                label="Lot#"
                required={false}
              />
            </ProductFormFields>
            <div>
              <SlimInput
                type="text"
                onChange={handleChange}
                value={product.receipt as string}
                name="receipt"
                label="Receipt#"
                required={false}
              />
            </div>
            <div className="mt-5 rounded-md bg-[#6571FF5E] p-2 md:mt-0">
              <p className="font-semibold">Quantity for Low Inventory</p>
              <i className="text-xs">(Leave blank to disable notifications)</i>
              <SlimInput
                name="lowInventory"
                label={""}
                type="number"
                required={false}
                value={product.lowInventory as number}
                onChange={handleChange}
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
              Update
            </Submit>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
