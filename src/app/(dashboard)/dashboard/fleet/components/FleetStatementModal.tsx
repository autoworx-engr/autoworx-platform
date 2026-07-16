"use client";
import { sendFleetEmail } from "@/actions/fleet/sendFleetEmail";
import { sendFleetSms } from "@/actions/fleet/sendFleetSms";
import {
  getFleetStatement,
  getUnpaidInvoicesForFleet,
} from "@/actions/fleet/statement";
import { getOrCreateShortLinkAction } from "@/actions/shortener/getOrCreateShortLink";
import { Dialog, DialogContent, DialogHeader } from "@/components/Dialog";
import InvoiceModal from "@/components/invoice-modal/InvoiceModal";
import { cn } from "@/lib/cn";
import { errorToast, successToast } from "@/lib/toast";
import { useFleetInvoiceStore } from "@/stores/fleetInvoiceStore";
import { useTwilioStore } from "@/stores/useTwilioStore";
import { formatCurrency } from "@/utils/formatCurrency";
import { pdf } from "@react-pdf/renderer";
import { Popconfirm } from "antd";
import { Mail, SquarePen, FileDown, MessageCircle, Copy } from "lucide-react";
import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
import EditFleetStatementModal from "./EditFleetStatementModal"; // Add this import
import { PaymentModal } from "./PaymentModal";
import { PDFFleetStatement } from "./PDFFleetStatement";

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
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const { credentials, fetchCredentials } = useTwilioStore();
  const { setAllInvoices } = useFleetInvoiceStore();

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

  // Add edit handler
  const handleEditStatement = async () => {
    const hasPaidInvoices = invoices.some(
      (inv: any) =>
        Number(inv.due) === 0 || Number(inv.due) < Number(inv.grandTotal),
    );

    if (hasPaidInvoices) {
      errorToast("Cannot edit statement with paid or partially paid invoices");
      return;
    }

    if (Number(totals.totalDue) === 0) {
      errorToast("Cannot edit a fully paid statement");
      return;
    }

    setEditLoading(true);
    try {
      if (fleet?.id) {
        const result = await getUnpaidInvoicesForFleet(fleet.id);
        if (result.type === "success") {
          setAllInvoices(result.data as any);
        }
      }
    } finally {
      setEditLoading(false);
    }

    setEditModalOpen(true);
  };

  // Add edit success handler
  const handleEditSuccess = () => {
    setEditModalOpen(false);
    // Reload statement data
    if (statementId) {
      getFleetStatement(statementId).then((result) => {
        if (result.type === "success") {
          setStatement(result.data);
          successToast("Statement updated successfully");
        }
      });
    }
    if (onPaymentSuccess) {
      onPaymentSuccess();
    }
  };

  // Check if statement can be edited
  const canEdit =
    Number(totals.totalDue) > 0 &&
    !invoices.some(
      (inv: any) =>
        Number(inv.due) === 0 || Number(inv.due) < Number(inv.grandTotal),
    );

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
      />,
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

  const handleCopyLink = async () => {
    const isFleetStatement = true;
    const query = isFleetStatement ? "?fleet=true" : "";
    try {
      const clientName = client?.firstName || client?.lastName || "";

      const shortLinkResult = await getOrCreateShortLinkAction({
        invoiceId: statementId!,
        clientName,
        isFleetStatement: true,
      });

      if (shortLinkResult.success && shortLinkResult.shortUrl) {
        await navigator.clipboard.writeText(shortLinkResult.shortUrl);
        successToast("Short link copied to clipboard");
      } else {
        const fallbackUrl =
          shortLinkResult.originalUrl ||
          `${process.env.NEXT_PUBLIC_APP_URL}/public-invoice/${statementId}${query}`;
        await navigator.clipboard.writeText(fallbackUrl);
        console.log("⚠️ Copy Link - Using original URL:", {
          error: shortLinkResult.error,
          originalUrl: fallbackUrl,
          invoiceId: statementId,
        });
        successToast("Link copied to clipboard");
      }
    } catch (error) {
      console.error("Error copying link:", error);
      const fallbackLink = isFleetStatement
        ? `${process.env.NEXT_PUBLIC_APP_URL}/public-invoice/${statementId}?fleet=true`
        : `${process.env.NEXT_PUBLIC_APP_URL}/public-invoice/${statementId}`;
      await navigator.clipboard.writeText(fallbackLink);
      successToast("Link copied to clipboard");
    }
  };

  const tHeadingCommonClasses = "px-4 py-2 text-left font-bold text-[#66738C]";
  const tDataCommonClasses = "px-4 py-2 text-[#66738C] text-left";

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent
          ref={componentRef}
          className="w-[98vw] max-w-4xl max-h-[98vh] rounded-lg bg-white px-4 py-5 shadow-2xl sm:px-10 sm:w-[95vw] sm:max-h-[95vh] overflow-y-auto"
        >
          {/* Header */}
          <DialogHeader className="mt-2 flex w-full flex-wrap items-center justify-center print:hidden">
            <div className="flex w-full flex-wrap items-center justify-center gap-2 md:gap-3">
              <button
                onClick={handleEditStatement}
                disabled={!canEdit || editLoading}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium shadow-md transition-all md:px-4 md:text-base",
                  canEdit && !editLoading
                    ? "bg-gradient-to-r from-primary from-70% to-[#5a66ee] text-white shadow-indigo-200 hover:scale-[1.02] hover:shadow-lg active:scale-95"
                    : "cursor-not-allowed bg-slate-200 text-slate-500 opacity-60",
                )}
                title={
                  !canEdit
                    ? "Cannot edit paid or partially paid statements"
                    : "Edit statement"
                }
              >
                <SquarePen className="h-4 w-4" />
                <span className="hidden md:inline">
                  {editLoading ? "Loading..." : "Edit"}
                </span>
              </button>

              <button
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary from-70% to-[#5a66ee] px-3 py-2 text-sm font-medium text-white shadow-md shadow-indigo-200 transition-all hover:scale-[1.02] hover:shadow-lg active:scale-95 md:px-4 md:text-base disabled:cursor-not-allowed disabled:opacity-50"
                onClick={handlePDFPrint}
                disabled={loading}
              >
                <FileDown className="h-4 w-4" />
                <span className="hidden md:inline">Print</span>
              </button>

              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-3 py-1 shadow-sm">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 md:text-xs">
                  Share
                </span>

                <Popconfirm
                  title="Send fleet via Email now?"
                  onConfirm={handleEmail}
                  okText="Yes"
                  cancelText="No"
                  disabled={loading}
                >
                  <button
                    className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary from-70% to-[#5a66ee] px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-all hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={loading}
                  >
                    <Mail className="h-4 w-4" />
                    <span className="hidden md:inline">Email</span>
                  </button>
                </Popconfirm>

                {credentials && (
                  <Popconfirm
                    title="Send fleet via SMS now?"
                    onConfirm={handleSms}
                    okText="Yes"
                    cancelText="No"
                    disabled={loading}
                  >
                    <button
                      className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary from-70% to-[#5a66ee] px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-all hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={loading}
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span className="hidden md:inline">SMS</span>
                    </button>
                  </Popconfirm>
                )}
              </div>

              <button
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary from-70% to-[#5a66ee] px-3 py-2 text-sm font-medium text-white shadow-md shadow-indigo-200 transition-all hover:scale-[1.02] hover:shadow-lg active:scale-95 md:px-4 md:text-base disabled:cursor-not-allowed disabled:opacity-50"
                onClick={handleCopyLink}
                disabled={loading}
              >
                <Copy className="h-4 w-4" />
                <span className="hidden md:inline">Copy Link</span>
              </button>
            </div>
          </DialogHeader>

          {/* Company Info */}
          <div className="flex w-full flex-row items-start justify-between gap-6 border-b border-slate-100 py-6 md:items-center md:gap-0">
            <div className="flex items-center justify-center">
              {company?.image ? (
                <Image
                  src={`${company.image}`}
                  alt="company logo"
                  width={144}
                  height={144}
                  className="rounded-xl object-contain ring-1 ring-slate-200/60 shadow-sm"
                />
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-gradient-to-br from-slate-100 to-slate-200 text-xs font-black uppercase tracking-wider text-slate-400">
                  Logo
                </div>
              )}
            </div>

            <div className="text-right">
              <h2 className="mb-1.5 text-xs font-black uppercase tracking-[0.2em] text-primary">
                Contact Information
              </h2>
              <p className="text-base font-bold tracking-tight text-slate-700 md:text-lg">
                {company?.name || "Company Name"}
              </p>
              <div className="mt-2 space-y-0.5 text-xs font-medium text-slate-500 md:text-sm">
                <p className="leading-relaxed">
                  {company?.address && `${company.address}`}
                  {company?.address && company?.city && ", "}
                  {company?.city && `${company.city}`}
                  <br className="md:hidden" />
                  {company?.city && company?.state && ", "}
                  {company?.state && `${company.state}`}
                  {company?.state && company?.zip && " "}
                  {company?.zip && `${company.zip}`}
                  {!company?.address && !company?.city && !company?.state
                    ? "Full Address: N/A"
                    : ""}
                </p>
                <div className="flex flex-col items-end gap-1 pt-1">
                  <p className="font-bold text-slate-500">
                    {company?.phone || "Mobile Number: N/A"}
                  </p>
                  <p className="max-w-[250px] break-words italic text-slate-500">
                    {company?.email || "Email: N/A"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div>
              <h1 className="col-span-full text-center text-xl font-bold uppercase text-slate-500 md:text-left md:text-3xl">
                Fleet Statement
              </h1>
              <p className="font-semibold">
                {statement?.createdAt
                  ? new Date(statement.createdAt).toLocaleDateString()
                  : ""}
              </p>
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
          <div className="thin-scrollbar max-h-[40vh] overflow-x-hidden overflow-y-auto rounded-lg border border-slate-200">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-gray-500">Loading statement...</div>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50">
                  <tr className="border-b border-slate-200">
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
                      className={index % 2 === 0 ? "bg-white" : "bg-slate-50"}
                    >
                      <td className="border-b px-4 py-2 text-left">
                        <InvoiceModal
                          invoiceId={invoice?.id}
                          buttonChild={<button>{invoice?.id}</button>}
                          buttonChildClassName="block w-full text-primary hover:underline"
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
                              ? "font-semibold text-red-600"
                              : "font-semibold text-green-600"
                          }
                        >
                          ${Number(invoice.due || 0).toFixed(2)}
                        </span>
                      </td>
                      <td className={`${tDataCommonClasses}`}>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                          {invoice.column?.title || "N/A"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 border-t border-gray-200 bg-white p-3 sm:p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              {/* Company Summary */}
              <div className="space-y-1 text-xs text-gray-600 sm:text-sm">
                <p className="font-semibold text-gray-800">
                  {company?.name || "Company Name"}
                </p>
                <p>{fleet?.fleetName || "Fleet Name"}</p>
                <div className="mt-2 flex gap-4 text-xs">
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
                <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                        Amount Due
                      </p>
                      <p className="text-2xl font-bold text-slate-600">
                        {formatCurrency(totals.totalDue)}
                      </p>
                    </div>

                    {totals.totalDue > 0 ? (
                      <button
                        className="w-full rounded-xl border border-primary/40 bg-gradient-to-r from-primary to-[#5a66ee] px-5 py-2 font-semibold text-white shadow-sm transition-all hover:border-primary/70 hover:bg-primary/10 active:scale-95 sm:w-auto"
                        onClick={() => setPaymentModalOpen(true)}
                      >
                        Make Payment
                      </button>
                    ) : (
                      <div className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-center text-sm font-semibold text-emerald-700 sm:w-auto">
                        Fully Paid ✓
                      </div>
                    )}
                  </div>
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

      {/* Edit Statement Modal  */}
      {statementId && statement && (
        <EditFleetStatementModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          statementId={statementId}
          currentInvoices={invoices}
          onStatementUpdated={handleEditSuccess}
        />
      )}
    </>
  );
};
