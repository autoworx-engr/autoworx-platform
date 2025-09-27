"use client";
import { deleteService } from "@/actions/estimate/service/deleteService";
import { updateService } from "@/actions/estimate/service/updateService";
import SelectCategory from "@/components/Lists/SelectCategory";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { useEstimateCreateStore } from "@/stores/estimate-create";
import { useListsStore } from "@/stores/lists";
import { Category, Service } from "@prisma/client";
import React, { useEffect, useState } from "react";
import { FaTimes } from "react-icons/fa";
import { IoMdCheckmarkCircleOutline } from "react-icons/io";
import NewService from "./NewService";
import { Pagination, Popconfirm } from "antd";
import { useFormErrorStore } from "@/stores/form-error";
import { useEstimateFilterStore } from "@/stores/estimate-filter";
import { errorToast, successToast } from "@/lib/toast";
import toast from "react-hot-toast";
import { SquarePen } from "lucide-react";

const evenColor = "bg-background";
const oddColor = "bg-[#F8FAFF]";

export default function CannedServices({
  services,
}: {
  services: (Service & { category: Category })[];
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [showPagination, setShowPagination] = useState(false);
  const [filteredData, setFilteredData] = useState<Service[]>(services);
  const { search } = useEstimateFilterStore();

  useEffect(() => {
    const filtered = services.filter((row) => {
      if (search) {
        const searchValue = search.toLowerCase();
        return (
          row.category?.name.toLowerCase().includes(searchValue) ||
          row.name.toLowerCase().includes(searchValue)
        );
      }
      return true;
    });

    setFilteredData(filtered);
  }, [search, services]);

  useEffect(() => {
    if (filteredData.length > 10) {
      setShowPagination(true);
    } else {
      setShowPagination(false);
    }
  }, [filteredData]);

  const handlePageChange = (page: number, pageSize?: number) => {
    setCurrentPage(page);
    if (pageSize) {
      setPageSize(pageSize);
    }
  };

  const paginatedServices = filteredData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="h-full w-full md:px-4">
      <div className="flex items-center justify-between pb-3 lg:pb-0">
        <div className="flex items-center gap-x-8">
          <h3 className="text-xl font-bold md:text-2xl">Canned Services</h3>
        </div>
        <NewService
          newButton={
            <button className="rounded-md bg-[#6571FF] p-2 px-3 text-white md:px-5">
              + Add Service
            </button>
          }
        />
      </div>
      {/* Desktop View */}
      <div className="overflow-y-auto hidden max-h-[600px] md:block">
        <Table className="h-full">
          <TableHeader className="sticky top-0 bg-background">
            <TableRow>
              <TableHead>Services Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Edit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="custom-scrollbar h-full">
            {paginatedServices.length > 0 ? (
              paginatedServices.map((service, index) => (
                <ServiceComponent
                  key={service.id}
                  service={service}
                  view="table"
                  index={index}
                />
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-8 text-center text-gray-500"
                >
                  No canned services available
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {/* Mobile View */}
      <div className="grid h-full gap-4 pb-4 md:hidden">
        {paginatedServices.length > 0 ? (
          paginatedServices.map((service, i) => (
            <ServiceComponent
              key={service.id}
              service={service}
              view="card"
              index={i}
            />
          ))
        ) : (
          <div className="rounded-md bg-background py-8 text-center text-gray-500 shadow-sm">
            No canned services available
          </div>
        )}
      </div>
      {showPagination && (
        <div className="mt-4 hidden justify-end lg:flex">
          <Pagination
            className="custom-pagination"
            current={currentPage}
            pageSize={pageSize}
            total={services.length}
            onChange={handlePageChange}
            showSizeChanger
            onShowSizeChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
}

const ServiceComponent = ({
  service,
  view,
  index,
}: {
  service: Service & { category?: Category };
  view: "table" | "card";
  index: number;
}) => {
  const [isEdit, setIsEdit] = useState(false);
  const [category, setCategory] = useState<Category | null>(
    service?.category || null
  );
  const { categories } = useListsStore();
  const { currentSelectedCategoryId } = useEstimateCreateStore();
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [name, setName] = useState(service.name);
  const [description, setDescription] = useState(service.description);
  const { showError, clearError } = useFormErrorStore();
  const [nameError, setNameError] = useState(""); // Added state for name error

  // Validation function
  const validateName = (value: string) => {
    if (value.length > 50) {
      setNameError("Service name must be less than 50 characters");
      return false;
    }
    if (!value.trim()) {
      setNameError("Service name is required");
      showError({
        field: "name",
        message: "Service name is required",
      });
      return false;
    } else {
      setNameError("");
      clearError();
      return true;
    }
  };

  async function handleUpdateService() {
    console.log(":::: Handle Edit ::::", name);

    // Validate the service name before proceeding
    if (!validateName(name)) {
      return;
    }

    console.log(":::: Handle Edit ::::", name);
    const res = await updateService({
      id: service.id,
      name: name,
      description: description || "",
      categoryId: category?.id,
      canned: true,
    });

    // Optionally handle the response (e.g., check for success or errors)
    if (res && "type" in res && res.type === "success") {
      successToast("Service updated successfully!");
      setIsEdit(false); // Exit edit mode only on success
    } else {
      // Handle error if needed (e.g., show a toast)
      errorToast(res?.message ?? "Update failed. Please try again.");
      console.error("Update failed:", res);
    }
  }

  useEffect(() => {
    if (currentSelectedCategoryId) {
      setCategory(
        categories.find((cat) => cat.id === currentSelectedCategoryId)!
      );
    }
  }, [currentSelectedCategoryId]);

  if (view === "card") {
    return (
      <Card
        className={cn(
          "w-full transition-all duration-200",
          index % 2 === 0 ? "bg-background" : "bg-[#F8FAFF]",
          isEdit ? "border-2 border-[#6571FF]" : ""
        )}
      >
        <CardHeader className="p-4">
          <div className="flex items-center justify-between">
            {!isEdit ? (
              <h3 className="line-clamp-1 text-xl font-bold">{service.name}</h3>
            ) : (
              <div className="flex-1">
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.length > 50) {
                      setNameError(
                        "Service name must be less than 50 characters"
                      );
                      return false;
                    }
                    setName(value);
                    if (value.trim()) {
                      setNameError("");
                      clearError();
                    }
                  }}
                  onBlur={() => validateName(name)}
                  className={`mr-2 flex-1 rounded-md border-2 ${
                    nameError ? "border-red-500" : "border-slate-400"
                  } p-2`}
                  aria-invalid={nameError ? "true" : "false"}
                  aria-describedby={nameError ? "name-error" : undefined}
                />
                {nameError && (
                  <span
                    id="name-error"
                    className="mt-1 block text-xs text-red-500"
                  >
                    {nameError}
                  </span>
                )}
              </div>
            )}
            <div className="flex items-center gap-2">
              {isEdit && (
                <button
                  onClick={handleUpdateService}
                  className="text-2xl text-[#6571FF]"
                >
                  <IoMdCheckmarkCircleOutline />
                </button>
              )}
              <button
                onClick={() => setIsEdit(!isEdit)}
                className="text-2xl text-[#6571FF]"
              >
                <SquarePen className="w-4 h-4 text-[#6571FF]" />
              </button>
              {!isEdit && (
                <Popconfirm
                  title="Delete the canned service"
                  description="Are you sure to delete this canned service?"
                  okText="Yes"
                  cancelText="No"
                  onConfirm={async () => {
                    await deleteService(service.id);
                    setIsEdit(false);
                  }}
                >
                  <FaTimes cursor={"pointer"} color="#f87171" fontSize={20} />
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
                <p className="line-clamp-1 text-lg text-[#6571FF]">
                  {service.category?.name}
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
              <p className="mb-1 text-sm text-[#66738C]">Description</p>
              {!isEdit ? (
                <p className="break-all text-[#66738C]">
                  {service.description}
                </p>
              ) : (
                <textarea
                  placeholder="Description"
                  value={description || ""}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[100px] w-full rounded-md border-2 border-slate-400 p-2"
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TableRow
      className={cn(
        index % 2 === 0 ? "bg-background" : "bg-[#F8FAFF]",
        "cursor-pointer rounded-md py-3"
      )}
    >
      <TableCell>
        {!isEdit ? (
          <span>{service.name}</span>
        ) : (
          <div>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => {
                const value = e.target.value;
                setName(value);
                if (value.trim()) {
                  setNameError("");
                  clearError();
                }
              }}
              onBlur={() => validateName(name)}
              className={`max-w-[150px] rounded-md border-2 ${
                nameError ? "border-red-500" : "border-slate-400"
              } p-1 px-4`}
              aria-invalid={nameError ? "true" : "false"}
              aria-describedby={nameError ? "name-error" : undefined}
            />
            {nameError && (
              <span id="name-error" className="mt-1 block text-xs text-red-500">
                {nameError}
              </span>
            )}
          </div>
        )}
      </TableCell>
      <TableCell>
        {!isEdit ? (
          <span>{service.category?.name}</span>
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
          <span className="max-w-[2rem] break-all">{service.description}</span>
        ) : (
          <div>
            <textarea
              placeholder="Description"
              value={description || ""}
              onChange={(e) => {
                const value = e.target.value;

                if (value.length > 250) {
                  toast.error("Description must be less than 250 characters");
                  return false;
                }
                setDescription(value);
              }}
              className="h-20 max-w-[150px] rounded-md border-2 border-slate-400 p-2"
            />
          </div>
        )}
      </TableCell>
      <TableCell className="flex items-center my-auto h-full">
        {isEdit && (
          <button
            onClick={handleUpdateService}
            className="mr-4 text-lg text-[#6571FF]"
          >
            <IoMdCheckmarkCircleOutline />
          </button>
        )}
        <button
          onClick={() => setIsEdit(!isEdit)}
          className="text-lg text-[#6571FF]"
        >
          <SquarePen className="w-4 h-4 text-[#6571FF]" />
        </button>
        <Popconfirm
          title="Delete the canned service"
          description="Are you sure to delete this canned service?"
          okText="Yes"
          cancelText="No"
          className="ml-3"
          onConfirm={async () => {
            await deleteService(service.id);
            setIsEdit(false);
          }}
        >
          <FaTimes cursor={"pointer"} color="#f87171" className="text-lg" />
        </Popconfirm>
      </TableCell>
    </TableRow>
  );
};
