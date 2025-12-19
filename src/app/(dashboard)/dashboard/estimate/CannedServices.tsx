"use client";
import { deleteService } from "@/actions/estimate/service/deleteService";
import { updateService } from "@/actions/estimate/service/updateService";
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
import { useFormErrorStore } from "@/stores/form-error";
import { useListsStore } from "@/stores/lists";
import { Category, Service } from "@prisma/client";
import { Pagination, Popconfirm } from "antd";
import { CircleCheckBig, SquarePen, Trash2, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import FilterBySearchBox from "../reporting/components/filter/FilterBySearchBox";
import CannedFilterBySelection from "./CannedFilterBySelected";
import NewService from "./NewService";

const evenColor = "bg-background";
const oddColor = "bg-[#F8FAFF]";

export default function CannedServices({
  services,
}: {
  services: (Service & { category: Category })[];
}) {
  const params = useSearchParams();
  const selectedCategory = params.get("serviceCategory") || "";
  const serviceSearch = params.get("serviceSearch") || "";

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [showPagination, setShowPagination] = useState(false);
  const [filteredData, setFilteredData] =
    useState<(Service & { category: Category })[]>(services);

  const [activeModal, setActiveModal] = useState<{ [key: string]: boolean }>(
    {}
  );

  //  Filter logic
  useEffect(() => {
    const filtered = services.filter((row) => {
      const categoryName = row.category?.name?.toLowerCase() || "";

      const matchesSearch = serviceSearch
        ? row.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
          categoryName.includes(serviceSearch.toLowerCase())
        : true;

      const matchesCategory = selectedCategory
        ? categoryName === selectedCategory.toLowerCase()
        : true;

      return matchesSearch && matchesCategory;
    });

    setFilteredData(filtered);
    // Reset to page 1 whenever search or filter changes
    setCurrentPage(1);
  }, [services, serviceSearch, selectedCategory]);

  useEffect(() => {
    setShowPagination(filteredData.length > 10);
  }, [filteredData]);

  const handlePageChange = (page: number, pageSize?: number) => {
    setCurrentPage(page);
    if (pageSize) setPageSize(pageSize);
  };

  const paginatedServices = filteredData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const uniqueCategories = services
    .map((l) => l?.category)
    .filter((c): c is Category => !!c) // remove null or undefined categories
    .filter(
      (c, i, arr) => arr.findIndex((a) => a?.id === c?.id) === i // now all have .id safely
    );

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
    <div className="h-full w-full md:px-4 flex flex-col">
      <section className="pb-4 border-b border-gray-200">
        <div className="flex items-center gap-x-4">
          <h3 className="text-2xl font-extrabold text-gray-800">
            Canned Services
          </h3>
        </div>
        {/* Updated layout to match Canned Labor: Search, Filter (Icon), Add Service (Button) on one line */}
        <div className=" pt-3">
          <FilterBySearchBox
            searchText={serviceSearch as string}
            paramKey="serviceSearch"
          />
        </div>
        <div className="flex justify-between items-center mt-3">
          <CannedFilterBySelection
            selectedItem={selectedCategory}
            items={uniqueCategories}
            type="serviceCategory" // unique param for services
            modalName="serviceCategory"
            closeModal={closeModal}
            activeModal={activeModal}
            toggleModal={toggleModal}
          />
          <NewService
            newButton={
              <button
                className="rounded-lg bg-gradient-to-r from-[#6571FF] to-[#5a66ee] w-full min-w-32 md:w-36 p-2 text-white font-medium shadow-indigo-500/30
                hover:shadow-xl hover:shadow-indigo-500/40
                hover:-translate-y-0.5 hover:scale-[1.02]
                active:translate-y-0 active:scale-100
                transition-all duration-200"
              >
                + Add Service
              </button>
            }
          />
        </div>
      </section>
      {/* Desktop View */}
      <div className="overflow-y-auto thin-scrollbar hidden flex-1 h-full md:block mt-4">
        <Table className="h-full border border-gray-200 rounded-lg">
          <TableHeader className="sticky top-0 bg-gray-50 border-b border-gray-200">
            <TableRow>
              <TableHead className="font-semibold text-gray-700">
                Service Name
              </TableHead>
              <TableHead className="font-semibold text-gray-700">
                Category
              </TableHead>
              <TableHead className="font-semibold text-gray-700">
                Description
              </TableHead>
              <TableHead className="font-semibold text-gray-700">
                Actions
              </TableHead>
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
                  className="py-12 text-center text-gray-500 text-lg"
                >
                  No canned services available
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {/* Mobile View */}
      <div className="grid h-full gap-4 pb-4 md:hidden mt-4">
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
          <div className="rounded-xl bg-white p-8 text-center text-gray-500 shadow-lg border border-gray-100">
            No canned services available
          </div>
        )}
      </div>
      {showPagination && (
        <div className=" hidden h-10 justify-end lg:flex flex-shrink-0 mt-4">
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
  const [descriptionError, setDescriptionError] = useState(""); // Added state for description error

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
    // Validate the service name before proceeding
    if (!validateName(name)) {
      return;
    }

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
      // console.error("Update failed:", res);
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
          "w-full transition-all duration-300 rounded-xl shadow-lg border-t-4",
          index !== undefined && index % 2 === 0
            ? "border-indigo-500 bg-white"
            : "border-teal-500 bg-gray-50",
          isEdit
            ? "shadow-2xl ring-2 ring-indigo-400"
            : "shadow-md hover:shadow-lg"
        )}
      >
        <CardHeader className="p-4">
          <div className="flex items-start justify-between">
            {!isEdit ? (
              <h3 className="line-clamp-2 text-xl font-extrabold text-gray-800">
                {service.name}
              </h3>
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
                      return;
                    }
                    setName(value);
                    if (value.trim()) {
                      setNameError("");
                      clearError();
                    }
                  }}
                  onBlur={() => validateName(name)}
                  className={cn(
                    "w-full rounded-lg border p-2 text-base font-semibold focus:ring-2 focus:ring-indigo-500 transition-colors",
                    nameError
                      ? "border-red-500"
                      : "border-gray-300 focus:border-indigo-500"
                  )}
                  placeholder="Service Name"
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
            <div className="flex items-center gap-3 ml-4">
              {isEdit && (
                <button
                  onClick={handleUpdateService}
                  className="text-2xl text-green-600 hover:text-green-700 disabled:text-gray-400 transition-colors"
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
                  title="Delete the Canned Service"
                  description="Are you sure to delete this Canned Service?"
                  okText="Yes"
                  cancelText="No"
                  onConfirm={async () => {
                    await deleteService(service.id);
                    setIsEdit(false);
                  }}
                >
                  <Trash2 className="w-5 h-5 text-red-500 hover:text-red-700 cursor-pointer transition-colors" />
                </Popconfirm>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="space-y-4">
            <div>
              <p className="mb-1 text-sm font-medium text-gray-500">Category</p>
              {!isEdit ? (
                <p className="line-clamp-1 text-lg font-semibold text-indigo-600">
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
              <p className="mb-1 text-sm font-medium text-gray-500">
                Description
              </p>
              {!isEdit ? (
                <p className="break-all whitespace-pre-wrap text-gray-700">
                  {service.description}
                </p>
              ) : (
                <>
                  <textarea
                    placeholder="Description"
                    value={description || ""}
                    onChange={(e) => {
                      const value = e.target.value;

                      if (value.length > 250) {
                        setDescriptionError(
                          "Description must be less than 250 characters"
                        );
                        return;
                      }
                      setDescription(value);
                      setDescriptionError("");
                    }}
                    className={cn(
                      "min-h-[100px] w-full rounded-lg border p-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 transition-colors",
                      descriptionError ? "border-red-500" : "border-gray-300"
                    )}
                  />
                  {descriptionError && (
                    <p className="mt-1 text-xs text-red-500">
                      {descriptionError}
                    </p>
                  )}
                </>
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
        "border-b border-gray-200 transition-colors hover:bg-indigo-50",
        index % 2 === 0 ? "bg-white" : "bg-gray-50",
        isEdit ? "bg-yellow-50 shadow-inner" : ""
      )}
    >
      <TableCell className="py-3">
        {!isEdit ? (
          <span className="font-medium text-gray-800">{service.name}</span>
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
              className={cn(
                "w-full min-w-[150px] rounded-md border p-1 px-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500",
                nameError ? "border-red-500" : "border-gray-300"
              )}
              placeholder="Service Name"
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
      <TableCell className="py-3">
        {!isEdit ? (
          <span className="text-gray-600">{service.category?.name}</span>
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
      <TableCell className="py-3">
        {!isEdit ? (
          <span className="line-clamp-2 max-w-[250px] whitespace-pre-wrap break-all text-gray-700">
            {service.description}
          </span>
        ) : (
          <div>
            <textarea
              placeholder="Description"
              value={description || ""}
              onChange={(e) => {
                const value = e.target.value;

                if (value.length > 250) {
                  setDescriptionError(
                    "Description must be less than 250 characters"
                  );
                  return;
                }
                setDescription(value);
                setDescriptionError("");
              }}
              className={cn(
                "h-20 max-w-[250px] w-full rounded-md border p-1 px-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500",
                descriptionError ? "border-red-500" : "border-gray-300"
              )}
            />
            {descriptionError && (
              <p className="mt-1 text-xs text-red-500">{descriptionError}</p>
            )}
          </div>
        )}
      </TableCell>
      <TableCell className="flex items-center space-x-3 py-3 h-full">
        {isEdit && (
          <div className="flex items-center space-x-2">
            <button onClick={() => setIsEdit(false)} title="Cancel Edit">
              <X
                color="#f87171"
                className="w-5 h-5 hover:text-red-700 transition-colors"
              />
            </button>
            <button
              onClick={handleUpdateService}
              className="text-lg text-indigo-600 hover:text-indigo-700 disabled:cursor-not-allowed disabled:text-gray-400 transition-colors"
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
          title="Delete the canned service"
          description="Are you sure to delete this canned service?"
          okText="Yes"
          cancelText="No"
          onConfirm={async () => {
            await deleteService(service.id);
            setIsEdit(false);
          }}
        >
          <Trash2 className="w-5 h-5 text-red-500 hover:text-red-700 cursor-pointer transition-colors" />
        </Popconfirm>
      </TableCell>
    </TableRow>
  );
};
