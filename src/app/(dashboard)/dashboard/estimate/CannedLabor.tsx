"use client";
import { deleteLabor } from "@/actions/estimate/labor/deleteLabor";
import { updateLabor } from "@/actions/estimate/labor/updateLabor";
import SelectCategory from "@/components/Lists/SelectCategory";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/Dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/cn";
import { errorToast, successToast } from "@/lib/toast";
import { useEstimateCreateStore } from "@/stores/estimate-create";
import { useListsStore } from "@/stores/lists";
import { formatCurrency } from "@/utils/formatCurrency";
import { Category, Labor } from "@prisma/client";
import { Pagination, Popconfirm } from "antd";
import { SquarePen, Trash2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import FilterBySearchBox from "../reporting/components/filter/FilterBySearchBox";
import CannedFilterBySelection from "./CannedFilterBySelected";
import NewLabor from "./NewLabor";

export type TFilterModalState = {
  category: boolean;
};

export default function CannedLabor({
  labors,
}: {
  labors: (Labor & { category: Category })[];
}) {
  const params = useSearchParams();
  const selectedCategory = params.get("laborCategory") || "";
  const laborSearch = params.get("laborSearch") || "";
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [showPagination, setShowPagination] = useState(false);
  const [filteredData, setFilteredData] =
    useState<(Labor & { category: Category })[]>(labors);
  const [activeModal, setActiveModal] = useState<{ [key: string]: boolean }>(
    {}
  );

  useEffect(() => {
    const filtered = labors.filter((row) => {
      const categoryName = row?.category?.name?.toLowerCase() || "";
      const laborName = row?.name.toLowerCase();

      const matchesSearch = laborSearch
        ? laborName.includes(laborSearch.toLowerCase()) ||
        categoryName.includes(laborSearch.toLowerCase())
        : true;

      const matchesCategory = selectedCategory
        ? categoryName === selectedCategory.toLowerCase()
        : true;

      return matchesSearch && matchesCategory;
    });

    setFilteredData(filtered);
  }, [laborSearch, selectedCategory, labors]);

  useEffect(() => {
    setShowPagination(filteredData?.length > 10);
  }, [filteredData]);

  const handlePageChange = (page: number, pageSize?: number) => {
    setCurrentPage(page);
    if (pageSize) setPageSize(pageSize);
  };

  const paginatedLabors = filteredData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  //  Category names for dropdown
  const uniqueCategories = labors
    .map((l) => l?.category)
    .filter(
      (c, i, arr) => c && arr.findIndex((a) => a?.id === c?.id) === i
    ) as any;

  const toggleModal = (modalName: string) => {
    setActiveModal((prev) => ({
      ...prev,
      [modalName]: !prev[modalName],
    }));
  };

  const closeModal = (modalName: string) => {
    setActiveModal((prev) => ({
      ...prev,
      [modalName]: false,
    }));
  };

  return (
    <div className="h-full w-full flex flex-col">
      <section className="pb-4 border-b border-gray-200">
        <div className="flex items-center gap-x-4">
          <h3 className="text-2xl font-extrabold text-gray-800">
            Canned Labor
          </h3>
        </div>
        {/* Changed layout for horizontal alignment of search, filter, and add labor */}
        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between gap-y-3">
          <div className="flex-1">
            <FilterBySearchBox
              searchText={laborSearch as string}
              paramKey="laborSearch"
            />
          </div>
          <div className="flex items-center gap-3">
            <CannedFilterBySelection
              selectedItem={selectedCategory}
              items={uniqueCategories}
              type="laborCategory" // unique param for labors
              modalName="laborCategory"
              closeModal={closeModal}
              activeModal={activeModal}
              toggleModal={toggleModal}
            />
            <NewLabor
              newButton={
                <button
                  className="rounded-lg bg-gradient-to-r from-[#6571FF] to-[#5a66ee] w-full min-w-32 md:w-36 p-2 text-white font-medium shadow-indigo-500/30
                hover:shadow-xl hover:shadow-indigo-500/40
                hover:-translate-y-0.5 hover:scale-[1.02]
                active:translate-y-0 active:scale-100
                transition-all duration-200"
                >
                  + Add Labor
                </button>
              }
              isCanned={true}
              fromCanned={true}
            />
          </div>
        </div>
      </section>
      {/* Desktop View */}
      <div className="hidden flex-1 h-full overflow-y-auto thin-scrollbar md:block mt-4">
        <Table className="h-full border border-gray-200 rounded-lg">
          <TableHeader className="sticky top-0 bg-gray-50 border-b border-gray-200">
            <TableRow>
              <TableHead className="font-semibold text-gray-700">
                Labor Name
              </TableHead>
              <TableHead className="font-semibold text-gray-700">
                Category
              </TableHead>
              <TableHead className="font-semibold text-gray-700">
                $/Hour
              </TableHead>
              <TableHead className="font-semibold text-gray-700">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="overflow-y-auto thin-scrollbar h-full">
            {paginatedLabors.length > 0 ? (
              paginatedLabors.map((labor, index) => (
                <LaborComponent
                  key={labor.id}
                  index={index}
                  labor={labor}
                  view="table"
                />
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-12 text-center text-gray-500 text-lg"
                >
                  No canned labor items available
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {/* Mobile View */}
      <div className="grid gap-4 pb-4 md:hidden mt-4">
        {paginatedLabors.length > 0 ? (
          paginatedLabors.map((labor, i) => (
            <LaborComponent
              key={labor.id}
              labor={labor}
              view="card"
              index={i}
            />
          ))
        ) : (
          <div className="rounded-xl bg-white p-8 text-center text-gray-500 shadow-lg border border-gray-100">
            No canned labor items available
          </div>
        )}
      </div>
      {showPagination && (
        <div className=" hidden h-10 justify-end lg:flex flex-shrink-0 mt-4">
          <Pagination
            className="custom-pagination"
            current={currentPage}
            pageSize={pageSize}
            total={labors.length}
            onChange={handlePageChange}
            showSizeChanger
            onShowSizeChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
}

const LaborComponent = ({
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
    labor.charge ? Number(labor.charge).toFixed(2) : "0.00"
  );
  const [category, setCategory] = useState<Category | null>(
    labor?.category || null
  );
  const [categoryOpen, setCategoryOpen] = useState(false);
  const { categories } = useListsStore();
  const { currentSelectedCategoryId } = useEstimateCreateStore();
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (currentSelectedCategoryId && !category) {
      setCategory(
        categories.find((cat) => cat.id === currentSelectedCategoryId)!
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

  if (view === "card") {
    return (
      <Card
        className={cn(
          "w-full transition-all duration-300 rounded-xl shadow-lg border-t-4",
          index !== undefined && index % 2 === 0
            ? "border-indigo-500 bg-white"
            : "border-teal-500 bg-gray-50",
          "shadow-md hover:shadow-lg"
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
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Canned Labor</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Labor Name
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
                            : "border-gray-300 focus:border-indigo-500"
                        )}
                        placeholder="Labor Name"
                      />
                      {nameError && (
                        <p className="mt-1 text-xs text-red-500">{nameError}</p>
                      )}
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Category
                      </label>
                      <SelectCategory
                        onCategoryChange={setCategory}
                        labelPosition="none"
                        categoryData={category}
                        categoryOpen={categoryOpen}
                        setCategoryOpen={setCategoryOpen}
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
              <p className="mb-1 text-sm font-medium text-gray-500">Category</p>
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
        index % 2 === 0 ? "bg-white" : "bg-gray-50"
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Canned Labor</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Labor Name
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
                      : "border-gray-300 focus:border-indigo-500"
                  )}
                  placeholder="Labor Name"
                />
                {nameError && (
                  <p className="mt-1 text-xs text-red-500">{nameError}</p>
                )}
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Category
                </label>
                <SelectCategory
                  onCategoryChange={setCategory}
                  labelPosition="none"
                  categoryData={category}
                  categoryOpen={categoryOpen}
                  setCategoryOpen={setCategoryOpen}
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
