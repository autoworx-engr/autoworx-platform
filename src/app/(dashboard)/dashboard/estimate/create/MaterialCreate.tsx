import ClearSelectionButton from "@/components/Lists/ClearSelectionButton";
import NewVendor from "@/components/Lists/NewVendor";
// import SelectCategory from "@/components/Lists/SelectCategory";
import SelectCategory from "@/components/Lists/CreateEstimateCategory";
import Selector from "@/components/Selector";
import { useEstimateCreateStore } from "@/stores/estimate-create";
import { useEstimatePopupStore } from "@/stores/estimate-popup";
import { useListsStore } from "@/stores/lists";
import { Category, Tag, Vendor } from "@prisma/client";
import React, { useEffect, useState } from "react";
import { newMaterial } from "@/actions/estimate/material/newMaterial";
import Close from "./CloseEstimate";
import { errorToast } from "@/lib/toast";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import Decimal from "decimal.js";
import { Plus } from "lucide-react";
import { slimInputClassName } from "@/components/SlimInput";
import { cn } from "@/lib/cn";
import {
  validateMaterial,
  type MaterialField,
  type MaterialFieldErrors,
} from "./materialValidation";

const MAX_MONEY_VALUE = 99999999;

export type EstimateMaterial = {
  id: number;
  name: string;

  // money / numbers
  discount: Decimal | null;
  quantity: Decimal | null;
  cost: Decimal | null;
  sell: Decimal | null;

  // relationships
  companyId: number;
  invoiceId: string | null;
  invoiceTemplateId: string | null;
  invoiceItemId: number | null;
  productId: number | null;
  vendorId: number | null;
  categoryId: number | null;

  // metadata
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export default function MaterialCreate() {
  const {
    categories,
    vendors,
    materials: inventoryMaterials,
  } = useListsStore();

  const { currentSelectedCategoryId } = useEstimateCreateStore();

  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category | null>(null);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [notes, setNotes] = useState<string>("");
  const [quantity, setQuantity] = useState<number>();
  const [cost, setCost] = useState<number>();
  const [sell, setSell] = useState<number>();
  const [discount, setDiscount] = useState<number>();
  const [addToInventory, setAddToInventory] = useState<boolean>(false);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [errors, setErrors] = useState<MaterialFieldErrors>({});

  // Drop a field's error as soon as the user edits it, so the form stops
  // shouting about something that's already been fixed.
  const clearFieldError = (field: MaterialField) =>
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });

  const { close, data } = useEstimatePopupStore();
  const itemId = data?.itemId;
  const materialIndex = data?.materialIndex;

  /**
   * Returns null when the form is invalid. The offending fields get a red
   * border, and the first problem is surfaced as a toast — validateMaterial
   * returns its errors in field order, so the toast follows the visual order.
   * On success it returns the narrowed values, so callers don't have to
   * re-assert that the required numbers are actually present.
   */
  const validateForm = () => {
    const nextErrors = validateMaterial(
      { name, quantity, cost, sell },
      { maxMoneyValue: MAX_MONEY_VALUE, isEdit: !!data.edit },
    );
    setErrors(nextErrors);

    const [firstError] = Object.values(nextErrors);
    if (firstError) {
      errorToast(firstError, { id: "material-validation" });
      return null;
    }

    // `inventoryError` stays advisory (shown inline only) — it doesn't block
    // submit, same as before this change.
    return { quantity: quantity as number };
  };

  // const [vendorSearch, setVendorSearch] = useState("");
  const [vendorOpen, setVendorOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);

  // const { actionType } = useActionStoreCreateEdit();

  const selectedInventoryMaterial = inventoryMaterials.find(
    (m) => m.name.toLowerCase() === name.toLowerCase(),
  );

  useEffect(() => {
    if (selectedInventoryMaterial) {
      const available = Number(selectedInventoryMaterial.quantity || 0);
      if (quantity && quantity > available) {
        setInventoryError(
          `Insufficient inventory. Only ${available} available.`,
        );
      } else if (available === 0) {
        setInventoryError("Out of stock (0 available).");
      } else {
        setInventoryError(null);
      }
    } else {
      setInventoryError(null);
    }
  }, [quantity, selectedInventoryMaterial]);

  useEffect(() => {
    // Opening the popup for a different material must not inherit the previous
    // one's validation errors.
    setErrors({});

    if (data.material && data.edit) {
      setName(data.material.name);
      const category = data.material.categoryId
        ? categories.find((cat) => cat.id === data.material.categoryId)!
        : null;
      setCategory(category);

      const vendor = data.material.vendorId
        ? vendors.find((ven) => ven.id === data.material.vendorId)!
        : null;
      setVendor(vendor);
      setTags(data.material.tags || []);
      setNotes(data.material.notes || "");
      const quantityValue =
        data.material.quantity === 0 ? undefined : data.material.quantity;
      setQuantity(quantityValue);
      const costValue = Math.min(
        parseFloat(data.material.cost),
        MAX_MONEY_VALUE,
      );
      setCost(costValue === 0 ? undefined : costValue);
      const sellValue = Math.min(
        parseFloat(data.material.sell),
        MAX_MONEY_VALUE,
      );
      setSell(sellValue === 0 ? undefined : sellValue);
      const discountValue = Math.min(
        parseFloat(data.material.discount),
        MAX_MONEY_VALUE,
      );
      setDiscount(discountValue === 0 ? undefined : discountValue);
      setAddToInventory(data.material.addToInventory || false);
      // @ts-ignore
      useEstimateCreateStore.setState((state) => {
        const items = state.items.map((item) => {
          if (item.id === itemId) {
            const materials = item.materials.map((material, i) => {
              if (i === materialIndex) {
                return {
                  ...material,
                  name: data.material.name,
                  categoryId: category?.id ?? null,
                  vendorId: vendor?.id ?? null,
                  tags: data.material.tags,
                  notes: data.material.notes,
                  quantity: quantityValue || 0,
                  cost: Number(costValue || 0) as any,
                  sell: Number(sellValue || 0) as any,
                  discount: Number(discountValue || 0) as any,
                  addToInventory: data.material.addToInventory,
                };
              }
              return material;
            });

            return {
              ...item,
              materials,
            };
          }
          return item;
        });
        return { items };
      });
    } else {
      setName("");
      setCategory(null);
      setVendor(null);
      setTags([]);
      setNotes("");
      setQuantity(undefined);
      setCost(undefined);
      setSell(undefined);
      setDiscount(undefined);
      setAddToInventory(false);
    }
  }, [data]);

  useEffect(() => {
    if (currentSelectedCategoryId) {
      setCategory(
        categories.find((cat) => cat.id === currentSelectedCategoryId)!,
      );
    }
  }, [currentSelectedCategoryId]);

  async function handleSubmit() {
    const valid = validateForm();
    if (!valid) return;
    const { quantity: validQuantity } = valid;

    // If addToInventory is true, add to database, otherwise just add to state
    if (addToInventory) {
      try {
        const res = await newMaterial({
          name,
          categoryId: category?.id ?? undefined,
          vendorId: vendor?.id ?? undefined,
          tags,
          notes,
          quantity: quantity || 0,
          cost: cost || 0,
          sell: sell || 0,
          discount: discount || 0,
          addToInventory,
        });

        if (res.type === "success") {
          const {
            id,
            companyId,
            productId,
            invoiceId,
            invoiceItemId,
            updatedAt,
            createdAt,
          } = res.data;
          // Change the service where itemId is the same and materialIndex is the same

          useEstimateCreateStore.setState((state) => {
            const items = state.items.map((item) => {
              if (item.id === itemId) {
                let materials = item.materials;
                if (materials.length === 0) {
                  console.log("inside if");
                  materials = [
                    {
                      id: id,
                      name,
                      categoryId: category?.id || null,
                      vendorId: vendor?.id || null,
                      // @ts-ignore: ignore for now
                      tags,
                      notes,
                      quantity: Decimal(validQuantity) || 0,
                      cost: Number(cost || 0) as any,
                      sell: Number(sell || 0) as any,
                      discount: Number(discount || 0) as any,
                      addToInventory,
                      createdAt: updatedAt,
                      productId: productId,
                      invoiceId: invoiceId,
                      invoiceItemId: invoiceItemId,
                      updatedAt: createdAt,
                      companyId: companyId,
                    },
                  ];
                } else {
                  console.log("inside else");
                  materials = materials.map((material: any, i) => {
                    if (i === materialIndex) {
                      return {
                        id,
                        name,
                        categoryId: category?.id || null,
                        vendorId: vendor?.id || null,
                        tags,
                        notes,
                        quantity: Decimal(validQuantity) || 0,
                        cost: Number(cost || 0) as any,
                        sell: Number(sell || 0) as any,
                        discount: Number(discount || 0) as any,
                        addToInventory,
                        createdAt,
                        productId,
                        invoiceId,
                        invoiceItemId,
                        updatedAt,
                        companyId,
                      };
                    }
                    return material;
                  });
                }

                console.log("Materials after adding", materials);

                return {
                  ...item,
                  materials,
                };
              }
              return item;
            });
            console.log("Items after adding material", items);
            return { items };
          });

          // Add to listsStore
          useListsStore.setState((state) => {
            return { materials: [...state.materials, res.data] };
          });

          close();
        } else if (res.type === "globalError") {
          errorToast(
            res.errorSource?.length ? res.errorSource[0].message : res.message,
          );
        } else {
          errorToast(res.message!);
        }
      } catch (err) {
        const formattedError = errorHandler(err);
        errorToast(
          formattedError.errorSource?.length
            ? formattedError.errorSource[0].message
            : formattedError.message,
        );
      }
    } else {
      // Just add to state without making an API call
      useEstimateCreateStore.setState((state) => {
        const items = state.items.map((item) => {
          if (item.id === itemId) {
            console.log("Materials before adding", item.materials);

            let materials = item.materials;
            if (materials.length === 0) {
              materials = [
                {
                  id: 30003030,
                  name,
                  categoryId: category?.id || null,
                  vendorId: vendor?.id || null,
                  // @ts-ignore: ignore for now
                  tags,
                  notes,
                  quantity: Decimal(validQuantity) || 0,
                  cost: Number(cost || 0) as any,
                  sell: Number(sell || 0) as any,
                  discount: Number(discount || 0) as any,
                  addToInventory,
                  createdAt: new Date(),
                  productId: null,
                  invoiceId: null,
                  invoiceItemId: null,
                  updatedAt: new Date(),
                  companyId: 30003030,
                },
              ];
            } else {
              materials = materials.map((material: any, i: number) => {
                if (i === materialIndex) {
                  return {
                    id: 30003030,
                    name,
                    categoryId: category?.id || null,
                    vendorId: vendor?.id || null,
                    tags,
                    notes,
                    quantity: Decimal(validQuantity) || 0,
                    cost: Number(cost || 0) as any,
                    sell: Number(sell || 0) as any,
                    discount: Number(discount || 0) as any,
                    addToInventory,
                    createdAt: new Date(),
                    productId: null,
                    invoiceId: null,
                    invoiceItemId: null,
                    updatedAt: new Date(),
                    companyId: 30003030,
                  };
                }
                return material;
              });
            }

            return {
              ...item,
              materials,
            };
          }
          return item;
        });

        console.log("Items after adding material", items);
        return { items };
      });

      close();
    }
  }

  function handleEdit() {
    if (!validateForm()) return;

    // Update the material in the items
    // @ts-ignore
    useEstimateCreateStore.setState((state) => {
      const items = state.items.map((item) => {
        if (item.id === itemId) {
          const materials = item.materials.map((material, i) => {
            if (i === materialIndex) {
              return {
                ...material,
                name,
                categoryId: category?.id ?? null,
                vendorId: vendor?.id ?? null,
                tags,
                notes,
                quantity: quantity || 0,
                cost: Number(cost || 0) as any,
                sell: Number(sell || 0) as any,
                discount: Number(discount || 0) as any,
                addToInventory,
              };
            }
            return material;
          });

          return {
            ...item,
            materials,
          };
        }
        return item;
      });
      return { items };
    });

    close();
  }

  // Only one dropdown open at a time.
  useEffect(() => {
    if (categoryOpen && vendorOpen) setVendorOpen(false);
  }, [categoryOpen, vendorOpen]);

  return (
    <div className="flex flex-col gap-1 p-1.5 sm:p-5 bg-white rounded-sm">
      <h3 className="mb-2 text-xl font-bold tracking-tight text-slate-500">
        {data.edit ? "Edit Materials/Parts" : "Materials/Parts Information"}
      </h3>

      {/* Name Input */}
      <div>
        <div className="flex items-center gap-3">
          <label
            htmlFor="name"
            className="min-w-20 max-w-24 sm:min-w-0 sm:max-w-24 text-sm font-semibold tracking-wider text-slate-500"
          >
            Material / Parts Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              clearFieldError("name");
            }}
            aria-invalid={!!errors.name}
            className={cn(
              "h-10 w-full sm:flex-1 rounded-[10px] bg-white px-4 text-sm font-medium ring-1 ring-inset transition-all focus:outline-none focus:ring-2",
              errors.name
                ? "ring-red-500 focus:ring-red-500/40"
                : "ring-slate-200 focus:ring-primary/30",
            )}
            placeholder="Material Name"
          />
        </div>
      </div>

      {/* Category Selector */}
      <div className="flex items-center gap-3">
        <label className="w-24 text-sm font-semibold tracking-wider text-slate-500">
          Category
        </label>
        <div className="flex-1">
          <SelectCategory
            onCategoryChange={setCategory}
            labelPosition="none" // Controlled by the external label above
            categoryData={category}
            categoryOpen={categoryOpen}
            setCategoryOpen={setCategoryOpen}
            className="max-w-full"
            isClear
          />
        </div>
      </div>

      {/* Vendor Selector */}
      <div className="flex items-center gap-3">
        <label className="w-24 text-sm font-semibold tracking-wider text-slate-500">
          Vendor
        </label>
        <div className="flex-1">
          <Selector
            label={(vendor: Vendor | null) =>
              vendor ? vendor.companyName || vendor.name || "" : "Select Vendor"
            }
            newButton={
              <NewVendor
                button={
                  <button
                    type="button"
                    className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    <Plus size={12} /> New Vendor
                  </button>
                }
                afterSubmit={(vendor) => {
                  /* logic remains same */
                  setVendor(vendor);
                  setVendorOpen(false);
                }}
              />
            }
            items={vendors}
            onSearch={(search: string) =>
              vendors.filter((vendor) =>
                (vendor.companyName || vendor.name || "")
                  .toLowerCase()
                  .includes(search.toLowerCase()),
              )
            }
            displayList={(vendor: Vendor) => (
              <p className="text-sm font-medium">
                {vendor?.companyName || vendor.name}
              </p>
            )}
            openState={[vendorOpen, setVendorOpen]}
            selectedItem={vendor}
            setSelectedItem={setVendor}
            className="max-w-full"
            footer={
              vendor ? (
                <ClearSelectionButton
                  label="Clear Vendor"
                  onClear={() => {
                    setVendor(null);
                    setVendorOpen(false);
                  }}
                />
              ) : null
            }
          />
        </div>
      </div>

      {/* Pricing & Quantity Grid */}
      {[
        {
          id: "qt",
          field: "quantity" as MaterialField,
          label: "Quantity",
          val: quantity,
          set: setQuantity,
          placeholder: "0",
          type: "number",
          required: true,
        },
        {
          id: "price",
          field: "cost" as MaterialField,
          label: "Cost Price",
          val: cost,
          set: setCost,
          placeholder: "0.00",
          type: "number",
          disabled: data.edit,
          max: MAX_MONEY_VALUE,
          // Read-only while editing, so it can't be marked required there.
          required: !data.edit,
        },
        {
          id: "sell",
          field: "sell" as MaterialField,
          label: "Sell Price",
          val: sell,
          set: setSell,
          placeholder: "0.00",
          type: "number",
          max: MAX_MONEY_VALUE,
          required: true,
        },
        {
          id: "discount",
          label: "Discount",
          val: discount,
          set: setDiscount,
          placeholder: "0",
          type: "number",
          max: MAX_MONEY_VALUE,
        },
      ].map((field) => (
        <div key={field.id} className="mb-0.5">
          <div className="flex items-center gap-3">
            <label
              htmlFor={field.id}
              className="w-24 text-sm font-semibold text-slate-500"
            >
              {field.label}{" "}
              {field.required && <span className="text-red-500">*</span>}
            </label>
            <input
              type={field.type}
              id={field.id}
              value={field.val ?? ""}
              disabled={field.disabled}
              min="0"
              max={field.max}
              aria-invalid={!!(field.field && errors[field.field])}
              onChange={(e) => {
                if (field.field) clearFieldError(field.field);
                if (e.target.value === "") {
                  field.set(undefined);
                } else {
                  const parsed = parseFloat(e.target.value);
                  const clamped = parsed < 0 ? 0 : parsed;
                  field.set(
                    field.max && clamped > field.max ? field.max : clamped,
                  );
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "-" || e.key === "e") e.preventDefault();
              }}
              className={cn(
                "w-full flex-1 rounded-[10px] border px-3 py-1.5 text-base font-medium leading-6 outline-none transition-all duration-300",
                (field.field && errors[field.field]) ||
                  (field.id === "qt" && inventoryError)
                  ? "border-red-500 ring-1 ring-red-500/20"
                  : "border-slate-300/80",
              )}
              placeholder={field.placeholder}
            />
          </div>
          {/* Inventory availability stays inline — it's advisory context about
              stock levels, not a required-field error. */}
          {field.id === "qt" && inventoryError && (
            <p className="ml-[6.7rem] mt-1 text-xs font-medium text-red-500">
              {inventoryError}
            </p>
          )}
        </div>
      ))}

      {/* Notes Textarea */}
      <div className="flex items-start gap-3">
        <label
          htmlFor="notes"
          className="mt-2 w-24 text-sm font-semibold tracking-wider text-slate-500"
        >
          Notes
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="h-24 flex-1 rounded-xl bg-white border border-slate-100 p-3 text-sm font-medium ring-1 ring-inset ring-slate-200 transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          placeholder="Additional details..."
        />
      </div>

      {/* Inventory Checkbox */}
      {!data.edit && (
        <div className="ml-[6.7rem] flex items-center">
          <label className="group flex cursor-pointer items-center gap-3">
            <div className="relative flex items-center mt-1">
              <input
                type="checkbox"
                checked={addToInventory}
                onChange={(e) => setAddToInventory(e.target.checked)}
                className="peer sr-only"
              />
              <div
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-lg border-2 transition-all duration-200",
                  "border-slate-200 bg-white shadow-sm",
                  "peer-checked:border-primary peer-checked:bg-primary peer-checked:shadow-md peer-checked:shadow-primary/20",
                  "group-hover:border-primary/50 peer-focus:ring-2 peer-focus:ring-primary/20",
                )}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={cn(
                    "h-3.5 w-3.5 transition-transform duration-200",
                    addToInventory ? "scale-100" : "scale-0",
                  )}
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            </div>

            <span
              className={cn(
                "text-sm font-semibold transition-colors",
                addToInventory ? "text-slate-800" : "text-slate-600",
              )}
            >
              Add to Inventory
            </span>
          </label>
        </div>
      )}

      {/* Form Actions */}
      <div className="mt-4 flex items-center justify-end gap-3">
        <Close />
        <button
          className="rounded-xl bg-primary px-10 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/30 transition-all hover:bg-[#525ceb] active:scale-95"
          onClick={data.edit ? handleEdit : handleSubmit}
          type="button"
        >
          {data.edit ? "Update Details" : "Done"}
        </button>
      </div>
    </div>
  );
}
