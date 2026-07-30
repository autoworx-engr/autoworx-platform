"use client";
import { deleteLabor } from "@/actions/estimate/labor/deleteLabor";
import { updateLabor } from "@/actions/estimate/labor/updateLabor";
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
import { Category, Labor } from "@prisma/client";
import { formatCurrency } from "@/utils/formatCurrency";
import { Popconfirm } from "antd";
import { SquarePen, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

export const CannedLaborItem = ({
  labor,
  view,
  index,
}: {
  labor: Labor & { category?: Category };
  view: "table" | "card";
  index: number;
}) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState<string>(labor.name);
  const [nameError, setNameError] = useState<string>("");
  const [charge, setCharge] = useState<string>(
    labor.charge ? Number(labor.charge).toFixed(2) : "0.00",
  );
  const [notes, setNotes] = useState<string>((labor as any).notes || "");
  const [category, setCategory] = useState<Category | null>(
    labor?.category || null,
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
  };

  const handleEdit = async () => {
    if (!name.trim()) {
      setNameError("Labor name is required");
      return;
    }

    setIsPending(true);
    const res = await updateLabor({
      id: labor.id,
      name,
      charge: parseFloat(charge) || 0,
      categoryId: category?.id || undefined,
      notes: notes.trim() || undefined,
    });

    if (res.success) {
      successToast("Labor updated successfully");
      // Reload the page to refresh the labor list
      window.location.reload();
      handleDialogClose();
    } else {
      errorToast(res?.message || "Failed to update labor");
    }
    setIsPending(false);
  };

  // Reusable Notes field
  const NotesField = (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">
        Notes
      </label>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={3}
        className="w-full rounded-lg border border-gray-300 p-2 text-base focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 transition-colors resize-none"
        placeholder="Add any notes about this labor item..."
      />
    </div>
  );

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
              {labor.name}
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
                    <DialogTitle>Edit Canned Labor</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Labor Name<span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          if (nameError) setNameError("");
                        }}
                        autoFocus={false}
                        className={cn(
                          "w-full rounded-lg border p-2 text-base focus:ring-2 focus:ring-indigo-500 transition-colors",
                          nameError
                            ? "border-red-500"
                            : "border-gray-300 focus:border-indigo-500",
                        )}
                        placeholder="Labor Name"
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
                        $/Hour
                      </label>
                      <input
                        type="number"
                        value={charge}
                        onChange={(e) => setCharge(e.target.value)}
                        step="0.01"
                        className="w-full rounded-lg border border-gray-300 p-2 text-base focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 transition-colors"
                        placeholder="$/Hour"
                      />
                    </div>
                    {NotesField}
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <button className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
                        Cancel
                      </button>
                    </DialogClose>
                    <button
                      onClick={handleEdit}
                      disabled={isPending}
                      className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-gray-400"
                    >
                      {isPending ? "Updating..." : "Update Labor"}
                    </button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              {
                <Popconfirm
                  title="Delete the Canned Labor"
                  description="Are you sure to delete this Canned Labor?"
                  okText="Yes"
                  cancelText="No"
                  onConfirm={() => deleteLabor(labor.id)}
                >
                  <Trash2 className="w-5 h-5 text-red-500 hover:text-red-700 cursor-pointer transition-colors" />
                </Popconfirm>
              }
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="mb-1 text-sm font-medium text-gray-500">
                Category <span className="text-red-500">*</span>
              </p>
              <p className="line-clamp-1 text-lg font-semibold text-indigo-600">
                {labor.category?.name}
              </p>
            </div>
            <div>
              <p className="mb-1 text-sm font-medium text-gray-500">$/Hour</p>
              <p className="text-lg font-bold text-gray-700">
                {formatCurrency(labor.charge ? Number(labor.charge) : 0)}
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
        <span className="font-medium text-gray-800">{labor.name}</span>
      </TableCell>
      <TableCell className="py-3">
        <span className="text-gray-600">{labor.category?.name}</span>
      </TableCell>
      <TableCell className="py-3">
        <span className="text-gray-700 font-semibold">
          {formatCurrency(labor.charge ? Number(labor.charge) : 0)}
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
            <DialogHeader>
              <DialogTitle>Edit Canned Labor</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Labor Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (nameError) setNameError("");
                  }}
                  autoFocus={false}
                  className={cn(
                    "w-full rounded-lg border p-2 text-base focus:ring-2 focus:ring-indigo-500 transition-colors",
                    nameError
                      ? "border-red-500"
                      : "border-gray-300 focus:border-indigo-500",
                  )}
                  placeholder="Labor Name"
                />
                {nameError && (
                  <p className="mt-1 text-xs text-red-500">{nameError}</p>
                )}
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Category <span className="text-red-500">*</span>
                </label>
                <SelectCategory
                  onCategoryChange={setCategory}
                  labelPosition="none"
                  categoryData={category}
                  categoryOpen={categoryOpen}
                  setCategoryOpen={setCategoryOpen}
                  allowEdit={true}
                  className="min-w-full"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  $/Hour
                </label>
                <input
                  type="number"
                  value={charge}
                  onChange={(e) => setCharge(e.target.value)}
                  step="0.01"
                  className="w-full rounded-lg border border-gray-300 p-2 text-base focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 transition-colors"
                  placeholder="$/Hour"
                />
              </div>
              {NotesField}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <button className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
              </DialogClose>
              <button
                onClick={handleEdit}
                disabled={isPending}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-gray-400"
              >
                {isPending ? "Updating..." : "Update Labor"}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Popconfirm
          title="Delete the Canned Labor"
          description="Are you sure to delete this Canned Labor?"
          okText="Yes"
          cancelText="No"
          onConfirm={() => deleteLabor(labor.id)}
        >
          <Trash2 className="w-5 h-5 text-red-500 hover:text-red-700 cursor-pointer transition-colors" />
        </Popconfirm>
      </TableCell>
    </TableRow>
  );
};
