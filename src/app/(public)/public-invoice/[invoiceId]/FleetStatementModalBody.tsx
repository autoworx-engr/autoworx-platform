"use client";
import { getPaymentGatewayInfo } from "@/app/(dashboard)/dashboard/settings/payments/getPaymentGatewayInfo";
import { getStripeAccount } from "@/app/(dashboard)/dashboard/settings/payments/stripe";
import { StatementPaymentDialog } from "@/components/fleet-statement/StatementPaymentDialog";
import InvoiceModal from "@/components/invoice-modal/InvoiceModal";
import { useServerGet } from "@/hooks/useServerGet";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/utils/formatCurrency";
import Image from "next/image";
import React from "react";

interface FleetStatementModalBodyProps {
  statementId: string;
  initialStatement: any;
}

export const FleetStatementModalBody: React.FC<
  FleetStatementModalBodyProps
> = ({ statementId, initialStatement }) => {
  const statement = initialStatement;

  const company = statement?.Fleet?.client?.company;
  const fleet = statement?.Fleet;
  const client = statement?.Fleet?.client;
  const invoices = statement?.invoice || [];

  const companyId = company?.id;
  useServerGet(getStripeAccount, companyId);
  const { data: gatewayInfo } = useServerGet(getPaymentGatewayInfo, companyId);

  // Calculate totals
  const totalAmount = invoices.reduce(
    (sum: number, invoice: any) => sum + Number(invoice.grandTotal || 0),
    0,
  );
  const totalPaid = invoices.reduce(
    (sum: number, invoice: any) => sum + Number(invoice.totalPayment || 0),
    0,
  );
  const totalDue = invoices.reduce(
    (sum: number, invoice: any) => sum + Number(invoice.due || 0),
    0,
  );

  const totals = {
    totalAmount,
    totalPaid,
    totalDue,
  };

  return (
    <div className="w-full max-w-5xl mx-auto bg-white border mt-4 rounded-lg shadow-sm overflow-y-auto">
      {/* Header Section with Company Info */}
      <div className="px-6 py-8 sm:px-10 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          {/* Company Logo */}
          <div
            className={cn(
              "flex items-center justify-center rounded-lg overflow-hidden",
              company?.image
                ? "w-24 h-24 sm:w-32 sm:h-32"
                : "w-24 h-24 sm:w-32 sm:h-32 bg-slate-400",
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
        <div className="thin-scrollbar max-h-[40vh] overflow-x-hidden overflow-y-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="w-full min-w-full text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50">
              <tr className="border-b border-slate-200">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#66738C]">
                  Invoice#
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#66738C]">
                  Year
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#66738C]">
                  Make
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#66738C]">
                  Model
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#66738C]">
                  VIN
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[#66738C]">
                  Amount
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[#66738C]">
                  Paid
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[#66738C]">
                  Due
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-[#66738C]">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {invoices.map((invoice: any, idx: number) => {
                const due = Number(invoice.due || 0);
                const isPaid = due === 0;
                return (
                  <tr
                    key={invoice.id}
                    className={cn(
                      "transition-colors hover:bg-slate-50",
                      idx % 2 === 0 ? "bg-white" : "bg-slate-50/60",
                    )}
                  >
                    <td className="border-b px-4 py-3 text-left">
                      <InvoiceModal
                        invoiceId={invoice?.id}
                        buttonChild={
                          <button className="text-primary hover:text-[#5a66ee] font-semibold hover:underline text-sm">
                            #{invoice?.id}
                          </button>
                        }
                        buttonChildClassName="text-primary"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                      {invoice.vehicle?.year || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                      {invoice.vehicle?.make || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                      {invoice.vehicle?.model || "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap font-mono">
                      {invoice.vehicle?.vin || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-800 font-medium text-right whitespace-nowrap">
                      {formatCurrency(Number(invoice.grandTotal || 0))}
                    </td>
                    <td className="px-4 py-3 text-sm text-emerald-700 font-medium text-right whitespace-nowrap">
                      {formatCurrency(Number(invoice.totalPayment || 0))}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-right whitespace-nowrap">
                      <span
                        className={cn(
                          isPaid ? "text-emerald-600" : "text-red-600",
                        )}
                      >
                        {formatCurrency(due)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
                          isPaid
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200",
                        )}
                      >
                        {invoice.column?.title || (isPaid ? "Paid" : "Unpaid")}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Section */}
      <div className="px-6 py-8 sm:px-10 border-t border-gray-200">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8">
          {/* Company Summary */}
          <div className="space-y-2">
            <p className="text-base font-bold text-gray-700">
              {company?.name || "BetaTest"}
            </p>
            <p className="text-sm text-gray-600 font-medium">
              {fleet?.fleetName || "Stephanie Kidd"}
            </p>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 text-sm text-gray-600 pt-2">
              <span>
                Total:{" "}
                <strong className="text-gray-600">
                  {formatCurrency(totals.totalAmount)}
                </strong>
              </span>
              <span>
                Paid:{" "}
                <strong className="text-gray-600">
                  {formatCurrency(totals.totalPaid)}
                </strong>
              </span>
            </div>
          </div>

          {/* Amount Due Card */}
          <div className="w-full lg:w-auto lg:min-w-[320px]">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                    Amount Due
                  </p>
                  <p className="text-2xl font-bold text-slate-600">
                    {formatCurrency(totals.totalDue)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-center text-sm font-semibold text-slate-700">
                  {totals.totalDue > 0 ? "Balance Outstanding" : "Fully Paid ✓"}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <StatementPaymentDialog
                statementId={statementId}
                companyId={company.id}
                totalDue={totals.totalDue}
                isEnabled={
                  !!(
                    gatewayInfo?.success &&
                    (gatewayInfo?.hasStripe || gatewayInfo?.hasAuthorizeNet) &&
                    parseFloat(Number(totals.totalDue ?? 0).toFixed(2)) > 0
                  )
                }
                gatewayInfo={{
                  paymentGateway: (gatewayInfo?.paymentGateway || "STRIPE") as
                    | "STRIPE"
                    | "AUTHORIZE_NET"
                    | "BOTH",
                  hasStripe: gatewayInfo?.hasStripe || false,
                  hasAuthorizeNet: gatewayInfo?.hasAuthorizeNet || false,
                  tipEnabled: gatewayInfo?.tipEnabled ?? false,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
