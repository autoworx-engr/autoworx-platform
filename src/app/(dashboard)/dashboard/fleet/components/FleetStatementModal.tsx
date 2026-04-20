"use client";
import { sendFleetEmail } from "@/actions/fleet/sendFleetEmail";
import { sendFleetSms } from "@/actions/fleet/sendFleetSms";
import { getFleetStatement } from "@/actions/fleet/statement";
import { getOrCreateShortLinkAction } from "@/actions/shortener/getOrCreateShortLink";
import { Dialog, DialogContent, DialogHeader } from "@/components/Dialog";
import InvoiceModal from "@/components/invoice-modal/InvoiceModal";
import { cn } from "@/lib/cn";
import { errorToast, successToast } from "@/lib/toast";
import { useTwilioStore } from "@/stores/useTwilioStore";
import { formatCurrency } from "@/utils/formatCurrency";
import { pdf } from "@react-pdf/renderer";
import { Popconfirm } from "antd";
import { Mail, SquarePen } from "lucide-react";
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
  const [editModalOpen, setEditModalOpen] = useState(false); // Add this state
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

  // Add edit handler
  const handleEditStatement = () => {
    // Check if statement has any paid or partially paid invoices
    const hasPaidInvoices = invoices.some(
      (inv: any) => inv.due === 0 || inv.due < inv.grandTotal,
    );

    if (hasPaidInvoices) {
      errorToast("Cannot edit statement with paid or partially paid invoices");
      return;
    }

    if (totals.totalDue === 0) {
      errorToast("Cannot edit a fully paid statement");
      return;
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
    totals.totalDue > 0 &&
    !invoices.some((inv: any) => inv.due === 0 || inv.due < inv.grandTotal);

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
            <div className="grid w-full grid-cols-2 flex-wrap items-center justify-center gap-2 md:flex md:gap-3">
              {/* Replace Link with button */}
              <button
                onClick={handleEditStatement}
                disabled={!canEdit}
                className={cn(
                  "flex items-center justify-center gap-1 rounded px-2 py-1 text-sm md:px-4 md:text-base transition-all",
                  canEdit
                    ? "bg-[#6571FF] text-white hover:bg-[#5461ee]"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed opacity-60",
                )}
                title={
                  !canEdit
                    ? "Cannot edit paid or partially paid statements"
                    : "Edit statement"
                }
              >
                <SquarePen className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden md:inline">Edit</span>
              </button>

              <button
                className="flex items-center justify-center gap-1 rounded bg-[#6571FF] px-2 py-1 text-sm text-white md:px-4 md:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handlePDFPrint}
                disabled={loading}
              >
                <svg
                  fill="#ffffff"
                  viewBox="0 0 32 32"
                  className="h-3 w-3 md:h-4 md:w-4"
                  version="1.1"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                  <g
                    id="SVGRepo_tracerCarrier"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  ></g>
                  <g id="SVGRepo_iconCarrier">
                    <title>print</title>
                    <path d="M30 13.75h-2.75v-7.75c0-0 0-0.001 0-0.001 0-0.345-0.14-0.657-0.365-0.883l-4-4c-0.226-0.226-0.539-0.366-0.885-0.366-0 0-0 0-0 0h-17c-0.69 0-1.25 0.56-1.25 1.25v0 11.75h-1.75c-0.69 0-1.25 0.56-1.25 1.25v0 9c0 0.69 0.56 1.25 1.25 1.25s1.25-0.56 1.25-1.25v0-7.75h25.5v7.75c0 0.69 0.56 1.25 1.25 1.25s1.25-0.56 1.25-1.25v0-9c-0-0.69-0.56-1.25-1.25-1.25h-0zM6.25 3.25h15.232l3.268 3.268v7.232h-18.5zM26 20.75h-20c-0.69 0-1.25 0.56-1.25 1.25v8c0 0.69 0.56 1.25 1.25 1.25h20c0.69-0.001 1.249-0.56 1.25-1.25v-8c-0.001-0.69-0.56-1.249-1.25-1.25h-0zM24.75 28.75h-17.5v-5.5h17.5zM26.879 17.62c-0.228-0.228-0.544-0.37-0.893-0.37-0.168 0-0.329 0.033-0.475 0.093l0.008-0.003c-0.16 0.060-0.295 0.156-0.399 0.279l-0.001 0.001c-0.119 0.109-0.213 0.242-0.277 0.392l-0.003 0.007c-0.059 0.142-0.095 0.306-0.1 0.479l-0 0.002c0.002 0.346 0.147 0.657 0.378 0.878l0 0c0.226 0.223 0.537 0.361 0.88 0.361s0.654-0.138 0.88-0.361l-0 0c0.233-0.222 0.378-0.533 0.381-0.878v-0c-0.005-0.174-0.041-0.339-0.103-0.49l0.003 0.009c-0.066-0.158-0.161-0.291-0.28-0.399l-0.001-0.001z"></path>
                  </g>
                </svg>
                <span className="hidden md:inline">Print</span>
              </button>

              <div className="flex items-center gap-x-2 rounded-md border border-gray-300 px-2 py-1">
                <span className="mr-1 font-semibold">Share via</span>
                <Popconfirm
                  title="Send fleet via Email now?"
                  onConfirm={handleEmail}
                  okText="Yes"
                  cancelText="No"
                  disabled={loading}
                >
                  <button
                    className="flex items-center justify-center gap-1 rounded bg-[#6571FF] px-2 py-1 text-sm text-white md:px-4 md:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={loading}
                  >
                    <Mail className="h-4 w-4 md:h-4 md:w-4" />
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
                      className="flex items-center justify-center gap-1 rounded bg-[#6571FF] px-2 py-1 text-sm text-white md:px-4 md:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={loading}
                    >
                      <svg
                        fill="#ffffff"
                        height="24"
                        width="24"
                        version="1.1"
                        id="Icon"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="-5.28 -5.28 34.56 34.56"
                        enableBackground="new 0 0 24 24"
                        stroke="#ffffff"
                        strokeWidth="0.36"
                      >
                        <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                        <g
                          id="SVGRepo_tracerCarrier"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          stroke="#CCCCCC"
                          strokeWidth="0.144"
                        ></g>
                        <g id="SVGRepo_iconCarrier">
                          <path d="M12,1C5.37,1,0,5.58,0,10.55c0,2.92,1.86,5.95,4.72,7.59L3,23l5.85-3.32C9.86,19.88,10.91,20,12,20c6.63,0,12-4.48,12-9.45 C24,5.58,18.63,1,12,1z M6.55,13.8c-0.53,0.47-1.24,0.7-2.14,0.7c-0.52,0-0.97-0.06-1.36-0.17c-0.39-0.11-0.75-0.26-1.09-0.43v-1.84 h0.16c0.34,0.33,0.71,0.58,1.12,0.76c0.41,0.18,0.8,0.26,1.19,0.26c0.1,0,0.23-0.01,0.38-0.04c0.16-0.02,0.29-0.06,0.38-0.11 c0.12-0.06,0.22-0.14,0.3-0.25c0.08-0.1,0.12-0.24,0.12-0.42c0-0.19-0.07-0.35-0.2-0.47s-0.29-0.21-0.48-0.26 c-0.23-0.07-0.47-0.13-0.73-0.2c-0.26-0.06-0.51-0.14-0.73-0.23c-0.52-0.21-0.9-0.49-1.12-0.85c-0.23-0.36-0.34-0.8-0.34-1.34 c0-0.72,0.27-1.31,0.8-1.75c0.53-0.45,1.2-0.67,2-0.67c0.4,0,0.8,0.05,1.2,0.14c0.4,0.09,0.75,0.22,1.06,0.38v1.76H6.93 C6.68,8.54,6.37,8.33,6.01,8.16C5.65,7.99,5.28,7.9,4.9,7.9c-0.15,0-0.28,0.01-0.4,0.04C4.38,7.97,4.26,8.01,4.13,8.08 c-0.11,0.06-0.2,0.14-0.27,0.25C3.78,8.44,3.74,8.56,3.74,8.69c0,0.2,0.06,0.35,0.18,0.47c0.12,0.12,0.36,0.22,0.71,0.31 c0.23,0.06,0.44,0.12,0.66,0.17C5.49,9.7,5.72,9.78,5.96,9.87c0.47,0.19,0.82,0.45,1.04,0.78c0.23,0.33,0.34,0.76,0.34,1.29 C7.34,12.72,7.08,13.33,6.55,13.8z M15.33,14.36h-1.68V9.24l-1.23,3.3h-1.16l-1.23-3.3v5.12H8.44V6.64h1.95l1.5,3.81l1.49-3.81h1.95 V14.36z M21.18,13.8c-0.53,0.47-1.24,0.7-2.14,0.7c-0.52,0-0.97-0.06-1.36-0.17c-0.39-0.11-0.75-0.26-1.09-0.43v-1.84h0.16 c0.34,0.33,0.71,0.58,1.12,0.76c0.41,0.18,0.8,0.26,1.19,0.26c0.1,0,0.23-0.01,0.38-0.04c0.16-0.02,0.29-0.06,0.38-0.11 c0.12-0.06,0.22-0.14,0.3-0.25c0.08-0.1,0.12-0.24,0.12-0.42c0-0.19-0.07-0.35-0.2-0.47s-0.29-0.21-0.48-0.26 c-0.23-0.07-0.47-0.13-0.73-0.2c-0.26-0.06-0.51-0.14-0.73-0.23c-0.52-0.21-0.9-0.49-1.12-0.85c-0.23-0.36-0.34-0.8-0.34-1.34 c0-0.72,0.27-1.31,0.8-1.75c0.53-0.45,1.2-0.67,2-0.67c0.4,0,0.8,0.05,1.2,0.14c0.4,0.09,0.75,0.22,1.06,0.38v1.76h-0.15 c-0.25-0.25-0.56-0.45-0.92-0.62C20.27,7.99,19.9,7.9,19.52,7.9c-0.15,0-0.28,0.01-0.4,0.04C19,7.97,18.88,8.01,18.75,8.08 c-0.11,0.06-0.2,0.14-0.27,0.25c-0.08,0.11-0.12,0.23-0.12,0.37c0,0.2,0.06,0.35,0.18,0.47c0.12,0.12,0.36,0.22,0.71,0.31 c0.23,0.06,0.44,0.12,0.66,0.17c0.21,0.06,0.43,0.13,0.67,0.23c0.47,0.19,0.82,0.45,1.04,0.78c0.23,0.33,0.34,0.76,0.34,1.29 C21.97,12.72,21.7,13.33,21.18,13.8z"></path>
                        </g>
                      </svg>
                      <span className="hidden md:inline">SMS</span>
                    </button>
                  </Popconfirm>
                )}
              </div>

              <button
                className="flex items-center justify-center gap-1 rounded bg-[#6571FF] px-2 py-1 text-sm text-white md:px-4 md:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleCopyLink}
                disabled={loading}
              >
                <svg
                  viewBox="0 0 32 32"
                  height="16"
                  width="16"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="#ffffff"
                >
                  <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                  <g
                    id="SVGRepo_tracerCarrier"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  ></g>
                  <g id="SVGRepo_iconCarrier">
                    <g fill="none" fillRule="evenodd">
                      <path d="m0 0h32v32h-32z"></path>
                      <path
                        d="m24.110782 0 5.889218 8.76607872v19.23392128h-4v4h-24v-28h4v-4zm-18.110782 6h-2v24h20v-2h-18z"
                        fill="#ffffff"
                        fillRule="nonzero"
                      ></path>
                    </g>
                  </g>
                </svg>
                <span className="hidden md:inline">Copy Link</span>
              </button>
            </div>
          </DialogHeader>

          {/* Company Info */}
          <div className="flex w-full flex-row justify-between gap-4 md:items-center md:gap-0 2xl:py-1">
            <div
              className={cn(
                "flex aspect-square items-center justify-center text-center font-bold text-white",
                company?.image ? "w-32" : "w-32 bg-gray-500",
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
          <div className="thin-scrollbar max-h-[40vh] overflow-x-hidden overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-gray-500">Loading statement...</div>
              </div>
            ) : (
              <table className="w-full">
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
                <div className="rounded-lg bg-[#006D77] p-3 shadow-lg sm:p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-white sm:text-lg">
                      Amount Due
                    </span>
                    <span className="text-lg font-bold text-white sm:text-xl">
                      {formatCurrency(totals.totalDue)}
                    </span>
                  </div>

                  {totals.totalDue > 0 ? (
                    <button
                      className="w-full bg-white py-2 font-semibold text-[#006D77] hover:bg-gray-100 sm:py-3"
                      onClick={() => setPaymentModalOpen(true)}
                    >
                      Make Payment
                    </button>
                  ) : (
                    <div className="w-full rounded-lg bg-green-100 px-4 py-2 text-center text-sm font-semibold text-green-800 sm:py-3 sm:text-base">
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
