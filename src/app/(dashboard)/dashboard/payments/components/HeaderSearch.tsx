"use client";


import DateRange from "@/app/(dashboard)/dashboard/payments/components/PaymentDateRange";
import { usePaymentFilterStore } from "@/stores/paymentFilter";
import Link from "next/link";
import { IoIosSearch } from "react-icons/io";
import { IoPieChartOutline } from "react-icons/io5";
import FilterforPayment from "./FilterforPayment";

export default function HeaderSearch() {
  const { setFilter } = usePaymentFilterStore();

  return (
    <div className="mt-5 flex w-full flex-wrap items-center justify-between gap-2 px-2">
      <div className="flex w-full max-w-4xl rounded-md border border-gray-300 bg-background p-2">
        <div className="flex w-full flex-col items-center gap-4 md:flex-row">
          <div className="relative w-full min-w-0 flex-1">
            <IoIosSearch className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full rounded border border-[#66738C] p-2 pl-10"
              onChange={(e) => setFilter({ search: e.target.value })}
            />
          </div>
          <div className="flex w-full items-center gap-4 md:w-auto">
            <div className="z-50 md:m-2 md:px-4">
              <DateRange
                onOk={(start, end) => setFilter({ dateRange: [start, end] })}
                onCancel={() => setFilter({ dateRange: [null, null] })}
              />
            </div>
            <FilterforPayment />
          </div>
        </div>
      </div>

      <div className="mr-4 flex gap-4">
        <Link href="/dashboard/reporting/payments">
          <div>
            <button className="flex items-center gap-x-2 rounded border border-[#66738C] bg-background p-2 px-5 text-[#6571FF] shadow-md">
              <IoPieChartOutline />
              Payment Reporting
            </button>
          </div>
        </Link>
      </div>
    </div>
  );
}
