"use client";

import Link from "next/link";
import ConvertTo from "./ConvertTo";
import { CiEdit } from "react-icons/ci";
import moment from "moment";
import { cn } from "@/lib/cn";
import { useEstimateFilterStore } from "@/stores/estimate-filter";
import { useEffect, useState } from "react";
import { useActionStoreCreateEdit } from "@/stores/createEditStore";
import { useMediaQuery } from "react-responsive";
import ResponsiveEstimateCard from "@/components/mobile-responsive/estimate/ResponsiveEstimateCard";
import { formatCurrency } from "@/utils/formatCurrency";
import { convertInvoice } from "@/actions/estimate/invoice/convert";
import { errorToast, successToast } from "@/lib/toast";
import { Pagination } from "antd"; // Importing the Pagination component from Ant Design
import InvoiceModal from "@/components/invoice-modal/InvoiceModal";
import { useListsStore } from "@/stores/lists";
import { Column } from "@prisma/client";
import { updateServiceAutomationTrigger } from "@/service/service-maintenance-automation-trigger/api";

export interface InvoiceData {
  id: string;
  clientName: string;
  vehicle: string;
  email: string;
  phone: string;
  grandTotal: number;
  createdAt: Date;
  status?: string;
  type?: string;
  textColor?: string;
  bgColor?: string;
  clientId: number | null;
}

const evenColor = "bg-background";
const oddColor = "bg-[#F8FAFF]";

export default function Table({ data }: { data: InvoiceData[] }) {
  const { dateRange, status, search } = useEstimateFilterStore();
  const [filteredData, setFilteredData] = useState<InvoiceData[]>(data);
  const { setActionType } = useActionStoreCreateEdit();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [showPagination, setShowPagination] = useState(false);
  const allStatusesFromStore = useListsStore((x) => x.statuses);
  const [filteredStatuses, setFilteredStatuses] = useState<Column[]>([]);

  useEffect(() => {
    const shopStatuses = allStatusesFromStore.filter((x) => x.type === "shop");
    setFilteredStatuses(shopStatuses);
  }, [allStatusesFromStore]);

  const isMax640 = useMediaQuery({ query: "(max-width: 640px)" });

  useEffect(() => {
    const statusOrderMap = new Map(
      filteredStatuses.map((status) => [status.title, status.order]),
    );

    const filtered = data
      .filter((row) => {
        if (search) {
          const searchValue = search.toLowerCase();
          return (
            row.id.toLowerCase().includes(searchValue) ||
            row.clientName.toLowerCase().includes(searchValue) ||
            row.vehicle.toLowerCase().includes(searchValue)
          );
        }
        return true;
      })
      .filter((row) => {
        if (status.length > 0) {
          return status.includes(row.status || "");
        }
        return true;
      })
      .filter((row) => {
        if (dateRange) {
          const [start, end] = dateRange;
          if (start && end) {
            const rowDate = moment(row.createdAt);
            return (
              rowDate.isSameOrAfter(start, "day") &&
              rowDate.isSameOrBefore(end, "day")
            );
          }
        }
        return true;
      })
      .sort((a, b) => {
        const orderA = statusOrderMap.get(a.status as string) ?? Infinity;
        const orderB = statusOrderMap.get(b.status as string) ?? Infinity;

        if (orderA !== orderB) {
          return orderA - orderB;
        }

        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      });

    setFilteredData(filtered);
  }, [search, dateRange, status, data, filteredStatuses]);

  useEffect(() => {
    if (filteredData.length > 10) {
      setShowPagination(true);
    } else {
      setShowPagination(false);
    }
  }, [filteredData]);

  const handlePageChange = (page: number, pageSize?: number) => {
    setCurrentPage(page);
    if (pageSize) {
      setPageSize(pageSize);
    }
  };

  const paginatedData = filteredData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  // Handler for converting an invoice to an estimate or invoice
  const handleConvertedInvoice = async (id: string) => {
    const res = await convertInvoice(id);
    console.log(res);
    if (res.type === "success") {
      const checkEstimateOrInvoice =
        res.data.type === "Estimate" ? "Invoice" : "Estimate";
      successToast(
        `${checkEstimateOrInvoice} - ${id} converted to ${res.data.type}`,
      );

      if (res?.data?.type == "Invoice") {
        await updateServiceAutomationTrigger({
          companyId: res?.data?.companyId,
          estimateId: res?.data?.id,
          columnId: res?.data?.columnId!,
        });
      }
    } else if (res.type === "globalError") {
      errorToast(res.message);
    }
  };

  return (
    <div className="min-h-[65vh] overflow-x-scroll rounded-md bg-background xl:overflow-hidden">
      {isMax640 ? (
        <div className="flex w-full flex-col items-center justify-center gap-y-4">
          {filteredData.map((data, index) => (
            <ResponsiveEstimateCard
              onConvert={() => handleConvertedInvoice(data.id)}
              invoiceEstimate={data}
              key={data.id}
              index={index}
            />
          ))}
        </div>
      ) : (
        <table className="w-full">
          {/* Estimate Header */}
          <thead className="bg-background">
            <tr className="h-10 border-b">
              <th className="px-4 py-2 text-left">Invoice ID</th>
              <th className="px-4 py-2 text-left">Client</th>
              <th className="px-4 py-2 text-left">Vehicle</th>
              <th className="px-4 py-2 text-left">Email</th>
              <th className="px-4 py-2 text-left">Phone</th>
              <th className="px-4 py-2 text-left">Price</th>
              <th className="px-4 py-2 text-left">Date</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Edit</th>
            </tr>
          </thead>

          {/* Estimate List */}
          <tbody>
            {paginatedData.map((data, index) => (
              <tr
                key={data.id}
                className={cn("py-3", index % 2 === 0 ? evenColor : oddColor)}
              >
                <td className="px-4 py-2 text-left">
                  <InvoiceModal
                    invoiceId={data.id}
                    buttonChild={<button>{data.id}</button>}
                    buttonChildClassName="block w-full text-blue-600"
                  />
                </td>
                <td className="px-4 py-2 text-left">
                  <p className="block h-full w-full">{data.clientName}</p>
                </td>
                <td className="px-4 py-2 text-left">
                  <p className="block h-full w-full">{data.vehicle}</p>
                </td>
                <td className="px-4 py-2 text-left">
                  <p className="block h-full w-full">{data.email}</p>
                </td>
                <td className="px-4 py-2 text-left">
                  <p className="block h-full w-full">{data.phone}</p>
                </td>
                <td className="px-4 py-2 text-left text-[#006D77]">
                  <p className="block h-full w-full">
                    {formatCurrency(+data.grandTotal)}
                  </p>
                </td>
                <td className="px-4 py-2 text-left">
                  <p className="block h-full w-full">
                    {moment(data.createdAt).format("MM/DD/YYYY")}
                  </p>
                </td>
                <td className="px-4 py-2 text-left">
                  <p className="block h-full w-full">
                    <p
                      className="rounded-md text-center"
                      style={{
                        backgroundColor: data.bgColor,
                        color: data.textColor,
                      }}
                    >
                      {data.status || ""}
                    </p>
                  </p>
                </td>
                <td className="flex items-center gap-3 px-4 py-2">
                  <ConvertTo
                    onConvert={() => handleConvertedInvoice(data.id)}
                  />
                  <Link
                    href={`/dashboard/estimate/edit/${data.id}?clientId=${data.clientId}`}
                    className="text-2xl text-blue-600"
                    onClick={() => setActionType("edit")}
                  >
                    <CiEdit />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!isMax640 && showPagination && (
        <div className="mt-4 flex justify-end">
          <Pagination
            className="custom-pagination"
            current={currentPage}
            pageSize={pageSize}
            total={filteredData.length}
            onChange={handlePageChange}
            showSizeChanger
            onShowSizeChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
}
