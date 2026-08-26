import { cn } from "@/lib/cn";
import { formatCurrency } from "@/utils/formatCurrency";
import { Service } from "@prisma/client";

type Props = {
  totalAmount: number;
  totalCustomerPaidAmount: number;
  totalRefundedAmount: number;
  totalTransactions: number;
  totalServices: (Service & { count: number })[];
};

const statCell =
  "px-2 py-4 text-center text-xs font-semibold sm:text-sm lg:px-6 xl:px-8 2xl:px-10";

export default function PaymentSummary({
  totalAmount,
  totalCustomerPaidAmount,
  totalRefundedAmount,
  totalTransactions,
  totalServices,
}: Props) {
  const topServices = [...totalServices]
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  return (
    <div className="flex shrink-0 flex-col gap-4 2xl:flex-row 2xl:items-start 2xl:justify-between">
      <div className="grid w-full min-w-0 grid-cols-2 border border-slate-400 sm:grid-cols-4 2xl:w-fit">
        <div className={cn(statCell, "bg-[#F8FAFF]")}>
          <h3>Total Quoted</h3>
          <p>{formatCurrency(totalAmount)}</p>
        </div>
        <div className={cn(statCell, "bg-[#F8FAFF]")}>
          <h3>Total Paid</h3>
          <p>{formatCurrency(totalCustomerPaidAmount)}</p>
        </div>
        <div className={statCell}>
          <h3>Total Refunded</h3>
          <p className="text-red-600">{formatCurrency(totalRefundedAmount)}</p>
        </div>
        <div className={statCell}>
          <h3>Total Transactions</h3>
          <p>{totalTransactions}</p>
        </div>
      </div>

      <div className="w-full min-w-0 border border-slate-400 text-sm 2xl:w-[520px]">
        <h3 className="p-3 py-1 font-semibold">Top Services</h3>
        <div>
          {topServices.length === 0 ? (
            <p className="p-3 py-2 text-slate-500">No services yet</p>
          ) : (
            topServices.map((service, index) => (
              <div
                key={service.id}
                className={cn(
                  "flex flex-col gap-1 rounded-xl border-b p-3 py-2 transition-colors sm:flex-row sm:items-center sm:justify-between sm:gap-4",
                  index % 2 === 0 ? "bg-white" : "bg-slate-50",
                )}
              >
                <p className="min-w-0 truncate font-semibold text-slate-600">
                  {service.name}
                </p>
                <p className="shrink-0 rounded-lg bg-primary/5 px-1 py-0.5 text-sm font-medium text-nowrap text-primary">
                  Ordered {service.count} times
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
