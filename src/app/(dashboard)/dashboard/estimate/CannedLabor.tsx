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
    <div className="h-full w-full md:px-4 flex flex-col">
      <section className=" pb-3 lg:pb-0">
        <div className="flex items-center gap-x-8">
          <h3 className="text-xl font-bold md:text-2xl">Canned Labor</h3>
        </div>
        <div className="flex flex-col md:flex-row gap-3 py-1">
          <div className="flex items-center justify-between gap-3">
            <FilterBySearchBox
              searchText={laborSearch as string}
              paramKey="laborSearch"
            />
            <CannedFilterBySelection
              selectedItem={selectedCategory}
              items={uniqueCategories}
              type="laborCategory" // unique param for labors
              modalName="laborCategory"
              closeModal={closeModal}
              activeModal={activeModal}
              toggleModal={toggleModal}
            />
          </div>

          <NewLabor
            newButton={
              <button className="rounded-md  bg-[#6571FF] w-full md:w-32 p-1 text-white ">
                + Add Labor
              </button>
            }
            isCanned={true}
            fromCanned={true}
          />
        </div>
      </section>
      {/* Desktop View */}
      <div className="hidden flex-1 h-full overflow-y-auto thin-scrollbar md:block">
        <Table className="h-full">
          <TableHeader className="sticky top-0 bg-background">
            <TableRow>
              <TableHead>Labor Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>$/Hour</TableHead>
              <TableHead>Edit</TableHead>
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
                  className="py-8 text-center text-gray-500"
                >
                  No canned labor items available
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {/* Mobile View */}
      <div className="grid gap-4 pb-4 md:hidden">
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
          <div className="rounded-md bg-background py-8 text-center text-gray-500 shadow-sm">
            No canned labor items available
          </div>
        )}
      </div>
      {showPagination && (
        <div className=" hidden h-10 justify-end lg:flex flex-shrink-0">
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
          "w-full transition-all duration-200",
          index !== undefined && index % 2 === 0
            ? "bg-background"
            : "bg-[#F8FAFF]",
          isEdit ? "border-2 border-[#6571FF]" : ""
        )}
      >
        <CardHeader className="p-4">
          <div className="flex items-center justify-between">
            {!isEdit ? (
              <h3 className="line-clamp-1 text-xl font-bold">{labor.name}</h3>
            ) : (
              <div className="flex-1">
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={handleNameChange}
                  className={cn(
                    "me-2 flex-1 rounded-md border-2 p-2",
                    nameError ? "border-red-500" : "border-slate-400"
                  )}
                  placeholder="Labor Name"
                />
                {nameError && (
                  <p className="mt-1 text-xs text-red-500">{nameError}</p>
                )}
              </div>
            )}
            <div className="flex items-center gap-2">
              {isEdit && (
                <button
                  onClick={() => startTransition(() => handleEdit())}
                  className="text-xl text-green-500"
                  disabled={isPending}
                >
                  <CircleCheckBig className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={() => setIsEdit(!isEdit)}
                className="text-2xl text-[#6571FF]"
              >
                <SquarePen className="w-5 h-5 text-[#6571FF]" />
              </button>
              {!isEdit && (
                <Popconfirm
                  title="Delete the Canned Labor"
                  description="Are you sure to delete this Canned Labor?"
                  okText="Yes"
                  cancelText="No"
                  onConfirm={() => deleteLabor(labor.id)}
                >
                  <X cursor={"pointer"} color="#f87171" fontSize={20} />
                </Popconfirm>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="space-y-3">
            <div>
              <p className="mb-1 text-sm text-[#66738C]">Category</p>
              {!isEdit ? (
                <p className="line-clamp-1 text-xl text-[#6571FF]">
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
              <p className="mb-1 text-sm text-[#66738C]">$/Hour</p>
              {!isEdit ? (
                <p className="font-medium text-[#66738C]">
                  {formatCurrency(labor.charge ? Number(labor.charge) : 0)}
                </p>
              ) : (
                <input
                  type="number"
                  id="hours"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  step="0.01"
                  className="w-full rounded-md border-2 border-slate-400 p-2"
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
      className={cn(index % 2 === 0 ? "bg-background" : "bg-[#F8FAFF]")}
    >
      <TableCell>
        {!isEdit ? (
          <span>{labor.name}</span>
        ) : (
          <div>
            <input
              type="text"
              id="name"
              value={name}
              onChange={handleNameChange}
              className={cn(
                "#text-xs max-w-[150px] rounded-md border-2 p-1 px-4",
                nameError ? "border-red-500" : "border-slate-400"
              )}
              placeholder="Labor Name"
            />
            {nameError && (
              <p className="mt-1 text-xs text-red-500">{nameError}</p>
            )}
          </div>
        )}
      </TableCell>
      <TableCell>
        {!isEdit ? (
          <span className="">{labor.category?.name}</span>
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
      <TableCell>
        {!isEdit ? (
          <span>{formatCurrency(labor.charge ? Number(labor.charge) : 0)}</span>
        ) : (
          <div>
            <input
              type="number"
              id="hours"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              step="0.01"
              className="#text-xs max-w-[150px] rounded-md border-2 border-slate-400 p-1 px-4"
              placeholder="$/Hour"
            />
          </div>
        )}
      </TableCell>
      <TableCell className="flex items-center my-auto h-full">
        {isEdit && (
          <div className="flex items-center  ">
            <button>
              <X
                cursor={"pointer"}
                color="#f87171"
                className="w-4 h-4 mr-2"
                onClick={() => setIsEdit(false)}
              />
            </button>
            <button
              onClick={() => startTransition(() => handleEdit())}
              className="mr-4 text-lg text-[#6571FF] disabled:cursor-not-allowed disabled:text-gray-400"
              disabled={isPending}
            >
              <CircleCheckBig className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>
        )}
        <button
          onClick={() => setIsEdit(!isEdit)}
          className="text-xl text-[#6571FF]"
        >
          <SquarePen className="w-4 h-4 text-[#6571FF]" />
        </button>
        <Popconfirm
          title="Delete the Canned Labor"
          description="Are you sure to delete this Canned Labor?"
          okText="Yes"
          cancelText="No"
          className="ml-3"
          onConfirm={() => deleteLabor(labor.id)}
        >
          <Trash2 cursor={"pointer"} color="#f87171" className="w-5 h-5" />
        </Popconfirm>
      </TableCell>
    </TableRow>
  );
};
