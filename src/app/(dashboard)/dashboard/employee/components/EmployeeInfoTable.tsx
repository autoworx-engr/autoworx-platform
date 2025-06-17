"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { EmployeeWorkInfo } from "./employeeWorkInfoType";
import moment from "moment";
import { WORK_ORDER_STATUS_COLOR } from "@/lib/consts";
import { useEmployeeWorkFilterStore } from "@/stores/employeeWorkFilter";
import InvoiceModal from "@/components/invoice-modal/InvoiceModal";
import WorkOrderModal from "@/components/workorder-modal/WorkOrderModal";

export default function EmployeeInfoTable({
  info,
}: {
  info: EmployeeWorkInfo;
}) {
  const { amount, dateRange, search, service, category, status } =
    useEmployeeWorkFilterStore();
  const [filteredInfo, setFilteredInfo] =
    React.useState<EmployeeWorkInfo>(info);

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

    // Filter by date range
    if (dateRange[0] && dateRange[1]) {
      const [start, end] = dateRange;
      filtered = filtered.filter((row) => {
        const rowDate = moment(Number(row.dateClosed));
        return (
          rowDate.isSameOrAfter(start, "day") &&
          rowDate.isSameOrBefore(end, "day")
        );
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
      filtered = filtered.filter((row) => row.status === status);
    }

    // Update the filtered info state
    setFilteredInfo(filtered);
  }, [search, dateRange, amount, service, category, status, info]);

  console.log(info);

  return (
    <div className="mt-5 w-full pb-20">
      <div className="lg:hidden">
        <div className="mx-2 mb-2.5 flex items-center justify-between font-bold text-[#66738C]">
          <p>Invoice/Estimate</p>
        </div>
        {filteredInfo.map((info, index) => (
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
                {info.invoice?.vehicle?.year} {info.invoice?.vehicle?.make}{" "}
                {info.invoice?.vehicle?.model}
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
            {filteredInfo.map((row, index) => (
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
                  {row.invoice?.vehicle?.make} {row.invoice?.vehicle?.model}
                </td>
                <td className="border-b px-4 py-2 text-left">
                  {moment.utc(Number(row.date)).format("DD.MM.YYYY")}
                </td>
                <td className="border-b px-4 py-2 text-left">
                  {row.dateClosed
                    ? moment.utc(Number(row.dateClosed)).format("DD.MM.YYYY")
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
