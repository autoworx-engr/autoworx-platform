import newService from "@/actions/estimate/service/newService";
import { updateService } from "@/actions/estimate/service/updateService";
import SelectCategory from "@/components/Lists/SelectCategory";
import { errorToast } from "@/lib/toast";
import { useEstimateCreateStore } from "@/stores/estimate-create";
import { useEstimatePopupStore } from "@/stores/estimate-popup";
import { useListsStore } from "@/stores/lists";
import { Category } from "@prisma/client";
import { create } from "mutative";
import { useEffect, useState } from "react";
import Close from "./CloseEstimate";
import { cn } from "@/lib/cn";

export default function ServiceCreate() {
  const { close, data } = useEstimatePopupStore();
  const itemId = data?.itemId;
  const edit = data?.edit as boolean | undefined;

  const { categories } = useListsStore();

  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category | null>(null);
  const [description, setDescription] = useState("");
  const [categoryOpen, setCategoryOpen] = useState(false);

  useEffect(() => {
    if (data?.service && data.edit) {
      setName(data.service.name);

      setCategory(
        categories.find((cat) => cat.id === data.service.categoryId) || null,
      );

      setDescription(data?.serviceDesc || data?.service?.description);
    } else {
      setName("");
      setCategory(null);
      setDescription("");
    }
  }, [data, categories]);

  async function handleSubmit() {
    if (!category?.id) {
      return errorToast("Service Category is required!");
    }
    const res = await newService({
      name,
      categoryId: category?.id!,
      description,
    });

    if (res.type === "success") {
      const i = useEstimateCreateStore
        .getState()
        .items.findIndex((item) => item.id === itemId);

      useEstimateCreateStore.setState((x) =>
        create(x, (x) => {
          x.items[i].service = res.data;
        }),
      );

      // Add to listsStore
      useListsStore.setState((state) => {
        return { services: [...state.services, res.data] };
      });

      close();
    } else if (res.type === "globalError") {
      errorToast(
        res.errorSource?.length ? res.errorSource[0].message : res.message,
      );
    }
  }

  async function handleEdit() {
    if (!name) {
      alert("Service name is required");
      return;
    }

    // Update the service
    await updateService({
      id: data?.service.id,
      name,
      categoryId: category?.id,
      description,
    });

    // Change the service in the items
    // @ts-ignore
    useEstimateCreateStore.setState((state) => {
      const items = state.items.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            service: {
              ...item.service,
              name,
              categoryId: category?.id,
              category: category,
              description,
            },
            serviceDesc: description,
          };
        }
        return item;
      });

      return { items };
    });

    close();
  }

  return (
    <div className="flex flex-col gap-6 p-10 bg-white rounded-3xl">
      <h3 className="w-full text-2xl font-bold text-slate-600 tracking-tight">
        {edit ? "Update Service" : "Add New Service"}
      </h3>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-1">
          Service Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          placeholder="Service Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={cn(
            "h-11 rounded-xl bg-white px-4 text-sm font-medium ring-1 ring-inset ring-slate-200 transition-all focus:outline-none focus:ring-2 focus:ring-primary/30",
            data.service?.canned &&
              "bg-slate-50 text-slate-600 cursor-not-allowed shadow-inner",
          )}
          readOnly={data.service?.canned}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-1">
          Category <span className="text-red-500">*</span>
        </label>
        <SelectCategory
          onCategoryChange={setCategory}
          labelPosition="none"
          categoryData={category}
          categoryOpen={categoryOpen}
          setCategoryOpen={setCategoryOpen}
          className="max-w-full"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">
          Description
        </label>
        <textarea
          placeholder="Provide details about this service..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="h-32 rounded-xl bg-white p-4 text-sm font-medium ring-1 ring-inset ring-slate-200 transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
        />
      </div>

      <div className="mt-4 flex items-center justify-end gap-3">
        <div className="contents child:px-6 child:py-2.5 child:rounded-xl child:text-sm child:font-bold child:transition-all">
          <Close />
          {/* Assuming Close is a component, ensure its internal classes match a 'ghost' style */}

          <button
            className="bg-primary text-white shadow-lg shadow-primary/30 hover:bg-[#525ceb] hover:shadow-primary/40 active:scale-95 px-8 py-2.5 rounded-xl text-sm font-bold"
            onClick={edit ? handleEdit : handleSubmit}
            type="button"
          >
            {edit ? "Save Changes" : "Create Service"}
          </button>
        </div>
      </div>
    </div>
  );
}
