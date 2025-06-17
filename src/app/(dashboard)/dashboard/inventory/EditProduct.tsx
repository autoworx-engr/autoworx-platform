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
import { useListsStore } from "@/stores/lists";
import {
  Category,
  InventoryProduct,
  InventoryProductType,
  Vendor,
} from "@prisma/client";
import { useEffect, useState } from "react";
import { CiEdit } from "react-icons/ci";
import { editProduct } from "../../../../actions/inventory/edit";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { errorToast } from "@/lib/toast";
import { useFormErrorStore } from "@/stores/form-error";

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
    const categoryId = category?.id as number;
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

    // Category validation
    if (!category) {
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
    } else if (/^\d+$/.test(unit.trim())) {
      showError({
        field: "unit",
        message: "Unit must be text and cannot be numbers only.",
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
            <CiEdit />
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
            <DialogTitle>Edit product</DialogTitle>
          </DialogHeader>

          <FormError />

          <div className="grid-cols-2 gap-5 overflow-y-auto md:grid">
            <div>
              <SelectCategory
                categoryData={category}
                onCategoryChange={(selectedCategory) => {
                  setCategory(selectedCategory);
                  clearError();
                }}
                categoryOpen={categoryOpen}
                setCategoryOpen={setCategoryOpen}
                required={true}
              />
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
              <div>
                <label>
                  Vendor
                  <span className="ml-1 text-red-500">*</span>
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
                          className="text-xs text-[#6571FF]"
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
              <label>Description</label>
              <textarea
                onChange={handleChange}
                name="description"
                required={false}
                className="h-28 w-full rounded-sm border border-primary-foreground border-slate-400 bg-background px-2 py-0.5 leading-6 md:w-[95%]"
                value={product.description as string}
              />

              <div>
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

            {/* Desktop screen */}
            <div className="col-span-3 mt-5 hidden w-full flex-wrap gap-5 md:flex md:w-[90%] md:flex-nowrap">
              <SlimInput
                onChange={handleChange}
                value={product.price as number}
                name="price"
                type="number"
                required={false}
              />
              <SlimInput
                onChange={handleChange}
                value={product.unit as string}
                name="unit"
                type="text"
                required={false}
              />
              <SlimInput
                onChange={handleChange}
                value={product.lot as string}
                name="lot"
                label="Lot#"
                required={false}
              />
            </div>
            {/* mobile screen */}
            <div className="block md:hidden">
              <SlimInput
                onChange={(e) => {
                  const value = e.target.value;
                  const numericValue = parseFloat(value);

                  // Clear previous errors if value is valid
                  if (!isNaN(numericValue)) {
                    clearError();
                  }

                  // Update the product price
                  setProduct((prevProduct) => ({
                    ...prevProduct,
                    price: numericValue,
                  }));

                  // Show error if value is empty or invalid
                  if (!value.trim() || isNaN(numericValue)) {
                    showError({
                      field: "price",
                      message: "Price is required and must be a valid number.",
                    });
                  }
                }}
                value={product.price as number}
                name="price"
                type="number"
                required
              />
              <SlimInput
                onChange={handleChange}
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
            </div>
            <div>
              <SlimInput
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
            <DialogClose className="rounded-lg border-2 border-slate-400 p-2">
              Cancel
            </DialogClose>
            <Submit
              className="mb-2 flex items-center justify-center rounded-lg border bg-[#6571FF] px-5 py-2 text-white md:mb-0"
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
