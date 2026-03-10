"use client";

import InvoiceModal from "@/components/invoice-modal/InvoiceModal";
import { useEmployeeWorkFilterStore } from "@/stores/employeeWorkFilter";
import { User } from "@prisma/client";
import moment from "moment";
import { useEffect, useState } from "react";
import { SalesInfo } from "./employeeWorkInfoType";

export default function SalesInfoTable({
  info,
  employee,
}: {
  info: SalesInfo[];
  employee: User;
}) {
  const { amount, dateRange, search, service, category, status } =
    useEmployeeWorkFilterStore();
  const [filteredInfo, setFilteredInfo] = useState<SalesInfo[]>(info);

  useEffect(() => {
    let filtered = info;

    // Filter by search
    if (search) {
      const searchValue = search?.toLowerCase();
      filtered = filtered.filter((row) => {
        return row.Client[0].Invoice.some((invoice) => {
          return (
            invoice.id.toLowerCase().includes(searchValue) ||
            `${row.Client[0].firstName} ${row.Client[0].lastName}`
              .toLowerCase()
              .includes(searchValue) ||
            `${invoice.vehicle?.make} ${invoice.vehicle?.model}`
              .toLowerCase()
              .includes(searchValue)
          );
        });
      });
    }

    // Filter by date range
    if (dateRange[0] && dateRange[1]) {
      const [start, end] = dateRange;
      filtered = filtered.filter((row) => {
        const rowDate1 = moment(Number(row.assignedDate));
        const rowDate2 = moment(Number(row.columnChangedAt));
        return (
          (rowDate1.isSameOrAfter(start, "day") &&
            rowDate1.isSameOrBefore(end, "day")) ||
          (rowDate2.isSameOrAfter(start, "day") &&
            rowDate2.isSameOrBefore(end, "day"))
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
    if (category) {
      filtered = filtered.filter((row: any) => {
        const categoryName: string[] = row.invoice?.invoiceItems?.map(
          (item: any) => item?.service?.category?.name,
        );
        return !!categoryName.find((cate) => cate === category);
      });
    }

    // Filter by status
    if (status && status !== "All") {
      filtered = filtered.filter((row) => row.column?.title === status);
    }

    // Update the filtered info state
    setFilteredInfo(filtered);
  }, [search, dateRange, amount, service, category, status, info]);

  return (
    <div className="mt-5 w-full">
      <div className="lg:hidden">
        <div className="mx-5 mb-2.5 flex items-center justify-between font-bold text-[#66738C]">
          <p>Invoice/Estimate</p>
          <p>Status</p>
        </div>

        {filteredInfo.map((info, index) =>
          info.Client[0].Invoice.map((invoice) => (
            <div
              key={invoice.id}
              className="mb-1.5 flex items-center justify-between rounded-[5px] border border-[#BFC4FF] p-[10px] font-normal"
            >
              <InvoiceModal
                invoiceId={invoice.id}
                buttonChild={<button>{invoice.id}</button>}
                buttonChildClassName="text-blue-500 hover:underline"
              />
              <p>{info.column?.title}</p>
            </div>
          )),
        )}
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
            {filteredInfo.length > 0 ? (
              filteredInfo.map((row, index) =>
                row.Client[0].Invoice.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className={
                      index % 2 === 0 ? "bg-background" : "bg-blue-100"
                    }
                  >
                    <td className="border-b px-4 py-2 text-left">
                      <InvoiceModal
                        invoiceId={invoice.id}
                        buttonChild={<button>{invoice.id}</button>}
                        buttonChildClassName="text-blue-500 hover:underline"
                      />
                    </td>
                    <td className="border-b px-4 py-2 text-left">
                      {row.Client[0].firstName} {row.Client[0].lastName}
                    </td>
                    <td className="border-b px-4 py-2 text-left">
                      {invoice.vehicle?.make} {invoice.vehicle?.model}{" "}
                      {invoice.vehicle?.other}
                    </td>
                    <td className="border-b px-4 py-2 text-left">
                      {moment
                        .utc(Number(row.assignedDate))
                        .format("DD.MM.YYYY")}
                    </td>
                    <td className="border-b px-4 py-2 text-left">
                      {row.columnChangedAt
                        ? moment
                            .utc(Number(row.columnChangedAt))
                            .format("DD.MM.YYYY")
                        : "-"}
                    </td>
                    <td className="backdrop border-b px-4 py-2 text-left">
                      $
                      {(Number(invoice.grandTotal) *
                        Number(employee.commission)) /
                        100}
                    </td>
                    <td className="border-b py-2 text-center">
                      <p className="rounded-full px-2 py-0.5">
                        {invoice.column?.title}
                      </p>
                    </td>
                  </tr>
                )),
              )
            ) : (
              <tr>
                <td colSpan={8} className="border-b px-4 py-2 text-center">
                  No records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
