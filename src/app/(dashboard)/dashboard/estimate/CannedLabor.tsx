"use client";
import { deleteLabor } from "@/actions/estimate/labor/deleteLabor";
import { updateLabor } from "@/actions/estimate/labor/updateLabor";
import SelectCategory from "@/components/Lists/SelectCategory";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { Pagination, Popconfirm, message } from "antd"; // Added message for notifications
import { CircleCheckBig, SquarePen, Trash2, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
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

  //  Show pagination if many labors
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

  console.log("search params==>", laborSearch);

  return (
    <div className="h-full w-full flex flex-col">
      <section className="pb-4 border-b border-gray-200">
        <div className="flex items-center gap-x-4">
          <h3 className="text-2xl font-extrabold text-gray-800">🛠️ Canned Labor</h3>
        </div>
        {/* Changed layout for horizontal alignment of search, filter, and add labor */}
        <div className=" pt-3">
          <FilterBySearchBox
            searchText={laborSearch as string}
            paramKey="laborSearch"
          />
          </div>
          <div className="flex justify-between items-center mt-3">
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
              <button className="rounded-lg bg-indigo-600 w-full min-w-32 md:w-36 p-2 text-white font-medium hover:bg-indigo-700 transition-colors shadow-md">
                + Add Labor
              </button>
            }
            isCanned={true}
            fromCanned={true}
          />
        </div>
      </section>
      {/* Desktop View */}
      <div className="hidden flex-1 h-full overflow-y-auto thin-scrollbar md:block mt-4">
        <Table className="h-full border border-gray-200 rounded-lg">
          <TableHeader className="sticky top-0 bg-gray-50 border-b border-gray-200">
            <TableRow>
              <TableHead className="font-semibold text-gray-700">Labor Name</TableHead>
              <TableHead className="font-semibold text-gray-700">Category</TableHead>
              <TableHead className="font-semibold text-gray-700">$/Hour</TableHead>
              <TableHead className="font-semibold text-gray-700">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="overflow-y-auto h-full">
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
  const [isEdit, setIsEdit] = useState(false);
  const [category, setCategory] = useState<Category | null>(
    labor?.category || null
  );
  const { categories } = useListsStore();
  const { currentSelectedCategoryId } = useEstimateCreateStore();
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [hours, setHours] = useState<string>(
    labor.charge ? Number(labor.charge).toFixed(2) : "0.00"
  );
  const [name, setName] = useState<string>(labor.name);
  const [nameError, setNameError] = useState<string>("");

  useEffect(() => {
    if (currentSelectedCategoryId) {
      setCategory(
        categories.find((cat) => cat.id === currentSelectedCategoryId)!
      );
    }
  }, [currentSelectedCategoryId]);

  const validateName = (): boolean => {
    if (!name.trim()) {
      setNameError("Labor name is required");
      return false;
    }
    setNameError("");
    return true;
  };

  const [isPending, startTransition] = useTransition();

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value.length > 50) {
      setNameError("Labor name must be less than 50 characters");
      return false;
    }
    setName(e.target.value);
    if (e.target.value.trim()) {
      setNameError("");
    }
  };

  const handleEdit = async () => {
    if (!validateName()) {
      message.error("Labor name is required");
      return;
    }

    const res = await updateLabor({
      id: labor.id,
      name,
      charge: parseFloat(hours) || 0,
      categoryId: category?.id,
    });
    if (res.success) successToast("Labor updated successfully");
    if (!res?.success)
      return errorToast(res?.message || "Failed to update labor");
    setIsEdit(false);
  };

  if (view === "card") {
    return (
      <Card
        className={cn(
          "w-full transition-all duration-300 rounded-xl shadow-lg border-t-4",
          index !== undefined && index % 2 === 0
            ? "border-indigo-500 bg-white"
            : "border-teal-500 bg-gray-50",
          isEdit ? "shadow-2xl ring-2 ring-indigo-400" : "shadow-md hover:shadow-lg"
        )}
      >
        <CardHeader className="p-4">
          <div className="flex items-start justify-between">
            {!isEdit ? (
              <h3 className="line-clamp-2 text-xl font-extrabold text-gray-800">
                {labor.name}
              </h3>
            ) : (
              <div className="flex-1">
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={handleNameChange}
                  className={cn(
                    "w-full rounded-lg border p-2 text-base font-semibold focus:ring-2 focus:ring-indigo-500 transition-colors",
                    nameError ? "border-red-500" : "border-gray-300 focus:border-indigo-500"
                  )}
                  placeholder="Labor Name"
                />
                {nameError && (
                  <p className="mt-1 text-xs text-red-500">{nameError}</p>
                )}
              </div>
            )}
            <div className="flex items-center gap-3 ml-4">
              {isEdit && (
                <button
                  onClick={() => startTransition(() => handleEdit())}
                  className="text-2xl text-green-600 hover:text-green-700 disabled:text-gray-400 transition-colors"
                  disabled={isPending}
                  title="Save"
                >
                  <CircleCheckBig className="w-6 h-6" />
                </button>
              )}
              <button
                onClick={() => setIsEdit(!isEdit)}
                className="text-2xl text-indigo-500 hover:text-indigo-600 transition-colors"
                title={isEdit ? "Cancel" : "Edit"}
              >
                {!isEdit ? (
                  <SquarePen className="w-5 h-5" />
                ) : (
                  <X className="w-6 h-6 text-red-500" />
                )}
              </button>
              {!isEdit && (
                <Popconfirm
                  title="Delete the Canned Labor"
                  description="Are you sure to delete this Canned Labor?"
                  okText="Yes"
                  cancelText="No"
                  onConfirm={() => deleteLabor(labor.id)}
                >
                  <Trash2 className="w-5 h-5 text-red-500 hover:text-red-700 cursor-pointer transition-colors" />
                </Popconfirm>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="mb-1 text-sm font-medium text-gray-500">Category</p>
              {!isEdit ? (
                <p className="line-clamp-1 text-lg font-semibold text-indigo-600">
                  {labor.category?.name}
                </p>
              ) : (
                <SelectCategory
                  onCategoryChange={setCategory}
                  labelPosition="none"
                  categoryData={category}
                  categoryOpen={categoryOpen}
                  setCategoryOpen={setCategoryOpen}
                />
              )}
            </div>
            <div>
              <p className="mb-1 text-sm font-medium text-gray-500">$/Hour</p>
              {!isEdit ? (
                <p className="text-lg font-bold text-gray-700">
                  {formatCurrency(labor.charge ? Number(labor.charge) : 0)}
                </p>
              ) : (
                <input
                  type="number"
                  id="hours"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  step="0.01"
                  className="w-full rounded-lg border border-gray-300 p-2 text-base focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 transition-colors"
                  placeholder="$/Hour"
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  console.log(isPending, "isPending");

  return (
   <TableRow
      className={cn(
        "border-b border-gray-200 transition-colors hover:bg-indigo-50",
        index % 2 === 0 ? "bg-white" : "bg-gray-50",
        isEdit ? "bg-yellow-50 shadow-inner" : ""
      )}
    >
      <TableCell className="py-3">
        {!isEdit ? (
          <span className="font-medium text-gray-800">{labor.name}</span>
        ) : (
          <div>
            <input
              type="text"
              id="name"
              value={name}
              onChange={handleNameChange}
              className={cn(
                "w-full min-w-[150px] rounded-md border p-1 px-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500",
                nameError ? "border-red-500" : "border-gray-300"
              )}
              placeholder="Labor Name"
            />
            {nameError && (
              <p className="mt-1 text-xs text-red-500">{nameError}</p>
            )}
          </div>
        )}
      </TableCell>
      <TableCell className="py-3">
        {!isEdit ? (
          <span className="text-gray-600">{labor.category?.name}</span>
        ) : (
          <SelectCategory
            onCategoryChange={setCategory}
            labelPosition="none"
            categoryData={category}
            categoryOpen={categoryOpen}
            setCategoryOpen={setCategoryOpen}
          />
        )}
      </TableCell>
      <TableCell className="py-3 font-mono">
        {!isEdit ? (
          <span className="text-gray-700 font-semibold">
            {formatCurrency(labor.charge ? Number(labor.charge) : 0)}
          </span>
        ) : (
          <div>
            <input
              type="number"
              id="hours"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              step="0.01"
              className="w-full min-w-[100px] max-w-[150px] rounded-md border border-gray-300 p-1 px-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="$/Hour"
            />
          </div>
        )}
      </TableCell>
      <TableCell className="flex items-center space-x-3 py-3 h-full">
        {isEdit && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsEdit(false)}
              title="Cancel Edit"
            >
              <X
                color="#f87171"
                className="w-5 h-5 hover:text-red-700 transition-colors"
              />
            </button>
            <button
              onClick={() => startTransition(() => handleEdit())}
              className="text-lg text-indigo-600 hover:text-indigo-700 disabled:cursor-not-allowed disabled:text-gray-400 transition-colors"
              disabled={isPending}
              title="Save Changes"
            >
              <CircleCheckBig className="w-5 h-5" strokeWidth={2.5} />
            </button>
          </div>
        )}
        {!isEdit && (
          <button
            onClick={() => setIsEdit(!isEdit)}
            className="text-xl text-indigo-500 hover:text-indigo-600 transition-colors"
            title="Edit"
          >
            <SquarePen className="w-5 h-5" />
          </button>
        )}
        <Popconfirm
          title="Delete the Canned Labor"
          description="Are you sure to delete this Canned Labor?"
          okText="Yes"
          cancelText="No"
          onConfirm={() => deleteLabor(labor.id)}
        >
          <Trash2 className="w-5 h-5 text-red-500 hover:text-red-700 cursor-pointer transition-colors"  />
        </Popconfirm>
      </TableCell>
    </TableRow>
  );
};
