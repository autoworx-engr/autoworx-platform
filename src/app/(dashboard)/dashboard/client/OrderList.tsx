"use client";
import InvoiceModal from "@/components/invoice-modal/InvoiceModal";
import { cn } from "@/lib/cn";
import { Column, Invoice, Vehicle } from "@prisma/client";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";

const OrderList = ({
  vehicle,
}: {
  vehicle: Vehicle & { invoices: (Invoice & { column: Column })[] };
}) => {
  const router = useRouter();

  return (
    <div className={`app-shadow h-fit w-full rounded-lg bg-background p-4`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Order List</h3>
        <span
          className="cursor-pointer"
          onClick={() => {
            router.replace(`/dashboard/client/${vehicle.clientId}`);
          }}
        >
          <X />
        </span>
      </div>

      <div className="table h-full w-full">
        <table className="w-full">
          <thead>
            <tr className="h-10 border-b">
              <th className="px-4 text-left 2xl:px-10">Invoice#</th>
              <th className="px-4 text-left 2xl:px-10">Price</th>
              <th className="px-4 text-left 2xl:px-10">Status</th>
            </tr>
          </thead>

          <tbody>
            {vehicle.invoices?.map((invoice, index) => (
              <tr
                key={index}
                className={cn(
                  "rounded-md",
                  index % 2 === 0 ? "bg-background" : "bg-[#EEF4FF]",
                )}
              >
                <td className="text-nowrap px-4 py-2 text-left text-primary 2xl:px-10">
                  <InvoiceModal
                    invoiceId={invoice.id}
                    buttonChild={<button>{invoice.id}</button>}
                    buttonChildClassName="text-primary"
                  />
                </td>
                <td className="text-nowrap px-4 py-2 text-left 2xl:px-10">
                  {invoice?.grandTotal ? invoice?.grandTotal.toString() : "0"}
                </td>
                <td className="px-4 py-2 text-left 2xl:px-10">
                  <p
                    style={{
                      color: invoice.column.textColor!,
                      backgroundColor: invoice.column.bgColor!,
                    }}
                    className="w-fit rounded-md px-2 py-1"
                  >
                    {invoice.column.title}
                  </p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OrderList;
