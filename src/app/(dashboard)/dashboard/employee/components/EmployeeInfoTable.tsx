"use client";

import WorkOrderModal from "@/components/workorder-modal/WorkOrderModal";
import { WORK_ORDER_STATUS_COLOR } from "@/lib/consts";
import { useEmployeeWorkFilterStore } from "@/stores/employeeWorkFilter";
import moment from "moment-timezone";
import React, { useEffect } from "react";
import { Pagination } from "antd";
import { EmployeeWorkInfo } from "./employeeWorkInfoType";
import { useCompanyTimezone } from "@/hooks/useCompanyTimezone";
import { convertDateToMidnightInTimezone } from "@/utils/convertDateToMidnightInTimezone";

export default function EmployeeInfoTable({
  info,
}: {
  info: EmployeeWorkInfo;
}) {
  const timezone = useCompanyTimezone();
  const { amount, dateRange, search, service, category, status } =
    useEmployeeWorkFilterStore();
  const [filteredInfo, setFilteredInfo] =
    React.useState<EmployeeWorkInfo>(info);

  // Pagination state
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const [pageSize, setPageSize] = React.useState<number>(20);

  useEffect(() => {
    let filtered = info;

    // Filter by search
    if (search) {
      const searchValue = search?.toLowerCase();
      filtered = filtered.filter((row) => {
        return (
          row.invoice?.id.toLowerCase().includes(searchValue) ||
          `${row.invoice?.client?.firstName} ${row.invoice?.client?.lastName}`
            .toLowerCase()
            .includes(searchValue) ||
          `${row.invoice?.vehicle?.make} ${row.invoice?.vehicle?.model}`
            .toLowerCase()
            .includes(searchValue)
        );
      });
    }

    if (dateRange[0] && dateRange[1]) {
      const [start, end] = dateRange;

      // Safely convert to YYYY-MM-DD string to prevent local time leakage
      const startStr = moment(start).format("YYYY-MM-DD");
      const endStr = moment(end).format("YYYY-MM-DD");

      // Rebuild moment using Detroit timezone from date strings
      const convertedStart = moment.tz(startStr, timezone).startOf("day").utc();
      const convertedEnd = moment.tz(endStr, timezone).endOf("day").utc();

      filtered = filtered.filter((row) => {
        const rowDate = moment.utc(row.dateClosed); // Backend returns UTC

        if (
          rowDate.isSameOrAfter(convertedStart) &&
          rowDate.isSameOrBefore(convertedEnd)
        ) {
          return true;
        }
        return false;
      });
    }

    // Filter by amount
    if (amount) {
      filtered = filtered.filter((row) => {
        return (
          Number(row.amount) >= amount[0] && Number(row.amount) <= amount[1]
        );
      });
    }

    // Filter by service
    if (service) {
      filtered = filtered.filter((row: any) => {
        const serviceName: string[] = row.invoice?.invoiceItems?.map(
          (item: any) => item?.service?.name,
        );
        return !!serviceName.find((s) => s === service);
      });
    }

    // Filter by category
    // if (category) {
    //   filtered = filtered.filter((row: any) => {
    //     const categoryName: string[] = row.invoice?.invoiceItems?.map(
    //       (item: any) => item?.service?.category?.name
    //     );
    //     return !!categoryName.find((cate) => cate === category);
    //   });
    // }

    // Filter by status
    if (status && status !== "All") {
      filtered = filtered.filter((row) => row.status === status);
    }

    // Update the filtered info state
    setFilteredInfo(filtered);
    // reset to first page
    setCurrentPage(1);
  }, [search, dateRange, amount, service, category, status, info]);

  const totalItems = filteredInfo.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
    if (currentPage < 1) setCurrentPage(1);
  }, [currentPage, totalPages]);

  const pageStart = (currentPage - 1) * pageSize;
  const pageEnd = pageStart + pageSize;
  const paginatedInfo = filteredInfo.slice(pageStart, pageEnd);

  const handlePageChange = (page: number, size: number) => {
    setCurrentPage(page);
    if (size && size !== pageSize) setPageSize(size);
  };

  return (
    <div className="mt-5 w-full pb-20">
      <div className="lg:hidden">
        <div className="mx-2 mb-2.5 flex items-center justify-between font-bold text-[#66738C]">
          <p>Invoice/Estimate</p>
        </div>
        {paginatedInfo.map((info, index) => (
          <div
            key={index}
            className="mx-1 mb-1.5 flex justify-between rounded-[5px] border border-[#BFC4FF] p-[10px] font-normal"
          >
            <div>
              <p>
                <WorkOrderModal
                  invoiceId={info.invoice?.id!}
                  buttonChild={
                    <button className="text-blue-500">
                      {info.invoice?.id}
                    </button>
                  }
                />
              </p>
              <p className="font-medium">
                {info.invoice?.vehicle?.year || ""}{" "}
                {info.invoice?.vehicle?.make} {info.invoice?.vehicle?.model}{" "}
                {info.invoice?.vehicle?.other}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Assigned:{" "}
                {info.date
                  ? moment.tz(info.date, timezone).format("DD.MM.YYYY")
                  : "-"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Closed:{" "}
                {info.dateClosed
                  ? moment.tz(info.dateClosed, timezone).format("DD.MM.YYYY")
                  : "-"}
              </p>
            </div>
            <div>
              <p>
                Status: <span className="font-medium">{info.status}</span>
              </p>
              <p>
                Total Payout: <span>${Number(info.amount)}</span>
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden lg:block">
        <table className="w-full min-w-full bg-background">
          <thead>
            <tr>
              <th className="border-b px-4 py-2 text-left">Invoice/Estimate</th>
              <th className="border-b px-4 py-2 text-left">Client Name</th>
              <th className="border-b px-4 py-2 text-left">Vehicle Info</th>
              <th className="border-b px-4 py-2 text-left">Date Assigned</th>
              <th className="border-b px-4 py-2 text-left">Date Closed</th>
              <th className="border-b px-4 py-2 text-left">Total Payout</th>
              <th className="border-b px-4 py-2 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {paginatedInfo.length > 0 ? (
              paginatedInfo.map((row, index) => (
                <tr
                  key={index}
                  className={index % 2 === 0 ? "bg-background" : "bg-blue-100"}
                >
                  <td className="border-b px-4 py-2 text-left">
                    <WorkOrderModal
                      invoiceId={row.invoice?.id!}
                      buttonChild={
                        <button className="text-blue-500">
                          {row.invoice?.id}
                        </button>
                      }
                    />
                  </td>
                  <td className="border-b px-4 py-2 text-left">
                    {row.invoice?.client?.firstName}{" "}
                    {row.invoice?.client?.lastName}
                  </td>
                  <td className="border-b px-4 py-2 text-left">
                    {row.invoice?.vehicle?.make} {row.invoice?.vehicle?.model}{" "}
                    {row.invoice?.vehicle?.other}
                  </td>
                  <td className="border-b px-4 py-2 text-left">
                    {moment.tz(row.date, timezone).format("DD.MM.YYYY")}
                  </td>
                  <td className="border-b px-4 py-2 text-left">
                    {row.dateClosed
                      ? moment.tz(row.dateClosed, timezone).format("DD.MM.YYYY")
                      : "-"}
                  </td>
                  <td className="backdrop border-b px-4 py-2 text-left">
                    ${Number(row.amount)}
                  </td>
                  <td className="border-b py-2 text-center">
                    <p
                      style={{
                        backgroundColor: WORK_ORDER_STATUS_COLOR[row.status!],
                      }}
                      className="rounded-full px-2 py-0.5 text-white"
                    >
                      {row.status}
                    </p>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="border-b px-4 py-2 text-center">
                  No records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {/* Desktop pagination  */}
        <div className="mt-3 flex items-center justify-end">
          <Pagination
            className="custom-pagination"
            current={currentPage}
            pageSize={pageSize}
            total={totalItems}
            onChange={(page, size) => {
              handlePageChange(page, size!);
            }}
            showSizeChanger
          />
        </div>
      </div>
      {/* Mobile pagination */}
      <div className="lg:hidden mx-2 mt-2 mb-6 flex items-center justify-center">
        <Pagination
          current={currentPage}
          pageSize={pageSize}
          total={totalItems}
          onChange={(page, size) => {
            handlePageChange(page, size!);
          }}
          showSizeChanger
          pageSizeOptions={["5", "10", "25"]}
          size="small"
        />
      </div>
    </div>
  );
}
