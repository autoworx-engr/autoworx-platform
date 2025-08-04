"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FaPrint, FaRegEdit } from "react-icons/fa";
import { Popconfirm } from "antd";
import { MdOutlineMail } from "react-icons/md";
import { FaCommentSms } from "react-icons/fa6";
import { cn } from "@/lib/cn";
import Image from "next/image";
import { Dialog, DialogContent, DialogHeader } from "@/components/Dialog";
import InvoiceModal from "@/components/invoice-modal/InvoiceModal";
import { PDFFleetStatement } from "./PDFFleetStatement";
import { pdf } from "@react-pdf/renderer";
import { PaymentModal } from "./PaymentModal";
import { getFleetStatement } from "@/actions/fleet/statement";
import { errorToast, successToast } from "@/lib/toast";
import { useTwilioStore } from "@/stores/useTwilioStore";
import { sendFleetEmail } from "@/actions/fleet/sendFleetEmail";
import { sendFleetSms } from "@/actions/fleet/sendFleetSms";
import { formatCurrency } from "@/utils/formatCurrency";

interface FleetStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  statementId?: string;
  onPaymentSuccess?: () => void;
}

export const FleetStatementModal: React.FC<FleetStatementModalProps> = ({
  isOpen,
  onClose,
  statementId,
  onPaymentSuccess,
}) => {
  const [statement, setStatement] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const { credentials, fetchCredentials } = useTwilioStore();

  const componentRef = useRef(null);

  // Load statement data when modal opens
  useEffect(() => {
    const loadStatement = async () => {
      if (isOpen && statementId) {
        setLoading(true);
        try {
          const result = await getFleetStatement(statementId);
          if (result.type === "success") {
            setStatement(result.data);
          } else {
            console.error("Error loading statement:", result.message);
          }
        } catch (error) {
          console.error("Error loading statement:", error);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchCredentials();
    loadStatement();
  }, [isOpen, statementId]);

  const company = statement?.Fleet?.client?.company;
  const fleet = statement?.Fleet;
  const client = statement?.Fleet?.client;
  const invoices = statement?.invoice || [];
  const totals = statement?.totals || {
    totalAmount: 0,
    totalPaid: 0,
    totalDue: 0,
  };

  const handlePaymentSuccess = () => {
    setPaymentModalOpen(false);
    // Reload statement data instead of full page reload
    if (statementId) {
      getFleetStatement(statementId).then((result) => {
        if (result.type === "success") {
          setStatement(result.data);
        }
      });
    }
    if (onPaymentSuccess) {
      onPaymentSuccess();
    }
  };
  const handlePDFPrint = async () => {
    if (!statement) return;

    const blob = await pdf(
      <PDFFleetStatement
        fleetData={invoices.map((invoice: any) => ({
          id: invoice.id,
          year: invoice.vehicle?.year || "N/A",
          make: invoice.vehicle?.make || "N/A",
          model: invoice.vehicle?.model || "N/A",
          other: invoice.vehicle?.other || "N/A",
          vin: invoice.vehicle?.vin || "N/A",
          price: `$${invoice.grandTotal || 0}`,
          status: invoice.column?.title || "N/A",
        }))}
        companyDetails={{
          name: company?.name || "Your Company",
          image: company?.image || "/logo.png",
          address: company?.address || "123 Main St",
          city: company?.city || "City",
          state: company?.state || "State",
          zip: company?.zip || "00000",
          phone: company?.phone || "+1234567890",
          email: company?.email || "info@company.com",
          terms: "Payment within 7 days.",
          policy: "No refunds after service rendered.",
        }}
        fleetCustomer={{
          firstName: client?.firstName || "Fleet",
          lastName: client?.lastName || "Customer",
          email: client?.email || "fleet@example.com",
          mobile: client?.mobile || "0000000000",
        }}
        user={{
          firstName: "Admin",
          lastName: "User",
        }}
        fleetName={fleet?.fleetName || "Fleet"}
        contactName={fleet?.contactName || "Contact"}
        totalAmount={`$${totals.totalAmount.toFixed(2)}`}
        date={new Date().toLocaleDateString()}
        authorizedName="Manager"
        paymentLink="https://yourcompany.com/pay"
        terms="Please pay within 7 days."
        policy="Service fees are non-refundable."
      />
    ).toBlob();

    const url = URL.createObjectURL(blob);
    const win = window.open(url);
    if (win) {
      win.focus();
    }
  };

  const handleEmail = async () => {
    let res = await sendFleetEmail({ statementId: statementId! });
    if (!res?.success) {
      errorToast(res?.message || "Error sharing invoice");
      return;
    }
    successToast("Statement sent successfully");
  };
  const handleSms = async () => {
    let res = await sendFleetSms({ statementId: statementId! });
    if (!res?.success) {
      errorToast(res?.message || "Error sharing invoice");
      return;
    }
    successToast("Statement sent successfully");
  };

  const tHeadingCommonClasses = "px-4 py-2 text-left font-bold text-[#66738C]";
  const tDataCommonClasses = "px-4 py-2 text-[#66738C] text-left";

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        ref={componentRef}
        className="w-[98vw] max-w-4xl max-h-[98vh] overflow-hidden rounded-lg bg-white px-4 py-5 shadow-2xl sm:px-10 sm:w-[95vw] sm:max-h-[95vh]"
      >
        {/* Header */}
        <DialogHeader className="mt-2 flex w-full flex-wrap items-center justify-center print:hidden">
          <div className="grid w-full grid-cols-2 flex-wrap items-center justify-center gap-2 md:flex md:gap-3">
            <Link
              className="flex items-center justify-center gap-1 rounded bg-[#6571FF] px-2 py-1 text-sm text-white md:px-4 md:text-base"
              href={`#`}
            >
              <FaRegEdit className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden md:inline">Edit</span>
            </Link>

            <button
              className="flex items-center justify-center gap-1 rounded bg-[#6571FF] px-2 py-1 text-sm text-white md:px-4 md:text-base"
              onClick={handlePDFPrint}
            >
              <FaPrint className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden md:inline">Print</span>
            </button>

            <div className="flex items-center gap-x-2 rounded-md border border-gray-300 px-2 py-1">
              <span className="mr-1 font-semibold">Share via</span>
              <Popconfirm
                title="Send invoice via Email now?"
                onConfirm={handleEmail}
                okText="Yes"
                cancelText="No"
              >
                <button className="flex items-center justify-center gap-1 rounded bg-[#6571FF] px-2 py-1 text-sm text-white md:px-4 md:text-base">
                  <MdOutlineMail className="h-4 w-4 md:h-4 md:w-4" />
                  <span className="hidden md:inline">Email</span>
                </button>
              </Popconfirm>
              {credentials && (
                <Popconfirm
                  title="Send invoice via SMS now?"
                  onConfirm={handleSms}
                  okText="Yes"
                  cancelText="No"
                >
                  <button className="flex items-center justify-center gap-1 rounded bg-[#6571FF] px-2 py-1 text-sm text-white md:px-4 md:text-base">
                    <FaCommentSms className="h-4 w-4 md:h-4 md:w-4" />
                    <span className="hidden md:inline">SMS</span>
                  </button>
                </Popconfirm>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Company Info */}
        <div className="flex w-full flex-row justify-between gap-4 md:flex-row md:items-center md:gap-0 2xl:py-1">
          <div
            className={cn(
              "flex aspect-square items-center justify-center text-center font-bold text-white",
              company?.image ? "w-32" : "w-32 bg-gray-500"
            )}
          >
            {company?.image ? (
              <Image
                src={`${company.image}`}
                alt="company logo"
                width={176}
                height={176}
                className="object-fit rounded-md"
              />
            ) : (
              "Logo"
            )}
          </div>
          <div className="text-right text-sm text-gray-600">
            <p>
              <strong>Contact Information:</strong>
            </p>
            <p>{company?.address || "Full Address: N/A"}</p>
            <p>{company?.phone || "Mobile Number: N/A"}</p>
            <p>{company?.email || "Email: N/A"}</p>
          </div>
        </div>

        <div>
          <div>
            <h1 className="col-span-full text-center text-xl font-bold uppercase text-slate-500 md:text-left md:text-3xl">
              Fleet Statement
            </h1>
            <p className="font-semibold">{new Date().toLocaleDateString()}</p>
          </div>
          <div className="py-1 text-sm text-gray-600">
            <p>
              <strong>Statement To:</strong>
            </p>
            <p>{fleet?.fleetName || "Fleet Name"}</p>
            <p>{fleet?.contactName || "Name of Contact"}</p>
            <p>{client?.mobile || "Mobile Number"}</p>
            <p>{client?.email || "Email"}</p>
          </div>
        </div>
        {/* Fleet Table */}
        <div className="thin-scrollbar overflow-x-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500">Loading statement...</div>
            </div>
          ) : (
            <table className="h-full w-full">
              <thead className="sticky top-0 z-10 bg-background">
                <tr className="bg-background">
                  <th className={`${tHeadingCommonClasses}`}>Invoice#</th>
                  <th className={`${tHeadingCommonClasses}`}>Year</th>
                  <th className={`${tHeadingCommonClasses}`}>Make</th>
                  <th className={`${tHeadingCommonClasses}`}>Model</th>
                  <th className={`${tHeadingCommonClasses}`}>VIN</th>
                  <th className={`${tHeadingCommonClasses}`}>Amount</th>
                  <th className={`${tHeadingCommonClasses}`}>Paid</th>
                  <th className={`${tHeadingCommonClasses}`}>Due</th>
                  <th className={`${tHeadingCommonClasses}`}>Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice: any, index: number) => (
                  <tr
                    key={invoice.id}
                    className={`border-b border-gray-100 transition-colors ${
                      index % 2 === 0 ? "bg-background" : "bg-[#EEF4FF]"
                    }`}
                  >
                    <td className="border-b px-4 py-2 text-left text-[#6571FF]">
                      <InvoiceModal
                        invoiceId={invoice?.id}
                        buttonChild={<button>{invoice?.id}</button>}
                        buttonChildClassName="block w-full text-blue-600"
                      />
                    </td>

                    <td className={`${tDataCommonClasses}`}>
                      {invoice.vehicle?.year || "N/A"}
                    </td>
                    <td className={`${tDataCommonClasses}`}>
                      {invoice.vehicle?.make || "N/A"}
                    </td>
                    <td className={`${tDataCommonClasses}`}>
                      {invoice.vehicle?.model || "N/A"}
                    </td>
                    {invoice.vehicle?.other && (
                      <td className={`${tDataCommonClasses}`}>
                        {invoice.vehicle?.other || "N/A"}
                      </td>
                    )}
                    <td className={`${tDataCommonClasses}`}>
                      {invoice.vehicle?.vin || "N/A"}
                    </td>
                    <td className={`${tDataCommonClasses}`}>
                      ${Number(invoice.grandTotal || 0).toFixed(2)}
                    </td>
                    <td className={`${tDataCommonClasses}`}>
                      ${Number(invoice.totalPayment || 0).toFixed(2)}
                    </td>
                    <td className={`${tDataCommonClasses}`}>
                      <span
                        className={
                          invoice.due > 0
                            ? "font-medium text-red-600"
                            : "text-green-600"
                        }
                      >
                        ${Number(invoice.due || 0).toFixed(2)}
                      </span>
                    </td>
                    <td className={`${tDataCommonClasses}`}>
                      {invoice.column?.title || "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-3 sm:p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            {/* Company Summary */}
            <div className="text-xs sm:text-sm text-gray-600 space-y-1">
              <p className="font-semibold text-gray-800">
                {company?.name || "Company Name"}
              </p>
              <p>{fleet?.fleetName || "Fleet Name"}</p>
              <div className="flex gap-4 mt-2 text-xs">
                <span>
                  Total: <strong>{formatCurrency(totals.totalAmount)}</strong>
                </span>
                <span>
                  Paid: <strong>{formatCurrency(totals.totalPaid)}</strong>
                </span>
              </div>
            </div>

            {/* Grand Total Section */}
            <div className="w-full sm:w-auto sm:min-w-[280px] lg:min-w-[320px]">
              <div className="rounded-lg bg-[#006D77] p-3 sm:p-4 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm sm:text-lg font-semibold text-white">
                    Amount Due
                  </span>
                  <span className="text-lg sm:text-xl font-bold text-white">
                    {formatCurrency(totals.totalDue)}
                  </span>
                </div>

                {totals.totalDue > 0 ? (
                  <button
                    className="w-full bg-white text-[#006D77] hover:bg-gray-100 font-semibold py-2 sm:py-3"
                    onClick={() => setPaymentModalOpen(true)}
                  >
                    Make Payment
                  </button>
                ) : (
                  <div className="w-full rounded-lg bg-green-100 px-4 py-2 sm:py-3 text-center font-semibold text-green-800 text-sm sm:text-base">
                    Fully Paid ✓
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Payment Modal */}
        {statementId && (
          <PaymentModal
            isOpen={paymentModalOpen}
            onClose={() => setPaymentModalOpen(false)}
            statementId={statementId}
            totalDue={totals.totalDue}
            onPaymentSuccess={handlePaymentSuccess}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
