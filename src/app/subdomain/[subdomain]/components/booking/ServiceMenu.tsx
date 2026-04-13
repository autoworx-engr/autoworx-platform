import { ServiceCard } from "./ServiceCard";

import { cn } from "@/lib/utils";

import { useBooking } from "../../context/BookingContext";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "../ui/Skeleton";

export const ServiceMenu = ({ isLoading }: { isLoading?: boolean }) => {
  const {
    services,
    categories,
    selectedCategory,
    setSelectedCategory,
    currentPage,
    setCurrentPage,
    totalPages,
    hasNextPage,
    hasPrevPage,
  } = useBooking();

  // Use API categories if available, otherwise show "All" only
  const displayCategories =
    categories.length > 0 ? ["All", ...categories] : ["All"];

  const filtered = services;

  const handlePreviousPage = () => {
    if (hasPrevPage) {
      setCurrentPage(currentPage - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleNextPage = () => {
    if (hasNextPage) {
      setCurrentPage(currentPage + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Our Services</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Select services to build your appointment
        </p>
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none -mx-1 px-1">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <Skeleton
                key={i}
                className="h-8 w-20 rounded-full flex-shrink-0"
              />
            ))
          : displayCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  setCurrentPage(1); // Reset to page 1 when changing category
                }}
                className={cn(
                  "px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-secondary",
                )}
              >
                {cat}
              </button>
            ))}
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border p-4 space-y-4">
              <Skeleton className="h-44 w-full rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <div className="flex justify-between items-center pt-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-9 w-24 rounded-lg" />
              </div>
            </div>
          ))
        ) : filtered.length > 0 ? (
          filtered.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))
        ) : (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            No services found in this category
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between mt-8 pt-6 border-t">
          <button
            onClick={handlePreviousPage}
            disabled={!hasPrevPage}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors",
              hasPrevPage
                ? "bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
                : "bg-muted text-muted-foreground cursor-not-allowed opacity-50",
            )}
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          <div className="text-sm text-muted-foreground">
            Page{" "}
            <span className="font-semibold text-foreground">{currentPage}</span>{" "}
            of{" "}
            <span className="font-semibold text-foreground">{totalPages}</span>
          </div>

          <button
            onClick={handleNextPage}
            disabled={!hasNextPage}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors",
              hasNextPage
                ? "bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
                : "bg-muted text-muted-foreground cursor-not-allowed opacity-50",
            )}
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
