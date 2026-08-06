// import SelectCategory from "@/components/Lists/SelectCategory";
import SelectCategory from "@/components/Lists/CreateEstimateCategory";
import { SelectTags } from "@/components/Lists/SelectTags";
import { useEstimateCreateStore } from "@/stores/estimate-create";
import { useEstimatePopupStore } from "@/stores/estimate-popup";
import { useListsStore } from "@/stores/lists";
import { Category, Tag } from "@prisma/client";
import { useEffect, useState } from "react";
import { newLabor } from "@/actions/estimate/labor/newLabor";
import Close from "./CloseEstimate";
import { errorToast } from "@/lib/toast";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { laborCreateValidationSchema } from "@/validations/schemas/estimate/labor/labor.validation";
import { cn } from "@/lib/cn";

export default function LaborCreate() {
  const { categories } = useListsStore();
  const { currentSelectedCategoryId } = useEstimateCreateStore();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [notes, setNotes] = useState<string>("");
  const [hours, setHours] = useState<number>();
  const [charge, setCharge] = useState<number>();
  const [discount, setDiscount] = useState<number>();
  const [addToCannedLabor, setAddToCannedLabor] = useState<boolean>(false);

  const { close, data } = useEstimatePopupStore();
  const itemId = data?.itemId;

  const [tagsOpen, setTagsOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);

  useEffect(() => {
    if (currentSelectedCategoryId) {
      setCategory(
        categories.find((cat) => cat.id === currentSelectedCategoryId)!,
      );
    }
  }, [currentSelectedCategoryId]);

  useEffect(() => {
    setTagsOpen(false);
  }, [categoryOpen]);
  useEffect(() => {
    setCategoryOpen(false);
  }, [tagsOpen]);

  useEffect(() => {
    if (data?.labor && data.edit) {
      setName(data.labor.name);
      setCategory(categories.find((cat) => cat.id === data.labor.categoryId)!);
      setTags(data.labor.tags);
      setNotes(data.labor.notes);
      setHours(data.labor.hours == 0 ? undefined : data.labor.hours);
      setCharge(
        data.labor.charge == 0 ? undefined : parseFloat(data.labor.charge),
      );
      setDiscount(
        data.labor.discount == 0 ? undefined : parseFloat(data.labor.discount),
      );
      setAddToCannedLabor(data.labor.addToCannedLabor);
    } else {
      setName("");
      setCategory(null);
      setTags([]);
      setNotes("");
      setHours(undefined);
      setCharge(undefined);
      setDiscount(undefined);
      setAddToCannedLabor(false);
    }
  }, [data]);

  async function handleSubmit() {
    // if (!name) {
    //   alert("Labor name is required");
    //   return;
    // }

    try {
      const validatedLaborData = await laborCreateValidationSchema.parseAsync({
        name,
        categoryId: category?.id,
        tags,
        notes,
        hours: hours ?? 0,
        charge: charge ?? 0,
        discount: discount ?? 0,
        cannedLabor: addToCannedLabor,
      });
      if (addToCannedLabor) {
        const res = await newLabor(validatedLaborData);
        if (res.type === "globalError") {
          errorToast(
            res.errorSource?.length ? res.errorSource[0].message : res.message,
          );
        }
      }

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
                categoryId: Number(category?.id) || null,
                tags,
                notes,
                hours: Number(hours) || 0,
                charge: Number(charge) || 0,
                discount: Number(discount) || 0,
                addToCannedLabor,
              },
            };
          }
          return item;
        });
        return { items };
      });

      // Add to listsStore
      // @ts-ignore
      useListsStore.setState((state) => {
        return {
          labors: [
            ...state.labors,
            {
              id: 1,
              name,
              categoryId: Number(category?.id) || null,
              tags,
              notes,
              hours: Number(hours) || 0,
              charge: Number(charge) || 0,
              discount: Number(discount) || 0,
              addToCannedLabor,
            },
          ],
        };
      });

      close();
    } catch (error) {
      const formattedError = errorHandler(error);
      errorToast(
        formattedError.errorSource?.length
          ? formattedError.errorSource[0].message
          : formattedError.message,
      );
    }
  }
  // }

  async function handleEdit() {
    if (!name) {
      alert("Labor name is required");
      return;
    }

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
              categoryId: Number(category?.id) || null,
              tags,
              notes,
              hours: Number(hours) || 0,
              charge: Number(charge) || 0,
              discount: Number(discount) || 0,
              addToCannedLabor,
            },
          };
        }
        return item;
      });
      return { items };
    });
    close();
  }

  return (
    <div className="flex flex-col gap-1 p-5 bg-white rounded-sm">
      <h3 className="mb-2 text-xl font-bold tracking-tight text-slate-500">
        {data?.edit ? "Edit Labor Information" : "Labor Information"}
      </h3>

      {/* Labor Name */}
      <div className="flex items-center gap-3">
        <label
          htmlFor="name"
          className="w-28 text-sm font-semibold tracking-wider text-slate-500"
        >
          Labor Name
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-10 flex-1 appearance-none rounded-xl bg-white px-4 text-sm font-medium border border-slate-200 transition-all focus:outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/30"
          placeholder="Labor Name"
        />
      </div>

      {/* Category */}
      <div className="flex items-center gap-3">
        <label className="w-28 text-sm font-semibold tracking-wider text-slate-500">
          Category
        </label>
        <div className="flex-1">
          <SelectCategory
            onCategoryChange={setCategory}
            labelPosition="none"
            categoryData={category}
            categoryOpen={categoryOpen}
            setCategoryOpen={setCategoryOpen}
            className="max-w-full"
          />
        </div>
      </div>

      {/* Tags */}
      <div className="flex items-center gap-3">
        <label
          htmlFor="tags"
          className="w-28 text-sm font-semibold tracking-wider text-slate-500"
        >
          Tags
        </label>
        <div className="flex-1">
          <SelectTags
            value={tags}
            setValue={setTags}
            openStates={[tagsOpen, setTagsOpen]}
          />
        </div>
      </div>

      {/* Notes */}
      <div className="flex items-start gap-3">
        <label
          htmlFor="notes"
          className="mt-2 w-28 text-sm font-semibold tracking-wider text-slate-500"
        >
          Notes
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="h-24 flex-1 appearance-none rounded-xl bg-white p-3 text-sm font-medium border border-slate-200 transition-all focus:outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/30 resize-none"
          placeholder="Additional details..."
        />
      </div>

      {/* Hours */}
      <div className="flex items-center gap-3">
        <label
          htmlFor="hours"
          className="w-28 text-sm font-semibold tracking-wider text-slate-500"
        >
          No. of Hours
        </label>
        <input
          type="number"
          id="hours"
          min="0"
          value={hours ?? ""}
          onChange={(e) => {
            const inputValue = e.target.value;
            if (inputValue === "" || inputValue === "-" || inputValue === "0") {
              setHours(undefined);
              return;
            }
            const value = parseFloat(inputValue);
            if (isNaN(value) || value <= 0) {
              setHours(undefined);
            } else {
              setHours(value);
            }
          }}
          className="h-10 flex-1 appearance-none rounded-xl bg-white px-4 text-sm font-medium border border-slate-200 transition-all focus:outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/30"
          placeholder="0"
        />
      </div>

      {/* Charge ($/hr) */}
      <div className="flex items-center gap-3">
        <label
          htmlFor="perhour"
          className="w-28 text-sm font-semibold tracking-wider text-slate-500"
        >
          $/hr
        </label>
        <input
          type="number"
          id="perhour"
          min="0"
          value={charge ?? ""}
          onChange={(e) => {
            const inputValue = e.target.value;
            if (inputValue === "" || inputValue === "-" || inputValue === "0") {
              setCharge(undefined);
              return;
            }
            const value = parseFloat(inputValue);
            if (isNaN(value) || value <= 0) {
              setCharge(undefined);
            } else {
              setCharge(value);
            }
          }}
          className="h-10 flex-1 appearance-none rounded-xl bg-white px-4 text-sm font-medium border border-slate-200 transition-all focus:outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/30"
          placeholder="0.00"
        />
      </div>

      {/* Discount */}
      <div className="flex items-center gap-3">
        <label
          htmlFor="discount"
          className="w-28 text-sm font-semibold tracking-wider text-slate-500"
        >
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
          className="h-10 flex-1 appearance-none rounded-xl bg-white px-4 text-sm font-medium border border-slate-200 transition-all focus:outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/30"
          placeholder="0"
        />
      </div>

      {/* Add to Canned Labor */}
      {!data.edit && (
        <div className="ml-28 pl-3 flex items-center">
          <label className="group flex cursor-pointer items-center gap-3">
            <div className="relative flex items-center mt-1">
              <input
                type="checkbox"
                checked={addToCannedLabor}
                onChange={(e) => setAddToCannedLabor(e.target.checked)}
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
                    "h-3.5 w-3.5 transition-all duration-200",
                    addToCannedLabor
                      ? "scale-100 opacity-100"
                      : "scale-50 opacity-0",
                  )}
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            </div>

            <span
              className={cn(
                "font-semibold transition-colors duration-200",
                addToCannedLabor ? "text-slate-800" : "text-slate-600",
              )}
            >
              Add to Canned Labor
            </span>
          </label>
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 flex items-center justify-end gap-3 border-t border-slate-100 pt-6">
        <Close />
        <button
          className="rounded-xl bg-primary px-10 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/30 transition-all hover:bg-[#525ceb] active:scale-95"
          onClick={data?.edit ? handleEdit : handleSubmit}
          type="button"
        >
          {data?.edit ? "Update Details" : "Done"}
        </button>
      </div>
    </div>
  );
}
