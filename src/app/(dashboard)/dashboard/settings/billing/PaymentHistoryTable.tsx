"use client";

import { History } from "lucide-react";
import moment from "moment-timezone";

type PaymentHistoryTableProps = {
  invoices: {
    id: string;
    amount: number;
    status: string;
    createdAt: string | Date;
  }[];
  timezone: string;
};

export function PaymentHistoryTable({
  invoices,
  timezone,
}: PaymentHistoryTableProps) {
  return (
    <div className="w-full">
      <h2 className="mb-4 flex items-center text-2xl font-bold ">
        <History className="w-6 h-6 mr-2 text-primary" />
        Payment History
      </h2>
      <div className="max-h-80 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr className="sticky top-0 text-left text-sm font-bold uppercase tracking-wider text-gray-600 bg-white">
              <th className="px-6 py-3">Amount</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm text-gray-800">
            {invoices.length > 0 ? (
              invoices.map((inv, index) => (
                <tr
                  key={inv.id}
                  className={
                    index % 2 === 0
                      ? "bg-white hover:bg-gray-50"
                      : "bg-blue-50 hover:bg-gray-100"
                  }
                >
                  <td className="px-6 py-3 font-medium">${inv.amount}</td>
                  <td className="px-6 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-bold ${inv.status === "PAID" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap">
                    {moment.tz(inv.createdAt, timezone).format("MM/DD/YYYY")}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={3}
                  className="px-6 py-10 text-center text-gray-400 italic"
                >
                  No payment history found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
