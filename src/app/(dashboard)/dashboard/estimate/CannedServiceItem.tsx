"use client";
import { deleteService } from "@/actions/estimate/service/deleteService";
import { updateService } from "@/actions/estimate/service/updateService";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/Dialog";
import SelectCategory from "@/components/Lists/SelectCategory";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/cn";
import { errorToast, successToast } from "@/lib/toast";
import { useEstimateCreateStore } from "@/stores/estimate-create";
import { useListsStore } from "@/stores/lists";
import { Category, Service } from "@prisma/client";
import { Popconfirm } from "antd";
import { SquarePen, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

export const CannedServiceItem = ({
  service,
  view,
  index,
}: {
  service: Service & { category?: Category };
  view: "table" | "card";
  index: number;
}) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(service.name);
  const [nameError, setNameError] = useState("");
  const [description, setDescription] = useState(service.description);
  const [descriptionError, setDescriptionError] = useState("");
  const [category, setCategory] = useState<Category | null>(
    service?.category || null,
  );
  const [categoryOpen, setCategoryOpen] = useState(false);
  const { categories } = useListsStore();
  const { currentSelectedCategoryId } = useEstimateCreateStore();
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (currentSelectedCategoryId && !category) {
      setCategory(
        categories.find((cat) => cat.id === currentSelectedCategoryId)!,
      );
    }
  }, [currentSelectedCategoryId, category, categories]);

  const handleDialogClose = () => {
    setOpen(false);
    setNameError("");
    setDescriptionError("");
  };

  async function handleUpdateService() {
    if (!name.trim()) {
      setNameError("Service name is required");
      return;
    }

    setIsPending(true);
    const res = await updateService({
      id: service.id,
      name: name,
      description: description || "",
      categoryId: category?.id || undefined,
      canned: true,
    });

    if (res && "type" in res && res.type === "success") {
      successToast("Service updated successfully!");
      handleDialogClose();
    } else {
      errorToast(res?.message ?? "Update failed. Please try again.");
    }
    setIsPending(false);
  }

  if (view === "card") {
    return (
      <Card
        className={cn(
          "w-full transition-all duration-300 rounded-xl shadow-lg border-t-4",
          index !== undefined && index % 2 === 0
            ? "border-indigo-500 bg-white"
            : "border-teal-500 bg-gray-50",
          "shadow-md hover:shadow-lg",
        )}
      >
        <CardHeader className="p-4">
          <div className="flex items-start justify-between">
            <h3 className="line-clamp-2 text-xl font-extrabold text-gray-800">
              {service.name}
            </h3>
            <div className="flex items-center gap-3 ml-4">
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <button
                    className="text-2xl text-indigo-500 hover:text-indigo-600 transition-colors"
                    title="Edit"
                  >
                    <SquarePen className="w-5 h-5" />
                  </button>
                </DialogTrigger>
                <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
                  <DialogHeader>
                    <DialogTitle>Edit Canned Service</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Service Name<span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          if (nameError) setNameError("");
                        }}
                        className={cn(
                          "w-full rounded-lg border p-2 text-base focus:ring-2 focus:ring-indigo-500 transition-colors",
                          nameError
                            ? "border-red-500"
                            : "border-gray-300 focus:border-indigo-500",
                        )}
                        placeholder="Service Name"
                      />
                      {nameError && (
                        <p className="mt-1 text-xs text-red-500">{nameError}</p>
                      )}
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Category<span className="text-red-500">*</span>
                      </label>
                      <SelectCategory
                        onCategoryChange={setCategory}
                        labelPosition="none"
                        categoryData={category}
                        categoryOpen={categoryOpen}
                        setCategoryOpen={setCategoryOpen}
                        allowEdit={true}
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Description
                      </label>
                      <textarea
                        placeholder="Description"
                        value={description || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value.length > 250) {
                            setDescriptionError(
                              "Description must be less than 250 characters",
                            );
                            return;
                          }
                          setDescription(value);
                          setDescriptionError("");
                        }}
                        className={cn(
                          "min-h-[100px] w-full rounded-lg border p-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 transition-colors",
                          descriptionError
                            ? "border-red-500"
                            : "border-gray-300",
                        )}
                      />
                      {descriptionError && (
                        <p className="mt-1 text-xs text-red-500">
                          {descriptionError}
                        </p>
                      )}
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <button className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
                        Cancel
                      </button>
                    </DialogClose>
                    <button
                      onClick={handleUpdateService}
                      disabled={isPending}
                      className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-gray-400"
                    >
                      {isPending ? "Updating..." : "Update Service"}
                    </button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Popconfirm
                title="Delete the Canned Service"
                description="Are you sure to delete this Canned Service?"
                okText="Yes"
                cancelText="No"
                onConfirm={async () => {
                  await deleteService(service.id);
                }}
              >
                <Trash2 className="w-5 h-5 text-red-500 hover:text-red-700 cursor-pointer transition-colors" />
              </Popconfirm>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="space-y-4">
            <div>
              <p className="mb-1 text-sm font-medium text-gray-500">
                Category <span className="text-red-500">*</span>
              </p>
              <p className="line-clamp-1 text-lg font-semibold text-indigo-600">
                {service.category?.name}
              </p>
            </div>
            <div>
              <p className="mb-1 text-sm font-medium text-gray-500">
                Description
              </p>
              <p className="break-all whitespace-pre-wrap text-gray-700">
                {service.description}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TableRow
      className={cn(
        "border-b border-gray-200 transition-colors hover:bg-indigo-50",
        index % 2 === 0 ? "bg-white" : "bg-gray-50",
      )}
    >
      <TableCell className="py-3">
        <span className="font-medium text-gray-800">{service.name}</span>
      </TableCell>
      <TableCell className="py-3">
        <span className="text-gray-600">{service.category?.name}</span>
      </TableCell>
      <TableCell className="py-3">
        <span className="line-clamp-2 max-w-[250px] whitespace-pre-wrap break-all text-gray-700">
          {service.description}
        </span>
      </TableCell>
      <TableCell className="flex items-center space-x-3 py-3 h-full">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button
              className="text-xl text-indigo-500 hover:text-indigo-600 transition-colors"
              title="Edit"
            >
              <SquarePen className="w-5 h-5" />
            </button>
          </DialogTrigger>
          <DialogContent
            className="max-w-md"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <DialogHeader className="px-2.5">
              <DialogTitle>Edit Canned Service</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 px-2.5">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Service Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (nameError) setNameError("");
                  }}
                  className={cn(
                    "w-full rounded-lg border p-2 text-base focus:ring-2 focus:ring-indigo-500 transition-colors",
                    nameError
                      ? "border-red-500"
                      : "border-gray-300 focus:border-indigo-500",
                  )}
                  placeholder="Service Name"
                />
                {nameError && (
                  <p className="mt-1 text-xs text-red-500">{nameError}</p>
                )}
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Category<span className="text-red-500">*</span>
                </label>
                <SelectCategory
                  onCategoryChange={setCategory}
                  labelPosition="none"
                  categoryData={category}
                  categoryOpen={categoryOpen}
                  setCategoryOpen={setCategoryOpen}
                  allowEdit={true}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  placeholder="Description"
                  value={description || ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    setDescription(value);
                    setDescriptionError("");
                  }}
                  className={cn(
                    "min-h-[100px] thin-scrollbar w-full rounded-lg border p-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 transition-colors",
                    descriptionError ? "border-red-500" : "border-gray-300",
                  )}
                />
                {descriptionError && (
                  <p className="mt-1 text-xs text-red-500">
                    {descriptionError}
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <button className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
              </DialogClose>
              <button
                onClick={handleUpdateService}
                disabled={isPending}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-gray-400"
              >
                {isPending ? "Updating..." : "Update Service"}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Popconfirm
          title="Delete the canned service"
          description="Are you sure to delete this canned service?"
          okText="Yes"
          cancelText="No"
          placement="topLeft"
          getPopupContainer={() => document.body}
          onConfirm={async () => {
            await deleteService(service.id);
          }}
        >
          <Trash2 className="w-5 h-5 text-red-500 hover:text-red-700 cursor-pointer transition-colors" />
        </Popconfirm>
      </TableCell>
    </TableRow>
  );
};
