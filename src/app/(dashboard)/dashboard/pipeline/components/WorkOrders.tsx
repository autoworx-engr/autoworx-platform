"use client";
import { getWorkOrders } from "@/actions/pipelines/getWorkOrders";
import CarLoading from "@/components/common/CarLoading";
import ResponsiveShopPipelineCard from "@/components/mobile-responsive/pipeline/ResponsiveShopPipelineCard";
import WorkOrdersTableSkeleton from "@/components/ui/WorkOrdersTableSkeleton";
import WorkOrderModal from "@/components/workorder-modal/WorkOrderModal";
import { useServerGet } from "@/hooks/useServerGet";
import { cn } from "@/lib/cn";
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
    <div className="mx-1 space-y-8 bg-background px-3 py-1">
      <Filter pipelineType={type} />
      <div>
        {/* card list view  */}
        <div className="overflow-y-auto lg:hidden">
          {paginatedInvoices &&
            paginatedInvoices.map((invoice, index) => {
              return (
                <ResponsiveShopPipelineCard
                  key={index}
                  invoice={invoice}
                  index={index}
                />
              );
            })}
          {sortedInvoices && sortedInvoices.length > 10 && (
            <div className="mt-4 flex justify-center">
              <Pagination
                current={currentPage}
                pageSize={pageSize}
                total={sortedInvoices.length}
                onChange={handlePageChange}
                simple
              />
            </div>
          )}
        </div>
        {!invoices ? (
          <WorkOrdersTableSkeleton rows={15} />
        ) : !paginatedInvoices ? (
          <div className="flex h-[70vh] pb-10 w-full items-center justify-center">
            <CarLoading />
          </div>
        ) : (
          <>
            <table className="hidden w-full h-full shadow-md lg:table">
              <thead className="bg-background">
                <tr className="h-10 border-b">
                  <th className="border-b px-4 py-2 text-left">Work Order#</th>
                  <th className="border-b px-4 py-2 text-left">Client </th>
                  <th className="border-b px-4 py-2 text-left">Vehicle Info</th>
                  <th className="border-b px-4 py-2 text-left">Services</th>
                  <th className="border-b px-4 py-2 text-left">Time Created</th>
                  <th className="border-b px-4 py-2 text-left">Due Date</th>
                  <th className="border-b px-4 py-2 text-left">Status</th>
                </tr>
              </thead>

              <tbody>
                {paginatedInvoices.length > 0 ? (
                  paginatedInvoices?.map((invoice, index) => {
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
                          "rounded-md",
                          index % 2 === 0 ? "bg-background" : "bg-blue-100",
                        )}
                      >
                        <td className="border-b px-4 py-2 text-left">
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
                        <td className="border-b px-4 py-2 text-left">
                          {client}
                        </td>
                        <td className="border-b px-4 py-2 text-left">
                          {vehicle}
                        </td>
                        <td className="border-b px-4 py-2 text-left">
                          {serviceString}
                        </td>
                        <td className="border-b px-4 py-2 text-left">
                          {timeCreated}
                        </td>

                        <td className="border-b px-4 py-2 text-left">
                          {dueDate}
                        </td>
                        <td className="border-b px-4 py-2 text-left">
                          {invoice.column?.title}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center py-10">
                      No work orders found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {sortedInvoices && sortedInvoices.length > 10 && (
              <div className="mt-4 hidden items-center justify-end lg:flex">
                <Pagination
                  current={currentPage}
                  pageSize={pageSize}
                  total={sortedInvoices.length}
                  onChange={handlePageChange}
                  showSizeChanger
                  onShowSizeChange={handlePageChange}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default WorkOrders;
