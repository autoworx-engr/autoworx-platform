"use client";
import { getWorkOrders } from "@/actions/pipelines/getWorkOrders";
import CarLoading from "@/components/common/CarLoading";
import ResponsiveShopPipelineCard from "@/components/mobile-responsive/pipeline/ResponsiveShopPipelineCard";
import WorkOrdersTableSkeleton from "@/components/ui/WorkOrdersTableSkeleton";
import WorkOrderModal from "@/components/workorder-modal/WorkOrderModal";
import { useServerGet } from "@/hooks/useServerGet";
import { cn } from "@/lib/cn";
import { Search } from "lucide-react";
import { useEstimateFilterStore } from "@/stores/estimate-filter";
import { usePipelineFilterStore } from "@/stores/PipelineFilterStore";
import SessionUserType from "@/types/sessionUserType";
import { Pagination } from "antd";
import moment from "moment";
import { useEffect, useState } from "react";
import Filter from "./Filter";

const WorkOrders = () => {
  const { data: invoices, setData: setInvoices } = useServerGet(getWorkOrders);
  const { search } = useEstimateFilterStore();
  const { dateRange, status, service, resetStatus } = usePipelineFilterStore();
  const [currentUser, setCurrentUser] = useState<SessionUserType>();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, dateRange, status, service]);

  useEffect(() => {
    resetStatus();
    const fetchUser = async () => {
      const response = await fetch("/api/getUser");
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data);
      }
    };
    fetchUser();
  }, []);

  const currentUserId = currentUser?.id;
  const isTechnician = currentUser?.employeeType === "Technician";
  const type = "shop";

  const filteredInvoices = invoices?.filter((invoice) => {
    const mathcedType = invoice.type === "Invoice";
    const matchesSearch = (() => {
      if (!search) return true;

      const searchLower = search.toLowerCase();
      const words = searchLower.split(/\s+/).filter(Boolean);

      const fullName =
        `${invoice.client?.firstName ?? ""} ${invoice.client?.lastName ?? ""}`.toLowerCase();
      const vehicleString =
        `${invoice.vehicle?.year ?? ""} ${invoice.vehicle?.make ?? ""} ${invoice.vehicle?.model ?? ""} ${invoice.vehicle?.submodel ?? ""} ${invoice.vehicle?.other ?? ""}`
          .toLowerCase()
          .trim();

      const matchesAllWords = (haystack: string) =>
        words.every((word) => haystack.includes(word));

      return (
        matchesAllWords(fullName) ||
        invoice.id?.toString().toLowerCase().includes(searchLower) ||
        matchesAllWords(vehicleString) ||
        invoice.invoiceItems.some((item) =>
          item.service?.name?.toLowerCase().includes(searchLower),
        )
      );
    })();

    const matchesStatus = status ? invoice.column?.title === status : true;

    const matchesDateRange =
      dateRange[0] && dateRange[1]
        ? (() => {
            const invoiceDate = invoice.workOrderCreatedAt
              ? new Date(invoice.workOrderCreatedAt)
              : null;
            const startDate = new Date(dateRange[0]);
            const endDate = new Date(dateRange[1]);
            endDate.setHours(23, 59, 59, 999); // Include the entire end day

            // return invoiceDate >= startDate && invoiceDate <= endDate;
            return invoiceDate
              ? invoiceDate >= startDate && invoiceDate <= endDate
              : false;
          })()
        : true;

    const matchesService = service
      ? invoice.invoiceItems.some((item) => item.service?.name === service)
      : true;

    const matchesTechnician = isTechnician
      ? invoice.invoiceItems.some((item) =>
          item.service?.Technician.some(
            (tech) => tech.userId === Number(currentUserId),
          ),
        )
      : true;
    const matchesColumnTitle = invoice.column?.title !== "Delivered";

    return (
      mathcedType &&
      matchesSearch &&
      matchesStatus &&
      matchesDateRange &&
      matchesService &&
      matchesTechnician &&
      matchesColumnTitle
    );
  });

  const sortedInvoices = filteredInvoices?.sort((a, b) => {
    return (
      new Date(b.workOrderCreatedAt as Date).getTime() -
      new Date(a.workOrderCreatedAt as Date).getTime()
    );
  });

  const paginatedInvoices = sortedInvoices?.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const handlePageChange = (page: number, size?: number) => {
    setCurrentPage(page);
    if (size) setPageSize(size);
  };

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8 px-2">
      <Filter pipelineType={type} />
      <div className="w-full p-4 bg-background dark:bg-slate-950 min-h-[65vh] flex flex-col rounded-lg drop-shadow-[0_4px_4px_rgb(0_0_0_/_0.25)]">
        <div className="mx-auto flex-1 flex flex-col space-y-6 w-full">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-600 dark:text-slate-100">
              Work Orders{" "}
              <span className="text-slate-400 font-normal">
                ({sortedInvoices?.length ?? 0})
              </span>
            </h3>
          </div>

          <div className="relative flex flex-1 h-full flex-col overflow-hidden rounded-md bg-background">
            <div className="flex-1 overflow-auto [ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {/* Mobile View */}
              <div className="lg:hidden p-4 space-y-4">
                {!invoices ? (
                  <WorkOrdersTableSkeleton rows={5} />
                ) : !paginatedInvoices || paginatedInvoices.length === 0 ? (
                  <WorkOrdersEmptyState />
                ) : (
                  paginatedInvoices.map((invoice, index) => (
                    <ResponsiveShopPipelineCard
                      key={index}
                      invoice={invoice}
                      index={index}
                    />
                  ))
                )}
              </div>

              {/* Desktop View */}
              <div className="hidden lg:block">
                {!invoices ? (
                  <WorkOrdersTableSkeleton rows={15} />
                ) : !paginatedInvoices || paginatedInvoices.length === 0 ? (
                  <WorkOrdersEmptyState />
                ) : (
                  <table className="w-full border-separate border-spacing-0">
                    <thead className="sticky top-0 z-10 bg-white shadow-sm">
                      <tr className="h-10 border-b">
                        <th className="px-4 py-2 text-left">Work Order#</th>
                        <th className="px-4 py-2 text-left">Client </th>
                        <th className="px-4 py-2 text-left">Vehicle Info</th>
                        <th className="px-4 py-2 text-left">Services</th>
                        <th className="px-4 py-2 text-left">Time Created</th>
                        <th className="px-4 py-2 text-left">Due Date</th>
                        <th className="px-4 py-2 text-left">Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {paginatedInvoices.map((invoice, index) => {
                        const id = invoice.id;
                        const client =
                          (invoice.client?.firstName ?? "") +
                          " " +
                          (invoice.client?.lastName ?? "");
                        const vehicle = `${invoice.vehicle?.year ?? ""} ${invoice.vehicle?.make ?? ""} ${invoice.vehicle?.model ?? ""} ${invoice.vehicle?.other ?? ""}`;
                        const serviceString = invoice.invoiceItems
                          .map((item) => item.service?.name)
                          .join(", ");
                        // TODO: this hasn't been tested properly. Need to test it.
                        const timeCreated = moment(
                          invoice.workOrderCreatedAt,
                        ).format("MM/DD/YYYY");
                        const dueDate = invoice.dueDate
                          ? moment(invoice.dueDate).format("MM/DD/YYYY")
                          : null;

                        return (
                          <tr
                            key={index}
                            className={cn(
                              "py-3",
                              index % 2 === 0
                                ? "bg-background"
                                : "bg-[#F8FAFF]",
                            )}
                          >
                            <td className="px-4 py-2 text-left">
                              <WorkOrderModal
                                invoiceId={id}
                                buttonChild={
                                  <button className="text-primary">{id}</button>
                                }
                                onWorkOrderCreated={async () =>
                                  setInvoices(await getWorkOrders())
                                }
                              />
                            </td>
                            <td className="px-4 py-2 text-left">{client}</td>
                            <td className="px-4 py-2 text-left">{vehicle}</td>
                            <td className="px-4 py-2 text-left">
                              {serviceString}
                            </td>
                            <td className="px-4 py-2 text-left">
                              {timeCreated}
                            </td>

                            <td className="px-4 py-2 text-left">{dueDate}</td>
                            <td className="px-4 py-2 text-left">
                              {invoice.column?.title}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {sortedInvoices && sortedInvoices.length > 10 && (
              <div className="mt-auto flex shrink-0 justify-end bg-white px-4 py-2 shadow-[0_-1px_2px_rgba(0,0,0,0.04)]">
                <Pagination
                  className="custom-pagination"
                  current={currentPage}
                  pageSize={pageSize}
                  total={sortedInvoices.length}
                  onChange={handlePageChange}
                  showSizeChanger
                  onShowSizeChange={handlePageChange}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

function WorkOrdersEmptyState() {
  return (
    <div className="flex min-h-[calc(100vh-250px)] w-full flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-slate-100 bg-slate-50/30 p-12 text-center">
      <div className="relative mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/50">
        <Search size={24} className="text-slate-300" strokeWidth={1.5} />
        <div className="absolute inset-0 animate-ping rounded-3xl bg-slate-100 opacity-20" />
      </div>
      <h3 className="mb-2 text-lg font-bold text-slate-500">
        No Results Found
      </h3>
      <p className="max-w-[280px] text-sm font-medium leading-relaxed text-slate-400">
        We couldn&apos;t find what you&apos;re looking for. Try adjusting your
        filters or search terms.
      </p>
    </div>
  );
}

export default WorkOrders;
