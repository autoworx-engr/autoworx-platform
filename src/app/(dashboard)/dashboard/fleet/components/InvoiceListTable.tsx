"use client";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/DropdownMenu";
import InvoiceModal from "@/components/invoice-modal/InvoiceModal";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/utils/formatCurrency";
import { FleetStatement, Invoice } from "@prisma/client";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

const getPaymentStatus = (item: any) => {
  if (!(Number(item?.grandTotal) > 0)) return "N/A";
  return Number(item?.due) == 0 ? "Paid" : "Unpaid";
};

const InvoiceListTable = ({
  invoiceData,
  type = "invoice",
}: {
  invoiceData: Invoice[] | FleetStatement | any;
  type: string;
}) => {
  const [paymentFilters, setPaymentFilters] = useState<string[]>([]);
  const [statusFilters, setStatusFilters] = useState<string[]>([]);

  //status
  const uniqueStatuses = Array.from(
    new Map(
      invoiceData
        .filter((item: any) => item.column?.title)
        .map((item: any, index: number) => [
          item.column.id,
          { status: item.column?.title, id: index },
        ]),
    ).values(),
  );

  const filteredData = invoiceData.filter((item: any) => {
    const paymentMatch =
      paymentFilters.length === 0 ||
      paymentFilters.includes(getPaymentStatus(item));

    const statusMatch =
      statusFilters.length === 0 || statusFilters.includes(item.column?.title);

    return paymentMatch && statusMatch;
  });

  const handlePaymentFilter = (payment: string, checked: boolean) => {
    if (checked) {
      setPaymentFilters([...paymentFilters, payment]);
    } else {
      setPaymentFilters(paymentFilters.filter((p) => p !== payment));
    }
  };
  const handleStatusFilter = (status: string, checked: boolean) => {
    if (checked) {
      setStatusFilters([...statusFilters, status]);
    } else {
      setStatusFilters(statusFilters.filter((p) => p !== status));
    }
  };

  const getPaymentBadgeClasses = (item: any) => {
    const status = getPaymentStatus(item);
    if (status === "Paid") return "bg-[#27837c]/90 text-white";
    if (status === "Unpaid") return "bg-[#dc4757]/90 text-white";
    return "bg-gray-100 text-gray-700";
  };

  const getStatusBadgeClasses = (title?: string) => {
    const t = (title || "").toLowerCase();
    if (t.includes("complete") || t.includes("completed"))
      return "bg-[#27837c]/90 text-white";
    if (t.includes("progress") || t.includes("in progress"))
      return "bg-[#4791ed]/90 text-white";
    return "bg-gray-100 text-gray-700";
  };

  return (
    <div className="mt-5 rounded-md bg-background p-4 shadow-md min-h-[500px]">
      <div className="hidden max-h-[60vh] overflow-y-auto scroll-smooth md:block">
        <div className="">
          <table className="w-full">
            <thead className="sticky top-0 z-10 bg-background">
              <tr className="h-10 border-b">
                <th className="border-b px-4 py-2 text-left capitalize">
                  {type}#
                </th>
                <th className="border-b px-4 py-2 text-left">Year</th>
                <th className="border-b px-4 py-2 text-left">Make</th>
                <th className="border-b px-4 py-2 text-left">Model</th>
                <th className="border-b px-4 py-2 text-left">VIN</th>
                <th className="border-b px-4 py-2 text-left">Price</th>
                <th className="border-b px-4 py-2 text-left">
                  <div className="flex items-center gap-2">
                    Payment
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="h-6 w-6 p-0">
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent
                        align="start"
                        className="w-40 space-y-1"
                      >
                        <DropdownMenuCheckboxItem
                          checked={paymentFilters.includes("Paid")}
                          onCheckedChange={(checked) =>
                            handlePaymentFilter("Paid", checked)
                          }
                          className={`${paymentFilters.includes("Paid") ? "bg-gradient-to-r from-primary to-[#8088FF] text-white" : ""}`}
                        >
                          Paid
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                          checked={paymentFilters.includes("Unpaid")}
                          onCheckedChange={(checked) =>
                            handlePaymentFilter("Unpaid", checked)
                          }
                          className={`${paymentFilters.includes("Unpaid") ? "bg-gradient-to-r from-primary to-[#8088FF] text-white" : ""}`}
                        >
                          Unpaid
                        </DropdownMenuCheckboxItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </th>
                <th className="border-b px-4 py-2 text-left">
                  {" "}
                  <div className="flex items-center gap-2">
                    Invoice Status
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="h-6 w-6 p-0">
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="start"
                        className="w-40 space-y-1"
                      >
                        {uniqueStatuses?.map((status: any, index: number) => (
                          <DropdownMenuCheckboxItem
                            key={index}
                            checked={statusFilters.includes(
                              status?.status as string,
                            )}
                            onCheckedChange={(checked) =>
                              handleStatusFilter(
                                status?.status as string,
                                checked,
                              )
                            }
                            className={`${
                              statusFilters.includes(status?.status as string)
                                ? "bg-gradient-to-r from-primary to-[#8088FF] text-white"
                                : ""
                            }`}
                          >
                            {status?.status}
                          </DropdownMenuCheckboxItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </th>
              </tr>
            </thead>

            <tbody className="border-b">
              {filteredData?.map((item: any, index: number) => {
                return (
                  <tr
                    key={item.id}
                    className={cn(
                      "cursor-pointer rounded-md border py-3",
                      index % 2 === 0 ? "bg-background" : "bg-[#EEF4FF]/40",
                    )}
                  >
                    <td className="border-b px-4 py-2 text-left text-primary">
                      <InvoiceModal
                        invoiceId={item?.id}
                        buttonChild={<button>{item?.id}</button>}
                        buttonChildClassName="block w-full text-blue-600"
                      />
                    </td>

                    <td className="border-b px-4 py-2 text-left">
                      {item.vehicle?.year || "N/A"}
                    </td>
                    <td className="border-b px-4 py-2 text-left">
                      {item.vehicle?.make || "N/A"}
                    </td>
                    <td className="border-b px-4 py-2 text-left">
                      {item.vehicle?.model || "N/A"}
                    </td>
                    {item.vehicle?.other && (
                      <td className="border-b px-4 py-2 text-left">
                        {item.vehicle?.other || "N/A"}
                      </td>
                    )}
                    <td className="border-b px-4 py-2 text-left">
                      {item.vehicle?.vin || "N/A"}
                    </td>
                    <td className="border-b px-4 py-2 text-left">
                      {formatCurrency(item?.grandTotal)}
                    </td>
                    <td className="border-b px-4 py-2 text-left">
                      <span
                        className={`rounded px-2 py-1 text-xs font-medium ${getPaymentBadgeClasses(
                          item,
                        )}`}
                      >
                        {getPaymentStatus(item)}
                      </span>
                    </td>
                    <td className="border-b px-4 py-2 text-left">
                      <span
                        className={`rounded px-2 py-1 text-xs font-medium ${getStatusBadgeClasses(
                          item.column?.title,
                        )}`}
                      >
                        {item.column?.title}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card Layout */}
      <div className="block md:hidden">
        {/* Mobile Filters */}
        <div className="mb-4 flex flex-wrap gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                Payment
                <ChevronDown className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40">
              <DropdownMenuCheckboxItem
                checked={paymentFilters.includes("Paid")}
                onCheckedChange={(checked) =>
                  handlePaymentFilter("Paid", checked)
                }
              >
                Paid
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={paymentFilters.includes("Unpaid")}
                onCheckedChange={(checked) =>
                  handlePaymentFilter("Unpaid", checked)
                }
              >
                Unpaid
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                Invoice Status
                <ChevronDown className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40">
              {uniqueStatuses?.map((status: any, index: number) => (
                <DropdownMenuCheckboxItem
                  key={index}
                  checked={statusFilters.includes(status?.status as string)}
                  onCheckedChange={(checked) =>
                    handleStatusFilter(status?.status as string, checked)
                  }
                >
                  {status?.status}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Mobile Cards */}
        <div className="max-h-[400px] space-y-3 overflow-y-auto">
          {filteredData?.map((item: any, index: number) => (
            <Card
              key={item.id}
              className={cn(
                "cursor-pointer border",
                index % 2 === 0 ? "bg-background" : "bg-[#EEF4FF]",
              )}
            >
              <CardContent className="p-4">
                {/* Header with ID and Status */}
                <div className="mb-3 flex items-center justify-between">
                  <InvoiceModal
                    invoiceId={item?.id}
                    buttonChild={<button>{item?.id}</button>}
                    buttonChildClassName="block w-full text-blue-600"
                  />
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`rounded px-2 py-1 text-xs font-medium ${getPaymentBadgeClasses(
                        item,
                      )}`}
                    >
                      {getPaymentStatus(item)}
                    </span>
                    <span
                      className={`rounded px-2 py-1 text-xs font-medium ${getStatusBadgeClasses(
                        item.column?.title,
                      )}`}
                    >
                      {item.column?.title}
                    </span>
                  </div>
                </div>

                {/* Vehicle and Price Info */}
                <div className="mb-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Vehicle:</span>
                    <span className="text-sm font-medium">
                      {item.vehicle?.year || ""} {item.vehicle?.make}{" "}
                      {item.vehicle?.model} {item.vehicle?.other}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Price:</span>
                    <span className="text-sm font-semibold">
                      {formatCurrency(item?.grandTotal)}
                    </span>
                  </div>
                </div>

                {/* VIN */}
                <div className="border-t border-gray-100 pt-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">VIN:</span>
                    <span className="font-mono text-xs text-gray-700">
                      {item.vehicle?.vin || "N/A"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default InvoiceListTable;
