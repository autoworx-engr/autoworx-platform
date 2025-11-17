"use client";
import React from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/Dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/cn";
import Image from "next/image";
import InvoiceModal from "@/components/invoice-modal/InvoiceModal";
import { formatCurrency } from "@/utils/formatCurrency";

interface FleetStatementModalBodyProps {
  statementId: string;
  initialStatement: any;
}

export const FleetStatementModalBody: React.FC<
  FleetStatementModalBodyProps
> = ({ statementId, initialStatement }) => {
  const statement = initialStatement;
  const [open, setOpen] = React.useState(false);

  const company = statement?.Fleet?.client?.company;
  const fleet = statement?.Fleet;
  const client = statement?.Fleet?.client;
  const invoices = statement?.invoice || [];

  // Calculate totals
  const totalAmount = invoices.reduce(
    (sum: number, invoice: any) => sum + Number(invoice.grandTotal || 0),
    0
  );
  const totalPaid = invoices.reduce(
    (sum: number, invoice: any) => sum + Number(invoice.totalPayment || 0),
    0
  );
  const totalDue = invoices.reduce(
    (sum: number, invoice: any) => sum + Number(invoice.due || 0),
    0
  );

  const totals = {
    totalAmount,
    totalPaid,
    totalDue,
  };

  const [amount, setAmount] = React.useState(String(totalDue.toFixed(2)));
  const [isLoading, setIsLoading] = React.useState(false);

  return (
    <div className="w-full max-w-5xl mx-auto bg-white rounded-lg shadow-sm">
      {/* Header Section with Company Info */}
      <div className="px-6 py-8 sm:px-10 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          {/* Company Logo */}
          <div
            className={cn(
              "flex items-center justify-center rounded-lg overflow-hidden",
              company?.image
                ? "w-24 h-24 sm:w-32 sm:h-32"
                : "w-24 h-24 sm:w-32 sm:h-32 bg-slate-400"
            )}
          >
            {company?.image ? (
              <Image
                src={company.image}
                alt="Company logo"
                width={128}
                height={128}
                className="object-cover w-full h-full"
              />
            ) : (
              <span className="text-white font-bold text-lg">Logo</span>
            )}
          </div>

          {/* Company Contact Info */}
          <div className="text-left sm:text-right">
            <p className="font-semibold text-gray-900 mb-2">
              Contact Information:
            </p>
            <p className="text-sm text-gray-600 leading-relaxed">
              {company?.address || "Full Address: N/A"}
            </p>
            <p className="text-sm text-gray-600">
              {company?.phone || "10343242342"}
            </p>
            <p className="text-sm text-gray-600">
              {company?.email || "john@gmail.com"}
            </p>
          </div>
        </div>
      </div>

      {/* Statement Title and Details */}
      <div className="px-6 py-6 sm:px-10">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-600 uppercase tracking-wide mb-2">
          Fleet Statement
        </h1>
        <p className="text-sm text-gray-600 font-medium mb-6">
          {new Date().toLocaleDateString("en-US", {
            month: "numeric",
            day: "numeric",
            year: "numeric",
          })}
        </p>

        {/* Statement To Section */}
        <div className="mb-6">
          <p className="font-semibold text-gray-900 mb-2">Statement To:</p>
          <div className="text-sm text-gray-600 space-y-1">
            <p className="font-medium text-gray-900">
              {fleet?.fleetName || "Fleet Name"}
            </p>
            <p>{fleet?.contactName || "Name of Contact"}</p>
            <p>{client?.mobile || "+11621911142"}</p>
            <p>{client?.email || "jodihet@mailinator.com"}</p>
          </div>
        </div>
      </div>

      {/* Invoice Table */}
      <div className="px-6 sm:px-10 pb-6">
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full min-w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Invoice#
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Year
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Make
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Model
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  VIN
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Paid
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Due
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.map((invoice: any, index: number) => (
                <tr
                  key={invoice.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <InvoiceModal
                      invoiceId={invoice?.id}
                      buttonChild={
                        <button className="text-blue-600 hover:text-blue-800 font-medium hover:underline">
                          {invoice?.id}
                        </button>
                      }
                      buttonChildClassName="text-blue-600 hover:text-blue-800"
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                    {invoice.vehicle?.year || "2015"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                    {invoice.vehicle?.make || "Make"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                    {invoice.vehicle?.model || "Model"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                    {invoice.vehicle?.vin || "N/A"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 font-medium text-right whitespace-nowrap">
                    ${Number(invoice.grandTotal || 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 text-right whitespace-nowrap">
                    ${Number(invoice.totalPayment || 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-right whitespace-nowrap">
                    <span
                      className={cn(
                        invoice.due > 0 ? "text-red-600" : "text-green-600"
                      )}
                    >
                      ${Number(invoice.due || 0).toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {invoice.column?.title || "Pending"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Section */}
      <div className="bg-gray-50 px-6 py-8 sm:px-10 border-t border-gray-200">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8">
          {/* Company Summary */}
          <div className="space-y-2">
            <p className="text-base font-bold text-gray-900">
              {company?.name || "BetaTest"}
            </p>
            <p className="text-sm text-gray-700 font-medium">
              {fleet?.fleetName || "Stephanie Kidd"}
            </p>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 text-sm text-gray-600 pt-2">
              <span>
                Total:{" "}
                <strong className="text-gray-900">
                  {formatCurrency(totals.totalAmount)}
                </strong>
              </span>
              <span>
                Paid:{" "}
                <strong className="text-gray-900">
                  {formatCurrency(totals.totalPaid)}
                </strong>
              </span>
            </div>
          </div>

          {/* Amount Due Card */}
          <div className="w-full lg:w-auto lg:min-w-[320px]">
            <div className="rounded-xl bg-[#0D7C84] p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <span className="text-lg font-semibold text-white">
                  Amount Due
                </span>
                <span className="text-2xl font-bold text-white">
                  {formatCurrency(totals.totalDue)}
                </span>
              </div>

              <div className="bg-white rounded-lg px-6 py-4 text-center">
                <span className="text-[#0D7C84] font-bold text-lg">
                  Amount Due: {formatCurrency(totals.totalDue)}
                </span>
              </div>
            </div>

            <div className="mt-4 flex justify-center lg:justify-end">
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="relative inline-flex items-center px-6 py-2 text-sm font-semibold 
        text-white rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 
        shadow-md hover:shadow-xl transition-all duration-300 
        hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    Pay Now
                  </button>
                </DialogTrigger>

                <DialogContent
                  className="
        sm:max-w-[450px] rounded-2xl p-6 
        bg-white/90 dark:bg-slate-900/60 
        backdrop-blur-xl 
        ring-1 ring-slate-900/10 dark:ring-white/10 
        shadow-2xl
      "
                >
                  <DialogHeader>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 pb-1 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 
            flex items-center justify-center shadow-md"
                      >
                        <p className="text-2xl text-white">+</p>
                      </div>

                      <DialogTitle className="text-lg font-semibold text-slate-900 dark:text-white">
                        Make Payment with Stripe
                      </DialogTitle>
                    </div>
                  </DialogHeader>

                  <div className="mt-4 grid gap-4">
                    <label
                      htmlFor="amount"
                      className="text-sm font-medium text-slate-700 dark:text-slate-200"
                    >
                      Amount
                    </label>

                    <div className="space-y-1">
                      <input
                        id="amount"
                        value={amount}
                        type="text"
                        placeholder="Enter payment amount"
                        className="
              w-full px-3 py-2 rounded-lg 
              bg-white/70 dark:bg-slate-800/60 
              border border-slate-300 dark:border-slate-700
              shadow-sm
              focus:ring-2 focus:ring-blue-400 focus:border-blue-500 
              outline-none transition-all duration-200
            "
                        onChange={(e) => {
                          let v = e.target.value;
                          if (/^\d*\.?\d*$/.test(v)) setAmount(v);
                        }}
                      />

                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Max: {formatCurrency(totals.totalDue)}
                      </span>
                    </div>
                  </div>

                  <DialogFooter className="mt-6 flex justify-end gap-3">
                    <button
                      type="button"
                      className="
            px-4 py-2 rounded-lg text-sm font-medium 
            bg-slate-200 dark:bg-slate-700 
            text-slate-800 dark:text-slate-200
            hover:bg-slate-300 dark:hover:bg-slate-600 
            transition-all duration-200
          "
                      onClick={() => setOpen(false)}
                    >
                      Close
                    </button>

                    <button
                      type="button"
                      disabled={isLoading || !amount || Number(amount) <= 0}
                      onClick={async () => {
                        setIsLoading(true);
                        await new Promise((r) => setTimeout(r, 300));
                        setIsLoading(false);
                        setOpen(false);
                      }}
                      className={`
            px-4 py-2 rounded-lg text-sm font-semibold text-white
            bg-gradient-to-r from-blue-500 to-indigo-600 
            shadow-md hover:shadow-xl transition-all duration-300
            hover:-translate-y-0.5 focus:ring-2 focus:ring-blue-400
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
                    >
                      {isLoading ? "Processing..." : "Checkout to Stripe"}
                    </button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* <div className="mt-4 flex justify-center lg:justify-end">
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <button
                    className="w-fit ml-auto bg-[#6571ff] text-white font-medium py-1 pb-1.5 px-7 rounded transition-colors duration-200 shadow-sm flex items-center justify-between text-sm"
                    type="button"
                  >
                    Pay Now
                  </button>
                </DialogTrigger>

                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Make Payment With Stripe</DialogTitle>
                  </DialogHeader>

                  <div className="grid gap-4 py-4">
                    <div className="gap-4">
                      <Label htmlFor="amount" className="mb-2 text-right">
                        Amount
                      </Label>
                      <div>
                        <input
                          id="amount"
                          value={amount}
                          type="text"
                          placeholder="Enter payment amount"
                          className="w-full rounded-lg border px-2 py-2"
                          onChange={(e) => {
                            let inputValue = e.target.value;
                            if (/^\d*\.?\d*$/.test(inputValue)) {
                              setAmount(inputValue);
                            }
                          }}
                        />
                        <span className="text-xs">
                          ( Max. {formatCurrency(totals.totalDue)} )
                        </span>
                      </div>
                    </div>
                  </div>

                  <DialogFooter>
                    <button
                      className="bg-gray-200 text-gray-800 rounded px-4 py-2"
                      onClick={() => setOpen(false)}
                      type="button"
                    >
                      Close
                    </button>
                    <button
                      className="bg-[#6571ff] text-white rounded px-4 py-2"
                      type="button"
                      disabled={isLoading || !amount || Number(amount) <= 0}
                      onClick={async () => {
                        setIsLoading(true);
                        await new Promise((r) => setTimeout(r, 300));
                        setIsLoading(false);
                        setOpen(false);
                      }}
                    >
                      {isLoading ? "Processing..." : "Checkout to Stripe"}
                    </button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div> */}
          </div>
        </div>
      </div>
    </div>
  );
};
