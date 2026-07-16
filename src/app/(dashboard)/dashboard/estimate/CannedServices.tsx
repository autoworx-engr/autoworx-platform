"use client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
}: {
  services: (Service & { category: Category })[];
  total: number;
  page: number;
  take: number;
  categories: Category[];
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
    <div ref={containerRef} className="h-full w-full md:px-4 flex flex-col">
      <section className="relative z-20 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-x-4">
          <h3 className="text-2xl font-extrabold text-gray-800">
            Canned Services
          </h3>
        </div>
        {/* Updated layout to match Canned Labor: Search, Filter (Icon), Add Service (Button) on one line */}
        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between gap-y-3">
          <div className="flex-1">
            <FilterBySearchBox
              searchText={serviceSearch as string}
              paramKey="serviceSearch"
            />
          </div>
          <div className="flex items-center gap-3">
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
                  className="rounded-lg bg-gradient-to-r from-primary to-[#5a66ee] w-full min-w-32 md:w-36 p-2 text-white font-medium shadow-indigo-500/30
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
        </div>
      </section>
      {/* Desktop View */}
      <div className="hidden flex-1 h-full md:block mt-4 border border-gray-200">
        <Table className="border-separate border-spacing-0">
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="sticky top-0 z-10 bg-gray-50 font-semibold text-gray-700 border-b border-gray-200">
                Service Name
              </TableHead>
              <TableHead className="sticky top-0 z-10 bg-gray-50 font-semibold text-gray-700 border-b border-gray-200">
                Category
              </TableHead>
              <TableHead className="sticky top-0 z-10 bg-gray-50 font-semibold text-gray-700 border-b border-gray-200">
                Description
              </TableHead>
              <TableHead className="sticky top-0 z-10 bg-gray-50 font-semibold text-gray-700 border-b border-gray-200">
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
      <div className="grid h-full gap-4 pb-4 md:hidden mt-4">
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
        <div className="hidden h-10 justify-end lg:flex flex-shrink-0 mt-4">
          <Pagination
            className="custom-pagination"
            current={page}
            pageSize={take}
            total={total}
            onChange={handlePageChange}
            showSizeChanger
            onShowSizeChange={handlePageChange}
          />
        </div>
      )}
      {/* Mobile Pagination */}
      {showPagination && (
        <div className="flex justify-center lg:hidden flex-shrink-0 mt-4">
          <Pagination
            className="custom-pagination"
            current={page}
            pageSize={take}
            total={total}
            onChange={handlePageChange}
            showSizeChanger
            onShowSizeChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
}
