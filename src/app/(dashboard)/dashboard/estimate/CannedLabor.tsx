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
import { Category, Labor } from "@prisma/client";
import { Pagination } from "antd";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import FilterBySearchBox from "../reporting/components/filter/FilterBySearchBox";
import CannedFilterBySelection from "./CannedFilterBySelected";
import { CannedLaborItem } from "./CannedLaborItem";
import NewLabor from "./NewLabor";

export type TFilterModalState = {
  category: boolean;
};

export default function CannedLabor({
  labors,
  total,
  page,
  take,
  categories,
  compact = false,
}: {
  labors: (Labor & { category: Category })[];
  total: number;
  page: number;
  take: number;
  categories: Category[];
  compact?: boolean;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const selectedCategory = params.get("laborCategory") || "";
  const laborSearch = params.get("laborSearch") || "";
  const [showPagination, setShowPagination] = useState(false);
  const [activeModal, setActiveModal] = useState<{ [key: string]: boolean }>(
    {},
  );

  // Ref to scroll to top
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setShowPagination(total > 10);
  }, [total]);

  const handlePageChange = (nextPage: number, nextPageSize?: number) => {
    const searchParams = new URLSearchParams(params.toString());
    searchParams.set("laborPage", nextPage.toString());

    if (nextPageSize) {
      searchParams.set("laborTake", nextPageSize.toString());
    }

    const newPath = `${pathname}?${searchParams.toString()}`;
    router.push(newPath);

    // Scroll to top when page changes
    if (contentRef.current) {
      contentRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  //  Category names for dropdown
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
    <div ref={contentRef} className="h-full w-full flex flex-col">
      <section className="relative z-20 border-b border-gray-200 pb-4">
        <div className="flex items-center gap-x-4">
          <h3 className="text-xl font-extrabold text-gray-800 sm:text-2xl">
            Canned Labor
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
              searchText={laborSearch as string}
              paramKey="laborSearch"
              className="sm:min-w-0"
            />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <CannedFilterBySelection
              selectedItem={selectedCategory}
              items={uniqueCategories}
              type="laborCategory" // unique param for labors
              modalName="laborCategory"
              closeModal={closeModal}
              activeModal={activeModal}
              toggleModal={toggleModal}
              className="sm:w-40 xl:w-44"
            />
            <NewLabor
              newButton={
                <button
                  className="w-full shrink-0 whitespace-nowrap rounded-lg bg-gradient-to-r from-primary to-[#5a66ee] px-4 py-2.5 text-sm font-medium text-white shadow-indigo-500/30
                transition-all duration-200
                hover:-translate-y-0.5 hover:scale-[1.02]
                hover:shadow-xl hover:shadow-indigo-500/40
                active:translate-y-0 active:scale-100
                sm:w-auto"
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
      <div className="hidden flex-1 h-full md:block mt-4 border border-gray-200">
        <Table className="h-full min-w-[420px] border-separate border-spacing-0">
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="sticky top-0 z-10 whitespace-nowrap border-b border-gray-200 bg-gray-50 font-semibold text-gray-700">
                Labor Name
              </TableHead>
              <TableHead className="sticky top-0 z-10 whitespace-nowrap border-b border-gray-200 bg-gray-50 font-semibold text-gray-700">
                Category
              </TableHead>
              <TableHead className="sticky top-0 z-10 whitespace-nowrap border-b border-gray-200 bg-gray-50 font-semibold text-gray-700">
                $/Hour
              </TableHead>
              <TableHead className="sticky top-0 z-10 whitespace-nowrap border-b border-gray-200 bg-gray-50 font-semibold text-gray-700">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="overflow-y-auto h-full">
            {labors.length > 0 ? (
              labors.map((labor, index) => (
                <CannedLaborItem
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
      <div className="grid grid-cols-1 gap-4 pb-4 md:hidden mt-4">
        {labors.length > 0 ? (
          labors.map((labor, i) => (
            <CannedLaborItem
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

      {/* Mobile View */}
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
            simple={false}
            size="small"
          />
        </div>
      )}
    </div>
  );
}
