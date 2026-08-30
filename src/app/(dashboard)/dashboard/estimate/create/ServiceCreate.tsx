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
import {
  SERVICE_DESCRIPTION_MAX_LENGTH,
  SERVICE_NAME_MAX_LENGTH,
  SERVICE_NAME_MIN_LENGTH,
} from "@/validations/schemas/estimate/service/service.validation";

export default function ServiceCreate() {
  const { close, data } = useEstimatePopupStore();
  const itemId = data?.itemId;
  const edit = data?.edit as boolean | undefined;

  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category | null>(null);
  const [description, setDescription] = useState("");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [nameError, setNameError] = useState("");
  const [descriptionError, setDescriptionError] = useState("");

  const validateName = (value: string) => {
    const trimmed = value.trim();

    if (!trimmed) return "Service name is required";
    if (trimmed.length < SERVICE_NAME_MIN_LENGTH)
      return `Service name must be at least ${SERVICE_NAME_MIN_LENGTH} characters`;
    if (trimmed.length > SERVICE_NAME_MAX_LENGTH)
      return `Service name must be less than ${SERVICE_NAME_MAX_LENGTH} characters`;
    return "";
  };

  const validateDescription = (value: string) =>
    value.length > SERVICE_DESCRIPTION_MAX_LENGTH
      ? `Description must be less than ${SERVICE_DESCRIPTION_MAX_LENGTH} characters`
      : "";

  const validateForm = () => {
    const nextNameError = validateName(name);
    const nextDescriptionError = validateDescription(description);

    setNameError(nextNameError);
    setDescriptionError(nextDescriptionError);

    return !nextNameError && !nextDescriptionError;
  };

  useEffect(() => {
    if (data?.service && data.edit) {
      setName(data.service.name);

      setCategory(
        useListsStore
          .getState()
          .categories.find((cat) => cat.id === data.service.categoryId) || null,
      );

      setDescription(data?.serviceDesc || data?.service?.description);
    } else {
      setName("");
      setCategory(null);
      setDescription("");
    }
  }, [data]);

  async function handleSubmit() {
    if (!validateForm()) return;

    const res = await newService({
      name: name.trim(),
      categoryId: category?.id!,
      description: description.trim(),
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
    if (!validateForm()) return;

    // Update the service
    const res = await updateService({
      id: data?.service.id,
      name: name.trim(),
      categoryId: category?.id,
      description: description.trim(),
    });

    if (res?.type !== "success") {
      errorToast(res?.message ?? "Update failed. Please try again.");
      return;
    }

    // Change the service in the items
    // @ts-ignore
    useEstimateCreateStore.setState((state) => {
      const items = state.items.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            service: {
              ...item.service,
              name: name.trim(),
              categoryId: category?.id,
              category: category,
              description: description.trim(),
            },
            serviceDesc: description.trim(),
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
          onChange={(e) => {
            const value = e.target.value;
            setName(value);
            if (nameError) setNameError(validateName(value));
          }}
          onBlur={() => setNameError(validateName(name))}
          className={cn(
            "h-11 rounded-xl bg-white px-4 text-sm font-medium ring-1 ring-inset transition-all focus:outline-none focus:ring-2",
            nameError
              ? "ring-red-500 focus:ring-red-500/30"
              : "ring-slate-200 focus:ring-primary/30",
            data.service?.canned &&
              "bg-slate-50 text-slate-600 cursor-not-allowed shadow-inner",
          )}
          readOnly={data.service?.canned}
        />
        {nameError && <p className="ml-1 text-xs text-red-500">{nameError}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-1">
          Category
        </label>
        <SelectCategory
          onCategoryChange={setCategory}
          labelPosition="none"
          categoryData={category}
          categoryOpen={categoryOpen}
          setCategoryOpen={setCategoryOpen}
          className="max-w-full"
          allowEdit={true}
          isClear
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">
          Description
        </label>
        <textarea
          placeholder="Provide details about this service..."
          value={description}
          onChange={(e) => {
            const value = e.target.value;
            setDescription(value);
            setDescriptionError(validateDescription(value));
          }}
          className={cn(
            "h-32 rounded-xl bg-white p-4 text-sm font-medium ring-1 ring-inset transition-all focus:outline-none focus:ring-2 resize-none",
            descriptionError
              ? "ring-red-500 focus:ring-red-500/30"
              : "ring-slate-200 focus:ring-primary/30",
          )}
        />
        <div className="flex items-center justify-between ml-1">
          {descriptionError ? (
            <p className="text-xs text-red-500">{descriptionError}</p>
          ) : (
            <span />
          )}
          <span
            className={cn(
              "text-xs",
              descriptionError ? "text-red-500" : "text-slate-500",
            )}
          >
            {description.length}/{SERVICE_DESCRIPTION_MAX_LENGTH}
          </span>
        </div>
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
