"use client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/cn";
import { Category, Service } from "@prisma/client";
import { Pagination } from "antd";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import FilterBySearchBox from "../reporting/components/filter/FilterBySearchBox";
import CannedFilterBySelection from "./CannedFilterBySelected";
import { CannedServiceItem } from "./CannedServiceItem";
import NewService from "./NewService";

const evenColor = "bg-background";
const oddColor = "bg-[#F8FAFF]";

export default function CannedServices({
  services,
  total,
  page,
  take,
  categories,
  compact = false,
}: {
  services: (Service & { category: Category })[];
  total: number;
  page: number;
  take: number;
  categories: Category[];
  compact?: boolean;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const selectedCategory = params.get("serviceCategory") || "";
  const serviceSearch = params.get("serviceSearch") || "";

  const [showPagination, setShowPagination] = useState(false);

  const [activeModal, setActiveModal] = useState<{ [key: string]: boolean }>(
    {},
  );

  // Ref to scroll to top - attach to the main container
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setShowPagination(total > 10);
  }, [total]);

  const handlePageChange = (nextPage: number, nextPageSize?: number) => {
    const searchParams = new URLSearchParams(params.toString());
    searchParams.set("servicePage", nextPage.toString());

    if (nextPageSize) {
      searchParams.set("serviceTake", nextPageSize.toString());
    }

    const newPath = `${pathname}?${searchParams.toString()}`;
    router.push(newPath);

    // Scroll to top when page changes
    if (containerRef.current) {
      containerRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  const uniqueCategories = categories;

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
    <div
      ref={containerRef}
      className={cn(
        "flex h-full w-full min-w-0 flex-col",
        compact && "lg:pl-4",
      )}
    >
      <section className="relative z-20 border-b border-gray-200 pb-4">
        <div className="flex items-center gap-x-4">
          <h3 className="text-xl font-extrabold text-gray-800 sm:text-2xl">
            Canned Services
          </h3>
        </div>

        <div
          className={cn(
            "mt-4 flex flex-col gap-3",
            compact
              ? "2xl:flex-row 2xl:items-center 2xl:justify-between"
              : "sm:flex-row sm:items-center sm:justify-between",
          )}
        >
          <div className="min-w-0 flex-1">
            <FilterBySearchBox
              searchText={serviceSearch as string}
              paramKey="serviceSearch"
              className="sm:min-w-0"
            />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <CannedFilterBySelection
              selectedItem={selectedCategory}
              items={uniqueCategories}
              type="serviceCategory" // unique param for services
              modalName="serviceCategory"
              closeModal={closeModal}
              activeModal={activeModal}
              toggleModal={toggleModal}
              className="sm:w-40 xl:w-44"
            />
            <NewService
              newButton={
                <button
                  className="w-full shrink-0 whitespace-nowrap rounded-lg bg-gradient-to-r from-primary to-[#5a66ee] px-4 py-2.5 text-sm font-medium text-white shadow-indigo-500/30
                transition-all duration-200
                hover:-translate-y-0.5 hover:scale-[1.02]
                hover:shadow-xl hover:shadow-indigo-500/40
                active:translate-y-0 active:scale-100
                sm:w-auto"
                >
                  + Add Service
                </button>
              }
            />
          </div>
        </div>
      </section>
      {/* Desktop View */}
      <div className="hidden flex-1 h-full md:block mt-4 border border-gray-200">
        <Table className="min-w-[480px] border-separate border-spacing-0">
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="sticky top-0 z-10 whitespace-nowrap border-b border-gray-200 bg-gray-50 font-semibold text-gray-700">
                Service Name
              </TableHead>
              <TableHead className="sticky top-0 z-10 whitespace-nowrap border-b border-gray-200 bg-gray-50 font-semibold text-gray-700">
                Category
              </TableHead>
              <TableHead className="sticky top-0 z-10 whitespace-nowrap border-b border-gray-200 bg-gray-50 font-semibold text-gray-700">
                Description
              </TableHead>
              <TableHead className="sticky top-0 z-10 whitespace-nowrap border-b border-gray-200 bg-gray-50 font-semibold text-gray-700">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.length > 0 ? (
              services.map((service, index) => (
                <CannedServiceItem
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
      <div className="grid grid-cols-1 h-full gap-4 pb-4 md:hidden mt-4">
        {services.length > 0 ? (
          services.map((service, i) => (
            <CannedServiceItem
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
        <div className="mt-4 hidden flex-shrink-0 justify-end overflow-x-auto lg:flex">
          <Pagination
            className="custom-pagination"
            current={page}
            pageSize={take}
            total={total}
            onChange={handlePageChange}
            showSizeChanger
            onShowSizeChange={handlePageChange}
            size="small"
          />
        </div>
      )}
      {/* Mobile Pagination */}
      {showPagination && (
        <div className="mt-4 flex flex-shrink-0 justify-center overflow-x-auto lg:hidden">
          <Pagination
            className="custom-pagination"
            current={page}
            pageSize={take}
            total={total}
            onChange={handlePageChange}
            showSizeChanger
            onShowSizeChange={handlePageChange}
            size="small"
          />
        </div>
      )}
    </div>
  );
}
