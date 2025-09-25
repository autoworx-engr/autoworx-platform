import NewVendor from "@/components/Lists/NewVendor";
// import SelectCategory from "@/components/Lists/SelectCategory";
import SelectCategory from "@/components/Lists/CreateEstimateCategory";
import { SelectTags } from "@/components/Lists/SelectTags";
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

export default function MaterialCreate() {
  const { categories } = useListsStore();
  const { vendors } = useListsStore();

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

  const { close, data } = useEstimatePopupStore();
  const itemId = data?.itemId;
  const materialIndex = data?.materialIndex;

  // const [vendorSearch, setVendorSearch] = useState("");
  const [vendorOpen, setVendorOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);

  // const { actionType } = useActionStoreCreateEdit();

  useEffect(() => {
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
      const costValue = parseFloat(data.material.cost);
      setCost(costValue === 0 ? undefined : costValue);
      const sellValue = parseFloat(
        data.material.sell === 0 ? undefined : data.material.sell
      );
      setSell(sellValue);
      const discountValue = parseFloat(data.material.discount);
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
                  categoryId: category?.id,
                  vendorId: vendor?.id,
                  tags: data.material.tags,
                  notes: data.material.notes,
                  quantity: quantityValue || 0,
                  cost: Number(
                    costValue === 0 ? undefined : costValue || 0
                  ) as any,
                  sell: Number(
                    sellValue === 0 ? undefined : sellValue || 0
                  ) as any,
                  discount: Number(
                    discountValue === 0 ? undefined : discountValue || 0
                  ) as any,
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
        categories.find((cat) => cat.id === currentSelectedCategoryId)!
      );
    }
  }, [currentSelectedCategoryId]);

  async function handleSubmit() {
    // if (!name) {
    //   alert("Material name is required");
    //   return;
    // }

    if (!name) {
      errorToast("Material name is required");
      return;
    }

    if (!quantity || quantity <= 0) {
      errorToast("Material Quantity must be at least 1");
      return;
    }

    // If addToInventory is true, add to database, otherwise just add to state
    if (addToInventory) {
      try {
        const res = await newMaterial({
          name,
          categoryId: category?.id,
          vendorId: vendor?.id,
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
                      quantity: Decimal(quantity) || 0,
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
                  materials = materials.map((material, i) => {
                    if (i === materialIndex) {
                      return {
                        id,
                        name,
                        categoryId: category?.id || null,
                        vendorId: vendor?.id || null,
                        tags,
                        notes,
                        quantity: Decimal(quantity) || 0,
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
            res.errorSource?.length ? res.errorSource[0].message : res.message
          );
        } else {
          errorToast(res.message!);
        }
      } catch (err) {
        const formattedError = errorHandler(err);
        errorToast(
          formattedError.errorSource?.length
            ? formattedError.errorSource[0].message
            : formattedError.message
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
                  quantity: Decimal(quantity) || 0,
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
              materials = materials.map((material, i) => {
                if (i === materialIndex) {
                  return {
                    id: 30003030,
                    name,
                    categoryId: category?.id || null,
                    vendorId: vendor?.id || null,
                    tags,
                    notes,
                    quantity: Decimal(quantity) || 0,
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
    if (!name) {
      errorToast("Material name is required");
      return;
    }

    if (!quantity || quantity <= 0) {
      errorToast("Material Quantity must be at least 1");
      return;
    }

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
                categoryId: category?.id,
                vendorId: vendor?.id,
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

  useEffect(() => {
    if (categoryOpen && (vendorOpen || tagsOpen)) {
      setVendorOpen(false);
      setTagsOpen(false);
    } else if (vendorOpen && (categoryOpen || tagsOpen)) {
      setCategoryOpen(false);
      setTagsOpen(false);
    } else if (tagsOpen && (categoryOpen || vendorOpen)) {
      setCategoryOpen(false);
      setVendorOpen(false);
    }
  }, [categoryOpen, vendorOpen, tagsOpen]);

  return (
    <div className="flex flex-col gap-2 p-10 md:p-5">
      <h3 className="w-full text-xl font-semibold">
        {/* Materials/Parts Information */}
        {data.edit ? "Edit Materials/Parts" : "Materials/Parts Information"}
      </h3>

      <div className="flex items-center gap-2">
        <label htmlFor="name" className="w-28 text-start text-sm">
          Material/
          <br /> Parts Name
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md border-2 border-slate-400 p-1 text-xs"
        />
      </div>

      <SelectCategory
        onCategoryChange={setCategory}
        labelPosition="left"
        categoryData={category}
        categoryOpen={categoryOpen}
        setCategoryOpen={setCategoryOpen}
      />

      <div className="flex items-center gap-2">
        <label className="w-28 text-start text-sm">Vendor</label>

        <Selector
          label={(vendor: Vendor | null) =>
            vendor ? vendor.companyName || vendor.name || "" : "Vendor"
          }
          newButton={
            <NewVendor
              button={
                <button type="button" className="text-xs text-[#6571FF]">
                  + New Vendor
                </button>
              }
              afterSubmit={(vendor) => {
                useListsStore.setState(({ vendors }) => ({
                  vendors: [...vendors, vendor],
                }));

                useEstimateCreateStore.setState((state) => {
                  const items = state.items.map((item) => {
                    if (item.id === itemId) {
                      return {
                        ...item,
                        vendor,
                      };
                    }
                    return item;
                  });
                  return { items };
                });

                setVendor(vendor);
                setVendorOpen(false);
              }}
            />
          }
          items={vendors}
          onSearch={(search: string) =>
            vendors.filter(
              (vendor) =>
                (vendor?.companyName?.toLowerCase() || "").includes(
                  search.toLowerCase()
                ) ||
                (vendor?.name?.toLowerCase() || "").includes(
                  search.toLowerCase()
                )
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

      {/* TODO: add to backend */}
      <div className="flex items-center gap-2">
        <label htmlFor="tags" className="w-28 text-start text-sm">
          Tags
        </label>
        <div className="w-full">
          <SelectTags
            value={tags}
            setValue={setTags}
            openStates={[tagsOpen, setTagsOpen]}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="notes" className="w-28 text-start text-sm">
          Notes
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full rounded-md border-2 border-slate-400 p-1 text-xs"
        />
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="qt" className="w-28 text-start text-sm">
          Quantity
        </label>
        <input
          type="number"
          id="qt"
          min="0"
          value={quantity || ""}
          onChange={(e) => {
            const inputValue = e.target.value;
            if (inputValue === "" || inputValue === "-" || inputValue === "0") {
              setQuantity(undefined);
              return;
            }
            const value = parseFloat(inputValue);
            if (isNaN(value) || value <= 0) {
              setQuantity(undefined);
            } else {
              setQuantity(value);
            }
          }}
          className="w-full rounded-md border-2 border-slate-400 p-1 text-xs"
          placeholder="0"
        />
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="price" className="w-28 text-start text-sm">
          Cost Price
        </label>
        <input
          type="number"
          id="price"
          min="0"
          value={cost ?? ""}
          onChange={(e) => {
            const inputValue = e.target.value;
            if (inputValue === "" || inputValue === "-" || inputValue === "0") {
              setCost(undefined);
              return;
            }
            const value = parseFloat(inputValue);
            if (isNaN(value) || value <= 0) {
              setCost(undefined);
            } else {
              setCost(value);
            }
          }}
          className="w-full rounded-md border-2 border-slate-400 p-1 text-xs"
          placeholder="0"
          disabled={data.edit}
        />
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="sell" className="w-28 text-start text-sm">
          Sell Price
        </label>
        <input
          type="number"
          id="sell"
          min="0"
          value={sell ?? ""}
          onChange={(e) => {
            const inputValue = e.target.value;
            if (inputValue === "" || inputValue === "-" || inputValue === "0") {
              setSell(undefined);
              return;
            }
            const value = parseFloat(inputValue);
            if (isNaN(value) || value <= 0) {
              setSell(undefined);
            } else {
              setSell(value);
            }
          }}
          className="w-full rounded-md border-2 border-slate-400 p-1 text-xs"
          placeholder="0"
        />
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="discount" className="w-28 text-start text-sm">
          Discount
        </label>
        <input
          type="number"
          id="discount"
          min="0"
          value={discount ?? ""}
          onChange={(e) => {
            const inputValue = e.target.value;
            if (inputValue === "" || inputValue === "-" || inputValue === "0") {
              setDiscount(undefined);
              return;
            }
            const value = parseFloat(inputValue);
            if (isNaN(value) || value < 0) {
              setDiscount(undefined);
            } else {
              setDiscount(value);
            }
          }}
          className="w-full rounded-md border-2 border-slate-400 p-1 text-xs"
          placeholder="0"
        />
      </div>

      {!data.edit && (
        <label className="ml-5 flex items-center gap-2">
          <input
            type="checkbox"
            checked={addToInventory}
            onChange={(e) => setAddToInventory(e.target.checked)}
          />
          <span>Add to Inventory</span>
        </label>
      )}

      <div className="flex justify-center gap-5">
        <Close />
        <button
          className="w-fit rounded-md bg-[#6571FF] p-1 px-5 text-white"
          onClick={data.edit ? handleEdit : handleSubmit}
          type="button"
        >
          Done
        </button>
      </div>
    </div>
  );
}
