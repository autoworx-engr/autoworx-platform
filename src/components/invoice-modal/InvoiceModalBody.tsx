"use client";
import { authorizeInvoice } from "@/actions/estimate/invoice/authorize";
import { getInvoiceModalData } from "@/actions/estimate/invoice/getInvoiceModalData";
import { getIsWorkorderCreated } from "@/actions/estimate/invoice/getworkorderCreated";
import { sendInvoiceEmail } from "@/actions/estimate/invoice/sendInvoiceEmail";
import { sendInvoiceSms } from "@/actions/estimate/invoice/sendInvoiceSms";
import { getPaymentGatewayInfo } from "@/app/(dashboard)/dashboard/settings/payments/getPaymentGatewayInfo";
import { getStripeAccount } from "@/app/(dashboard)/dashboard/settings/payments/stripe";
import {
  DialogClose,
  DialogContentBlank,
  DialogOverlay,
  DialogPortal,
} from "@/components/Dialog";
import { useServerGet } from "@/hooks/useServerGet";
import { queryKeys } from "@/lib/queryKeys";
import { errorToast, successToast } from "@/lib/toast";
import { calculateDue } from "@/utils/calculateDue";
import { formatCurrency } from "@/utils/formatCurrency";
import { getFileFromCanvas } from "@/utils/getFileFromCanvas";
import { useCanAccessRoute } from "@/hooks/useCanAccessRoute";
import { useGetCurrentUser } from "@/utils/useGetCurrentUser";
import {
  CardPayment,
  CashPayment,
  CheckPayment,
  Client,
  Column,
  Company,
  DepositPayment,
  InfobipConfig,
  Invoice,
  InvoiceItem,
  InvoicePhoto,
  InvoiceType,
  Labor,
  Material,
  OtherPayment,
  Payment,
  PaymentMethod,
  Refund,
  Service,
  TwilioCredentials,
  User,
  Vehicle,
} from "@prisma/client";
import { useQuery } from "@tanstack/react-query";
import { Popconfirm, Tooltip } from "antd";
import {
  Calendar,
  ChevronDown,
  Copy,
  Eye,
  FileDown,
  Mail,
  MessageCircle,
  MessageCircleMore,
  Printer,
  SquarePen,
  X,
} from "lucide-react";
import moment from "moment";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { useReactToPrint } from "react-to-print";
import { AppointmentCreateOrEdit } from "../appointment/AppointmentCreateOrEdit";
import CarLoading from "../common/CarLoading";
import WorkOrderModal from "../workorder-modal/WorkOrderModal";
import { InspectionItems } from "./InspectionItems";
import { InvoiceItems } from "./InvoiceItems";
import { PayNow } from "./PayNow";

const DownloadPDF = dynamic(() => import("./DownloadInvoice"), {
  ssr: false,
});

const InvoicePdfActions = dynamic(() => import("./InvoicePdfActions"), {
  ssr: false,
});

type InvoiceData = Invoice & {
  column: Column | null;
  company: Company & { TwilioCredentials: TwilioCredentials };
  invoiceItems: (InvoiceItem & {
    materials: Material[] | [];
    service: Service | null;
    invoice: Invoice | null;
    labor: Labor | null;
  })[];
  photos: InvoicePhoto[];
  user: User;
  client: Client;
  vehicle: Vehicle;
  payments: (Payment & {
    card: CardPayment | null;
    check: CheckPayment | null;
    cash: CashPayment | null;
    other: (OtherPayment & { paymentMethod: PaymentMethod | null }) | null;
    deposit: DepositPayment | null;
    Refund: Refund[];
  })[];
};

export default function InvoiceModalBody({
  invoiceId,
  isPublic = false,
  isShowEdit = true,
  fromCollaboration = false,
}: {
  invoiceId?: string;
  isPublic?: boolean;
  isShowEdit?: boolean;
  fromCollaboration?: boolean;
}) {
  const searchParams = useSearchParams();

  const [invoice, setInvoice] = useState<InvoiceData>();
  const { data, isLoading, isError, error, isFetched } = useQuery({
    queryKey: queryKeys.getInvoiceModalDataKey(invoiceId!),
    queryFn: () => getInvoiceModalData(invoiceId!),
    enabled: !!invoiceId,
  });

  const [twilioCredentials, setTwilioCredentials] = useState<
    TwilioCredentials | InfobipConfig | null
  >();
  // const [isLoading, setIsLoading] = useState(true);
  const printComponentRef = useRef(null);
  const promiseResolveRef = useRef<any>(null);
  const sigCanvas = useRef<any>(null);
  const [showAuthorizedName, setShowAuthorizedName] = useState(false);
  const [authorizedName, setAuthorizedName] = useState("");
  const [signImage, setSignImage] = useState(null);
  const [authorizedNameInput, setAuthorizedNameInput] = useState("");
  const [sigImageURL, setSigImageURL] = useState(null);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "estimate" | "attachments" | "inspections"
  >("estimate");
  const [desktopActiveTab, setDesktopActiveTab] = useState<
    "attachments" | "inspections"
  >("attachments");
  const params = new URLSearchParams(searchParams!);
  const isSuccess = params.get("success") ?? false;

  const isStripe = params.get("stripe") ?? false;
  const [isStripeDialogOpen, setIsStripeDialogOpen] = useState(false);

  const [isSuccessMsgShown, setIsSuccessMsgShown] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [openGroup, setOpenGroup] = useState<"export" | "share" | null>(null);
  const isExportOpen = openGroup === "export";
  const isShareOpen = openGroup === "share";

  const canEdit = useCanAccessRoute("/dashboard/estimate");

  // Detect if we're coming from an intercepted route
  const fromInterceptedRoute =
    params.get("fromRoute") === "invoice" ||
    params.get("fromRoute") === "public-invoice";

  useEffect(() => {
    if (isFetched && !isLoading && data) {
      setInvoice(data.invoice);
      setTwilioCredentials(data?.twilioCredentials);
      const refundAmount =
        data.invoice.Refund?.reduce(
          (total: number, refund: Refund) =>
            total + (Number(refund.amount) || 0),
          0,
        ) || 0;

      setRefundAmount(refundAmount);

      // Important: Set the authorized name from the server data
      if (data.invoice?.authorizedName) {
        setAuthorizedName(data.invoice.authorizedName);
        setAuthorizedNameInput(data.invoice.authorizedName);
      }
      if (data.invoice?.signatureImage) {
        setSignImage(data.invoice?.signatureImage);
      }
    }
  }, [isLoading, data, isFetched]);

  // We watch for the state to change here, and for the Promise resolve to be available
  useEffect(() => {
    if (isPrinting && promiseResolveRef.current) {
      // Resolves the Promise, letting `react-to-print` know that the DOM updates are completed
      promiseResolveRef.current();
    }
  }, [isPrinting]);

  const handlePrint = useReactToPrint({
    content: () => printComponentRef.current,
    onBeforePrint: () => {
      return new Promise((resolve) => {
        promiseResolveRef.current = resolve;
        setIsPrinting(true);
      });
    },
    onAfterPrint: () => {
      // Reset the Promise resolve so we can print again
      promiseResolveRef.current = null;
      setIsPrinting(false);
    },
  });
  const currentUser = useGetCurrentUser();

  // If the invoice is not passed, and selfFetch is not set to true, throw an error
  if (!invoiceId) {
    throw new Error("Invoice id not provided");
  }
  const companyId = data?.invoice?.companyId;
  const { data: stripeAccountData } = useServerGet(getStripeAccount, companyId);
  const { data: gatewayInfo } = useServerGet(getPaymentGatewayInfo, companyId);

  useEffect(() => {
    if (isSuccess && !isSuccessMsgShown) {
      successToast("Payment Successfully Completed !");
      setIsSuccessMsgShown(true);
    }
  }, [isSuccessMsgShown, isSuccess]);

  useEffect(() => {
    if (isStripe) {
      setIsStripeDialogOpen(true);
    }
  }, [isStripe]);

  // Track invoice view for public users
  useEffect(() => {
    if (isPublic && invoiceId && isFetched && !isLoading) {
      // Call the track-view endpoint
      fetch("/api/invoice/track-view", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ invoiceId }),
      }).catch((error) => {
        console.error("Failed to track invoice view:", error);
      });
    }
  }, [isPublic, invoiceId, isFetched, isLoading]);

  if (isLoading) {
    return (
      <DialogPortal>
        {/* <DialogOverlay /> */}
        <DialogContentBlank className="fixed left-[50%] top-[50%] z-50 flex h-full w-full translate-x-[-50%] translate-y-[-50%] flex-col justify-center gap-1 overflow-y-auto py-4 duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] md:max-h-full md:max-w-[98%] md:flex-row md:gap-4">
          <div className="flex h-full w-full items-center justify-center">
            <div className="text-center">
              <CarLoading />
            </div>
          </div>
        </DialogContentBlank>
      </DialogPortal>
    );
  }

  if (!invoice) {
    return <></>;
  }

  const company = invoice.company;
  const client = invoice.client;
  const vehicle = invoice.vehicle;
  const paymentEntries = (invoice.payments ?? [])
    .filter((payment) => payment.invoiceId === invoice.id)
    .sort(
      (a, b) =>
        new Date(b.date || b.createdAt).getTime() -
        new Date(a.date || a.createdAt).getTime(),
    );

  const getPaymentMethodText = (payment: InvoiceData["payments"][number]) => {
    if (payment.type === "OTHER") {
      return payment.other?.paymentMethod?.name || "OTHER";
    }

    if (payment.type === "CARD") {
      return payment.card?.cardType || "CARD";
    }

    return payment.type;
  };

  const handleEmail = async () => {
    let res = await sendInvoiceEmail({ invoiceId: invoice.id });
    if (!res?.success) {
      errorToast(res?.message || "Error sharing invoice");
      return;
    }
    successToast("Invoice sent successfully");
  };
  const handleSms = async () => {
    let res = await sendInvoiceSms({ invoiceId: invoice.id });
    if (!res?.success) {
      errorToast(res?.message || "Error sharing invoice");
      return;
    }
    successToast("Invoice sent successfully");
  };
  const handleCopyLink = async () => {
    const urlToCopy = `${process.env.NEXT_PUBLIC_APP_URL}/public-invoice/${invoiceId}`;

    try {
      if (
        typeof window !== "undefined" &&
        navigator.clipboard &&
        navigator.clipboard.writeText
      ) {
        await navigator.clipboard.writeText(urlToCopy);
        successToast("Link copied to clipboard");
      } else {
        throw new Error("Clipboard API unavailable");
      }
    } catch (error) {
      console.warn("Clipboard failed, using fallback:", error);

      // 4. The "Old School" Fallback
      // This creates a temporary input, selects the text, and copies it.
      // This is more compatible with older/insecure environments.
      try {
        const textArea = document.createElement("textarea");
        textArea.value = urlToCopy;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy"); // Older way of copying
        document.body.removeChild(textArea);
        successToast("Link copied (fallback)");
      } catch (fallbackError) {
        // 5. Final Fallback: If all else fails, just show the link to the user
        window.prompt("Copy link manually:", urlToCopy);
      }
    }
  };

  const handleSaveSignature = async (invoiceId: string) => {
    if (!sigCanvas.current) return;

    try {
      const file = getFileFromCanvas(
        sigCanvas.current.getCanvas(),
        `signature-${invoiceId}.png`,
      );

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        console.error("Failed to upload photos");
        throw new Error("Failed to upload photos");
      }

      const json = await res.json();
      const data = json.data;

      // const response = await uploadSignature(invoiceId, data[0]);

      const response = await authorizeInvoice(
        invoice.id,
        authorizedNameInput,
        data[0],
        invoice.type,
      );

      if (response?.type === "success") {
        successToast("Invoice Authorized");

        setSignImage(data[0]);
        setAuthorizedName(authorizedNameInput);
        setInvoice((prev) =>
          prev
            ? {
                ...prev,
                signatureImage: data[0],
                authorizedName: authorizedNameInput,
                wasAuthorized: true,
              }
            : prev,
        );
      } else {
        errorToast("Signature upload failed");
        console.error("Signature upload failed:");
      }
    } catch (err) {
      errorToast("Signature upload failed");
      console.error("Signature upload failed:", err);
    }
  };

  const totalMaterialSell = invoice.invoiceItems.reduce(
    (invoiceSum: number, invoiceItem: any) =>
      invoiceSum +
      (invoiceItem.materials ?? []).reduce(
        (materialSum: number, material: { quantity?: number; sell?: number }) =>
          materialSum + (material.quantity ?? 0) * (material.sell ?? 0),
        0,
      ),
    0,
  );

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogContentBlank
        onPointerDownOutside={(e) => {
          // Prevent closing when clicking on elements inside the dialog
          const target = e.target as HTMLElement;
          if (
            target.closest('[class*="lightbox"], .yarl__container, .yarl__')
          ) {
            e.preventDefault();
          }
        }}
        className="fixed left-[50%] top-[50%] z-50 flex h-full w-full translate-x-[-50%] translate-y-[-50%] flex-col justify-center gap-1 overflow-y-auto py-4 duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] md:max-h-full md:max-w-[98%] md:flex-row md:gap-4"
      >
        <div
          ref={printComponentRef}
          className="#shadow-lg no-visible-scrollbar relative grid h-full w-full shrink grow-0 flex-col items-center justify-center gap-4 overflow-y-auto rounded-md border bg-background p-6 md:h-[95vh] md:w-[800px] md:flex-row print:block print:h-auto print:w-full print:border-none print:p-0 print:shadow-none"
        >
          {/* Action Buttons */}
          {!isPublic && isShowEdit && (
            <div className="mt-6 flex w-full flex-col items-center gap-3 print:hidden">
              {/* Row 1 — main actions */}
              <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3">
                {/* Edit Link */}
                {isShowEdit && (
                  <Tooltip
                    title={
                      canEdit ? "Edit" : "You don't have permission to edit"
                    }
                  >
                    <span
                      className={
                        !canEdit ? "cursor-not-allowed opacity-50" : undefined
                      }
                    >
                      <Link
                        className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary from-70% to-[#5a66ee] px-4 py-2 text-sm font-medium text-white shadow-md shadow-indigo-200 transition-all hover:scale-[1.02] hover:shadow-lg active:scale-95 md:text-base"
                        href={
                          canEdit
                            ? `/dashboard/estimate/edit/${invoice.id}?clientId=${invoice.clientId}`
                            : "#"
                        }
                        onClick={(e) => {
                          if (!canEdit) e.preventDefault();
                        }}
                        aria-disabled={!canEdit}
                        tabIndex={!canEdit ? -1 : undefined}
                        style={!canEdit ? { pointerEvents: "none" } : undefined}
                      >
                        <SquarePen className="h-4 w-4 md:h-5 md:w-5" />
                        {/* <span className="hidden md:inline">Edit</span> */}
                      </Link>
                    </span>
                  </Tooltip>
                )}

                {/* Communications Link */}
                <Tooltip title="Communications" placement="top">
                  <Link
                    href={`/dashboard/communication/client/${invoice.clientId}?chat=true`}
                    className="flex items-center justify-center rounded-xl bg-gradient-to-r from-primary from-70% to-[#5a66ee] px-4 py-2 text-sm font-medium text-white shadow-md shadow-indigo-200 transition-all hover:scale-[1.02] hover:shadow-lg active:scale-95 md:text-base"
                  >
                    <MessageCircleMore className="h-4 w-4 md:h-5 md:w-5" />
                  </Link>
                </Tooltip>

                {/* Export Group — Print/PDF */}
                <div className="flex items-center gap-0 rounded-2xl border border-slate-200 bg-white/80 px-1 py-1 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
                  <button
                    className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary from-70% to-[#5a66ee] px-4 py-1.5 text-sm font-medium text-white shadow-sm transition-all hover:scale-[1.02] active:scale-95"
                    onClick={() =>
                      setOpenGroup((p) => (p === "export" ? null : "export"))
                    }
                  >
                    <FileDown className="h-4 w-4" />
                    <span className="hidden md:inline">Export</span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform duration-300 ease-in-out ${
                        isExportOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* Animated expand */}
                  <div
                    className={`grid transition-all duration-300 ease-in-out ${
                      isExportOpen
                        ? "grid-cols-[1fr] opacity-100"
                        : "grid-cols-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="flex items-center gap-1 pl-1">
                        {client ? (
                          // Print and PDF share one generated document, so
                          // printing outputs the same file the PDF button saves.
                          <InvoicePdfActions
                            id={invoice.id}
                            invoice={invoice}
                            client={client}
                            vehicle={vehicle}
                            companyDetails={company}
                            authorizedName={authorizedName}
                            signImageUrl={signImage ?? undefined}
                            isStripe={
                              (gatewayInfo?.success &&
                                (gatewayInfo?.hasStripe ||
                                  gatewayInfo?.hasAuthorizeNet) &&
                                parseFloat(
                                  Number(invoice?.due ?? 0).toFixed(2),
                                ) > 0) ??
                              false
                            }
                          />
                        ) : (
                          <button
                            className="flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-primary from-70% to-[#5a66ee] px-4 py-1.5 text-sm font-medium text-white shadow-sm transition-all hover:scale-[1.02] active:scale-95"
                            onClick={handlePrint}
                          >
                            <Printer className="h-4 w-4" />
                            <span className="hidden md:inline">Print</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Share Group — Email/SMS */}
                <div className="flex items-center gap-0 rounded-2xl border border-slate-200 bg-white/80 px-3 py-1 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
                  <button
                    className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-500 transition-colors hover:text-primary dark:text-slate-400 md:text-xs"
                    onClick={() =>
                      setOpenGroup((p) => (p === "share" ? null : "share"))
                    }
                  >
                    Share
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform duration-300 ease-in-out ${
                        isShareOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  <div
                    className={`grid transition-all duration-300 ease-in-out ${
                      isShareOpen
                        ? "grid-cols-[1fr] opacity-100"
                        : "grid-cols-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="flex items-center gap-1 pl-2">
                        <Popconfirm
                          onConfirm={handleEmail}
                          title="Send via Email?"
                          okText="Yes"
                          cancelText="No"
                        >
                          <button className="flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-primary from-70% to-[#5a66ee] px-4 py-1.5 text-sm font-medium text-white shadow-sm transition-all hover:scale-[1.02] active:scale-95">
                            <Mail className="h-4 w-4" />
                            <span className="hidden md:inline">Email</span>
                          </button>
                        </Popconfirm>

                        {twilioCredentials && (
                          <Popconfirm
                            onConfirm={handleSms}
                            title="Send via SMS?"
                            okText="Yes"
                            cancelText="No"
                          >
                            <button className="flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-primary from-70% to-[#5a66ee] px-4 py-1.5 text-sm font-medium text-white shadow-sm transition-all hover:scale-[1.02] active:scale-95">
                              <MessageCircle className="h-4 w-4" />
                              <span className="hidden md:inline">SMS</span>
                            </button>
                          </Popconfirm>
                        )}

                        {/* Copy Link Button */}
                        <button
                          className="flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-primary from-70% to-[#5a66ee] px-4 py-1.5 text-sm font-medium text-white shadow-sm transition-all hover:scale-[1.02] active:scale-95"
                          onClick={handleCopyLink}
                        >
                          <Copy className="h-4 w-4" />
                          <span className="hidden md:inline">Copy Link</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Create Appointment Button */}
                <Tooltip title="Create Appointment" placement="top">
                  <button
                    type="button"
                    className="flex items-center justify-center rounded-xl bg-gradient-to-r from-primary from-70% to-[#5a66ee] px-4 py-2 text-sm font-medium text-white shadow-md shadow-indigo-200 transition-all hover:scale-[1.02] hover:shadow-lg active:scale-95 md:text-base print:hidden"
                    onClick={() => setIsAppointmentModalOpen(true)}
                  >
                    <Calendar className="h-4 w-4 md:h-5 md:w-5" />
                  </button>
                </Tooltip>

                <AppointmentCreateOrEdit
                  clientId={invoice.clientId}
                  vehicleId={invoice.vehicleId}
                  draftEstimateId={invoice.id}
                  isModalOpen={isAppointmentModalOpen}
                  setIsModalOpen={setIsAppointmentModalOpen}
                  onAppointmentCreated={(appointment) => {
                    setIsAppointmentModalOpen(false);
                  }}
                  onAppointmentUpdated={(appointment) => {
                    setIsAppointmentModalOpen(false);
                  }}
                />
              </div>
            </div>
          )}

          {/* Download and Copy Link buttons for public invoice */}
          {isPublic && client && (
            <div className="mt-6 flex w-full justify-center gap-2 print:hidden">
              <button className="flex items-center justify-center whitespace-nowrap rounded-xl bg-gradient-to-r from-primary from-70% to-[#5a66ee] px-4 py-1.5 text-sm font-medium text-white shadow-sm transition-all hover:scale-[1.02] active:scale-95">
                <DownloadPDF
                  id={invoice.id}
                  invoice={invoice}
                  client={client}
                  vehicle={vehicle}
                  companyDetails={company}
                  authorizedName={authorizedName}
                  signImageUrl={signImage ?? undefined}
                  isStripe={
                    (gatewayInfo?.success &&
                      (gatewayInfo?.hasStripe ||
                        gatewayInfo?.hasAuthorizeNet) &&
                      parseFloat(Number(invoice?.due ?? 0).toFixed(2)) > 0) ??
                    false
                  }
                />
              </button>
              <button
                className="flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-primary from-70% to-[#5a66ee] px-4 py-1.5 text-sm font-medium text-white shadow-sm transition-all hover:scale-[1.02] active:scale-95"
                onClick={handleCopyLink}
              >
                <Copy className="h-4 w-4" />
                <span>Copy Link</span>
              </button>
            </div>
          )}

          {/* Company Info */}
          <div className="flex w-full flex-row items-start justify-between gap-6 border-b border-slate-100 pb-8 dark:border-slate-800">
            {/* Logo Container with Soft Shadow & Ring */}
            <div
            // className={cn(
            //   "relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl transition-all duration-300",
            //   company?.image
            //     ? "w-28 ring-1 ring-slate-200/60 shadow-sm md:w-36"
            //     : "w-28 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 md:w-36"
            // )}
            >
              {company?.image ? (
                <Image
                  src={`${company.image}`}
                  alt="company logo"
                  width={144}
                  height={144}
                  className="object-contain rounded-xl"
                />
              ) : (
                <div className="w-28 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 md:w-36 border border-dashed border-slate-300 dark:border-slate-700 flex h-36 md:h-36 items-center justify-center rounded-xl">
                  <span className="text-sm font-black uppercase tracking-wider text-slate-400">
                    No Logo
                  </span>
                </div>
              )}
            </div>

            {/* Contact Information with Clean Hierarchy */}
            <div className="flex flex-col text-right">
              <h2 className="mb-1.5 text-sm font-black uppercase tracking-[0.2em] text-primary dark:text-indigo-400">
                Contact Information
              </h2>

              <p className="text-base font-bold tracking-tight text-slate-600 dark:text-white md:text-lg">
                {company?.name}
              </p>

              <div className="mt-2 space-y-0.5 text-xs font-medium text-slate-500 dark:text-slate-400 md:text-sm">
                <p className="leading-relaxed">
                  {company?.address && `${company.address}`}
                  {company?.address && company?.city && ", "}
                  {company?.city && `${company.city}`}
                  <br className="md:hidden" />
                  {company?.city && company?.state && ", "}
                  {company?.state && `${company.state}`}
                  {company?.state && company?.zip && " "}
                  {company?.zip && `${company.zip}`}
                </p>

                <div className="flex flex-col items-end gap-1 pt-1">
                  <p className="flex items-center gap-1.5 font-bold text-slate-500 dark:text-slate-300">
                    {company?.phone}
                  </p>
                  <p className="whitespace-nowrap text-slate-500 dark:text-slate-500">
                    {company?.email}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogClose
            className={`absolute z-50 flex items-center justify-center rounded-full bg-slate-100/50 text-slate-500 transition-all duration-300 hover:bg-red-50 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-200 active:scale-90 dark:bg-slate-800/50 dark:hover:bg-red-900/30 print:hidden ${
              fromCollaboration
                ? "right-1 top-1 h-6 w-6"
                : "right-2 top-2 h-8 w-8 md:right-3 md:top-3"
            } ${isPublic ? "hidden" : ""}`}
          >
            <X
              className={
                fromCollaboration
                  ? "h-3.5 w-3.5 stroke-[2.5px]"
                  : "h-5 w-5 stroke-[2.5px]"
              }
            />
            <span className="sr-only">Close</span>
          </DialogClose>

          {/* Information Section */}
          <div className="flex w-full flex-col space-y-4 md:flex-row md:space-x-2 md:space-y-0">
            <div className="grid w-full grow grid-cols-2 gap-2 text-xs md:grid-cols-3">
              {/* Tabs */}
              <div className="col-span-full flex justify-center gap-2 md:hidden">
                {[
                  { key: "estimate", label: "Estimate" },
                  { key: "attachments", label: "Attachments" },
                  { key: "inspections", label: "Inspections" },
                ].map((tab) => {
                  const isActive = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key as typeof activeTab)}
                      data-active={isActive}
                      className={`group relative flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium transition-all duration-300 ease-out shadow-sm ring-1 ring-transparent ${
                        isActive
                          ? "text-white shadow-indigo-500/30 ring-black/5 translate-y-[-1px]"
                          : "text-slate-500 dark:text-slate-300 bg-white/70 dark:bg-slate-900/60"
                      }`}
                    >
                      {isActive && (
                        <span className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-r from-primary from-70% to-[#5a66ee]" />
                      )}
                      <span className="whitespace-nowrap">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Estimate Tab Content */}
              {(activeTab === "estimate" ||
                !window.matchMedia("(max-width: 768px)").matches) && (
                <>
                  <h1 className="col-span-full text-center text-xl font-bold uppercase text-slate-600 md:text-left md:text-3xl">
                    {parseFloat(
                      calculateDue(
                        Number(invoice.grandTotal),
                        Number(invoice.totalPayment),
                        Number(invoice.deposit),
                      ).toFixed(2),
                    ) === 0
                      ? "RECEIPT"
                      : invoice?.type?.toUpperCase()}
                  </h1>

                  {/* Client Info */}
                  <div className="overflow-hidden">
                    <h2 className="font-bold text-slate-500">Estimate To:</h2>
                    <p className="flex items-center gap-1 truncate">
                      {client?.firstName} {client?.lastName}
                    </p>

                    <p className="truncate">
                      <a
                        href={`tel:${client?.mobile}`}
                        className="cursor-pointer text-blue-500"
                      >
                        {client?.mobile}
                      </a>
                    </p>
                    <p className="truncate">
                      <a
                        href={`mailto:${client?.email}`}
                        className="text-blue-500"
                      >
                        {client?.email}
                      </a>
                    </p>
                    <Tooltip
                      title={invoice?.customerNotes}
                      placement="top"
                      trigger="click"
                    >
                      <span className="inline-flex cursor-pointer items-center rounded px-1 py-0.5 text-xs border border-slate-200">
                        Note
                      </span>
                    </Tooltip>
                  </div>

                  {/* Vehicle Info */}
                  <div>
                    <h2 className="font-bold text-slate-500">
                      Vehicle Details:
                    </h2>
                    <div>
                      <p>
                        {[
                          vehicle?.year,
                          vehicle?.make,
                          vehicle?.model,
                          vehicle?.other,
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      </p>
                    </div>
                    {vehicle?.submodel && <p>{vehicle.submodel}</p>}
                    {vehicle?.type && <p>{vehicle.type}</p>}
                    {vehicle?.vin && (
                      <>
                        <p>Vin Number</p>
                        <p>{vehicle.vin}</p>
                      </>
                    )}
                  </div>

                  {/* Estimate Details */}
                  <div>
                    <h2 className="font-bold text-slate-500">
                      Estimate Details:
                    </h2>
                    <div className="flex flex-col items-start">
                      <p>{invoice.id}</p>
                      {invoice.isShopBooking && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary my-1.5">
                          Virtual Shop
                        </span>
                      )}
                    </div>
                    <p>{moment(invoice.createdAt).format("MMM DD, YYYY")}</p>
                    <p>Bill Status</p>
                    <p
                      className="mt-2 max-w-32 rounded-md px-2 py-[1px] text-xs font-semibold md:mt-0"
                      style={{
                        color: invoice.column?.textColor || undefined,
                        backgroundColor: invoice?.column?.bgColor || undefined,
                      }}
                    >
                      {invoice.column?.title}
                    </p>

                    <p>
                      {parseFloat(
                        calculateDue(
                          Number(invoice.grandTotal),
                          Number(invoice.totalPayment),
                          Number(invoice.deposit),
                        ).toFixed(2),
                      ) === 0 && <span>Payment Status</span>}
                    </p>
                    <p className="pt-1">
                      {parseFloat(
                        calculateDue(
                          Number(invoice.grandTotal),
                          Number(invoice.totalPayment),
                          Number(invoice.deposit),
                        ).toFixed(2),
                      ) === 0 && (
                        <span className="text-green-500 bg-green-200 rounded-md  px-4 py-[1px] text-xs font-semibold md:mt-1">
                          PAID
                        </span>
                      )}
                    </p>

                    {invoice.isViewed && !isPublic && (
                      <div className="mt-1 flex items-center gap-1">
                        <Eye className="h-4 w-4 text-green-500" />
                        <span className="text-xs text-green-500">Viewed</span>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Attachments Tab Content - Only visible on mobile when selected */}
              {activeTab === "attachments" &&
                window.matchMedia("(max-width: 768px)").matches && (
                  <div className="col-span-full">
                    <h2 className="col-span-full text-center text-xl font-bold uppercase text-slate-500 md:text-3xl">
                      Attachments
                    </h2>
                    <div className="mt-2 flex w-full items-center justify-center">
                      <div className="grid w-full grid-cols-3 gap-4 px-2 sm:px-4 [@media(max-width:374px)]:grid-cols-2">
                        {invoice.photos.map((x, index) => {
                          const allImageUrls = invoice.photos.map(
                            (photo) => photo.photo,
                          );
                          const urlsParam = encodeURIComponent(
                            JSON.stringify(allImageUrls),
                          );
                          return (
                            <Link
                              href={
                                isPublic
                                  ? `/public-invoice/${invoiceId}/photo?urls=${urlsParam}&index=${index}`
                                  : `/dashboard/estimate/photo?urls=${urlsParam}&index=${index}`
                              }
                              key={x.id}
                              className="relative mx-auto aspect-square w-full max-w-[120px]"
                            >
                              <Image
                                src={x.photo}
                                alt="attachment"
                                fill
                                className="cursor-pointer rounded-md object-cover"
                              />
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                    {invoice.photos.length === 0 && (
                      <div className="w-full rounded-md border border-dashed border-gray-300 p-6 text-center text-gray-500">
                        No attachments available
                      </div>
                    )}
                  </div>
                )}

              {/* Inspections Tab Content - Only visible on mobile when selected */}
              {activeTab === "inspections" &&
                window.matchMedia("(max-width: 768px)").matches && (
                  <div className="col-span-full">
                    <h2 className="col-span-full mb-3 text-center text-xl font-bold uppercase text-slate-500 md:text-3xl">
                      Inspections
                    </h2>
                    <InspectionItems
                      invoiceId={invoice.id}
                      damageNotes={
                        invoice.damageNotes ? invoice.damageNotes : ""
                      }
                    />
                  </div>
                )}
            </div>

            {/* Price Summary */}
            <div className="w-full space-y-1 text-sm md:w-auto">
              {(
                [
                  ["subtotal", invoice.subtotal],
                  ["total discount", invoice.discount],
                  ["tax", invoice.tax],
                  // ["vehicle extra cost", invoice.vehicleExtraCost],
                  ["shop supplies", invoice?.serviceFee],
                  ["grand total", invoice.grandTotal],
                  ["deposit", invoice.deposit],
                  ["payment", invoice.totalPayment],
                  [
                    "due",
                    calculateDue(
                      Number(invoice.grandTotal),
                      Number(invoice.totalPayment),
                      Number(invoice.deposit),
                    ),
                  ],
                  ["Refunded", refundAmount],
                ] as const
              ).map(([key, value]) => (
                <div key={key}>
                  {key === "tax" || key === "shop supplies" ? (
                    Number(value) > 0 && (
                      <div className="flex rounded border border-solid border-primary">
                        <span className="min-w-0 flex-1 overflow-x-clip text-ellipsis whitespace-nowrap px-2 font-bold uppercase text-primary">
                          {key}
                        </span>
                        <div className="shrink-0 w-[10rem] rounded bg-primary px-2 text-white">
                          {Number(value)}%
                          {Number(value) !== 0 && (
                            <span>
                              {" "}
                              |{" "}
                              {formatCurrency(
                                (Number(
                                  key === "tax"
                                    ? totalMaterialSell
                                    : (invoice.subtotal as any),
                                ) *
                                  Number(value)) /
                                  100,
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="flex rounded border border-solid border-primary">
                      <span className="min-w-0 flex-1 overflow-x-clip text-ellipsis whitespace-nowrap px-2 font-bold uppercase text-primary">
                        {key}
                      </span>
                      <div className="shrink-0 w-[10rem] rounded bg-gradient-to-br from-primary from-60% to-[#4A55E2] px-2 text-white">
                        {formatCurrency(parseFloat("" + value))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <InvoiceItems
              isPrinting={isPrinting}
              items={invoice.invoiceItems}
            />
          </div>

          {/* payment info  */}
          <div className="space-y-2">
            <h2 className="font-bold text-slate-600">Payment Info</h2>

            {paymentEntries.length === 0 && (
              <div className="rounded-md border border-dashed p-3 text-xs text-slate-500">
                Make a payment to see info
              </div>
            )}

            {paymentEntries.length > 0 && (
              <>
                <div className="hidden overflow-x-auto rounded-md border md:block">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50">
                      <tr className="border-b">
                        <th className="px-3 py-2 text-left">Date</th>
                        <th className="px-3 py-2 text-left">Method</th>
                        <th className="px-3 py-2 text-left">Amount</th>
                        <th className="px-3 py-2 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentEntries.reverse().map((payment, index) => {
                        const refundedAmount = payment.Refund.reduce(
                          (sum, refund) => sum + Number(refund.amount || 0),
                          0,
                        );

                        return (
                          <tr
                            key={payment.id}
                            className={
                              index % 2 === 0 ? "bg-white" : "bg-slate-50"
                            }
                          >
                            <td className="px-3 py-2">
                              {moment(payment.date || payment.createdAt).format(
                                "MM.DD.YYYY",
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {getPaymentMethodText(payment)}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-col">
                                <span>
                                  {formatCurrency(Number(payment.amount || 0))}
                                </span>
                                {refundedAmount > 0 && (
                                  <span className="text-[11px] text-red-600">
                                    Refunded: {formatCurrency(refundedAmount)}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              {invoice.column?.title || "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="grid gap-2 md:hidden">
                  {paymentEntries.map((payment, index) => {
                    const refundedAmount = payment.Refund.reduce(
                      (sum, refund) => sum + Number(refund.amount || 0),
                      0,
                    );

                    return (
                      <div
                        key={payment.id}
                        className={`rounded-md border p-3 text-xs ${
                          index % 2 === 0 ? "bg-white" : "bg-slate-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-slate-700">
                            {getPaymentMethodText(payment)}
                          </p>
                          <p className="font-semibold text-primary">
                            {formatCurrency(Number(payment.amount || 0))}
                          </p>
                        </div>
                        {refundedAmount > 0 && (
                          <p className="mt-1 text-[11px] text-red-600">
                            Refunded: {formatCurrency(refundedAmount)}
                          </p>
                        )}
                        <div className="mt-2 space-y-1 text-slate-600">
                          <p>
                            <span className="font-semibold">Date:</span>{" "}
                            {moment(payment.date || payment.createdAt).format(
                              "MM.DD.YYYY",
                            )}
                          </p>
                          <p>
                            <span className="font-semibold">
                              Cash Received:
                            </span>{" "}
                            {payment.cash?.receivedCash || "N/A"}
                          </p>
                          <p>
                            <span className="font-semibold">Due After:</span>{" "}
                            {payment.dueAfterPayment !== null &&
                            payment.dueAfterPayment !== undefined
                              ? formatCurrency(Number(payment.dueAfterPayment))
                              : "N/A"}
                          </p>
                          <p>
                            <span className="font-semibold">Status:</span>{" "}
                            {invoice.column?.title || "-"}
                          </p>
                          {payment.notes && (
                            <p>
                              <span className="font-semibold">Notes:</span>{" "}
                              {payment.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Terms, Policies */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <section>
              <h2 className="font-bold">Terms & Conditions:</h2>
              <p>{invoice.terms || company?.terms}</p>
            </section>
            <section>
              <h2 className="font-bold">Policy & Conditions:</h2>
              <p>{invoice.policy || company?.policy}</p>
            </section>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="font-bold text-slate-600">{invoice.company.name}</p>
              {invoice?.user && (
                <p className="font-medium">
                  {invoice?.user?.firstName} {invoice?.user?.lastName}
                </p>
              )}
            </div>
            <div className="mt-4 space-y-2 md:mt-0">
              {showAuthorizedName && (
                <div className="flex items-center gap-x-4">
                  <div className="relative">
                    <input
                      className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                      placeholder="Your Name"
                      value={authorizedNameInput}
                      onChange={(e) => setAuthorizedNameInput(e.target.value)}
                    />
                    <button
                      className="absolute -right-[10px] -top-4 bg-red-700 rounded-full print:hidden"
                      onClick={() => {
                        setShowAuthorizedName(false);
                        setShowSignaturePad(false);
                      }}
                    >
                      <X size={20} className="text-white p-1" />
                    </button>
                  </div>
                  <button
                    // onClick={async () => {
                    //   const res = await authorizeInvoice(
                    //     invoice.id,
                    //     authorizedNameInput,
                    //     invoice.type
                    //   );
                    //   if (res?.type === "success") {
                    //     successToast("Invoice Authorized");
                    //     await authorizedLeadsConvertion(invoice.id);
                    //     setAuthorizedName(authorizedNameInput);

                    //     // Update the invoice object in state to reflect the change
                    //     setInvoice((prev) => {
                    //       if (!prev) return prev;
                    //       return {
                    //         ...prev,
                    //         authorizedName: authorizedNameInput,
                    //       };
                    //     });
                    //   }
                    //   setShowAuthorizedName(false);
                    // }}
                    className="text-md rounded bg-green-500 px-1.5 pb-1 text-center text-white print:hidden"
                  >
                    Authorize
                  </button>
                </div>
              )}
              {authorizedName && (
                <div className="flex flex-col items-center gap-y-2">
                  <span className="font-semibold italic">{authorizedName}</span>

                  <hr className="border-slate-500 bg-slate-500" />
                  <div className="flex items-center gap-x-4">
                    <span className="rounded-sm border border-primary px-4 py-1 text-sm text-primary">
                      Authorized
                    </span>
                    {/* <button
                      className="text-lg text-primary print:hidden"
                      onClick={async () => {
                        setShowAuthorizedName(true);
                      }}
                    >
                      <MdEdit />
                    </button>
                    <button
                      className="text-lg text-red-500 print:hidden"
                      onClick={async () => {
                        const res = await deleteInvoiceAuthorize(invoice.id);
                        if (res?.type === "success") {
                          successToast("Deleted Invoice Authorize");

                          // Update the invoice object in state to reflect the change
                          setInvoice((prev) => {
                            if (!prev) return prev;
                            return {
                              ...prev,
                              authorizedName: "",
                            };
                          });

                          setAuthorizedName("");
                          setAuthorizedNameInput("");
                        }
                      }}
                    >
                      <MdOutlineDelete />
                    </button> */}
                  </div>
                </div>
              )}
              {!showAuthorizedName &&
                !sigImageURL &&
                !invoice?.signatureImage && (
                  <button
                    onClick={() => {
                      // setShowAuthorizedName(true);
                      setShowSignaturePad(true);
                    }}
                    className="rounded-xl pt-1 bg-gradient-to-r from-70% from-primary to-[#5a66ee] px-8 pb-2 text-white print:hidden"
                  >
                    {invoice?.wasAuthorized ? "Re-Authorize" : "Authorize"}
                  </button>
                )}
            </div>
          </div>

          <div className="flex justify-end items-center mt-6">
            {showSignaturePad && !sigImageURL && !invoice?.signatureImage && (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
                <div className="w-full flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Sign Below
                  </span>
                  <button
                    onClick={() => {
                      setShowSignaturePad(false);
                    }}
                    className="text-xs font-medium text-slate-400 hover:text-red-500 transition-colors"
                  >
                    Cancel
                  </button>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-inner dark:border-slate-700 dark:bg-slate-950">
                  <SignatureCanvas
                    ref={sigCanvas}
                    penColor="black"
                    backgroundColor="transparent"
                    canvasProps={{
                      width: 320,
                      height: 160,
                    }}
                  />
                </div>

                <div className="flex w-full items-center justify-between gap-3">
                  <button
                    onClick={() => {
                      sigCanvas.current.clear();
                      // setShowSignaturePad(false);
                      setSigImageURL(null);
                    }}
                    className="flex-1 rounded-xl border border-slate-200 bg-white py-2 text-sm font-semibold text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    Clear
                  </button>

                  <button
                    onClick={() => {
                      if (!sigCanvas.current || sigCanvas.current.isEmpty()) {
                        errorToast(
                          "Please provide your signature before saving.",
                        );
                        return;
                      }
                      const dataURL = sigCanvas.current
                        .getCanvas()
                        .toDataURL("image/png");
                      setSigImageURL(dataURL);
                      handleSaveSignature(invoice.id);
                      setShowAuthorizedName(false);
                      setShowSignaturePad(false);
                    }}
                    className="flex-[2] rounded-xl bg-gradient-to-r from-primary to-[#5a66ee] py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 transition-all hover:shadow-lg hover:shadow-indigo-500/30 active:scale-95"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}
            {sigImageURL && (
              <div className="mt-2 text-center flex flex-col items-end gap-2">
                <Image
                  src={sigImageURL}
                  width={200}
                  height={50}
                  alt="signature"
                  className="border border-gray-300 rounded-md"
                />
                <span className="rounded-sm border border-primary px-4 py-1 text-sm text-primary">
                  Authorized
                </span>
              </div>
            )}
            {invoice?.signatureImage && (
              <div className="mt-2 text-center flex flex-col items-end gap-2">
                <Image
                  src={invoice?.signatureImage}
                  width={200}
                  height={50}
                  alt="signature"
                  className="border border-gray-300 rounded-md"
                />
                <span className="rounded-sm border border-primary px-4 py-1 text-sm text-primary">
                  Authorized
                </span>
              </div>
            )}
          </div>
          {!isPrinting && (
            <div className="text-right">
              {gatewayInfo?.success &&
                (gatewayInfo?.hasStripe || gatewayInfo?.hasAuthorizeNet) &&
                parseFloat(Number(invoice?.due ?? 0).toFixed(2)) > 0 && (
                  <PayNow
                    invoiceId={invoice.id}
                    companyId={invoice.companyId}
                    due={parseFloat(
                      Number(invoice?.due ?? 0).toFixed(2),
                    ).toString()}
                    open={isStripeDialogOpen}
                    setOpen={setIsStripeDialogOpen}
                    gatewayInfo={{
                      paymentGateway: (gatewayInfo.paymentGateway ||
                        "STRIPE") as "STRIPE" | "AUTHORIZE_NET" | "BOTH",
                      hasStripe: gatewayInfo.hasStripe,
                      hasAuthorizeNet: gatewayInfo.hasAuthorizeNet,
                      tipEnabled: gatewayInfo.tipEnabled ?? false,
                    }}
                  />
                )}
            </div>
          )}
          <p className="font-semibold">Powered by Autoworx</p>
        </div>

        <div className="flex w-full flex-col gap-1 space-y-1 md:flex md:h-[95vh] md:w-[394px] md:shrink md:grow-0 md:gap-4 md:space-y-0 md:overflow-y-auto print:hidden">
          <div className="#shadow-lg hidden h-[calc(100%-50px)] flex-1 overflow-y-auto rounded-md border bg-background p-3 md:p-6 md:block">
            {/* Desktop tabs are here */}
            <div className="hidden w-fit mx-auto md:mb-4 md:flex md:justify-center md:gap-2 border border-gray-200 rounded-2xl p-1 bg-white/70 dark:bg-slate-900/60">
              {[
                { key: "attachments", label: "Attachments" },
                { key: "inspections", label: "Inspections" },
              ].map((tab) => {
                const isActive = desktopActiveTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() =>
                      setDesktopActiveTab(tab.key as typeof desktopActiveTab)
                    }
                    data-active={isActive}
                    className={`group relative flex items-center gap-2 rounded-xl px-6 py-2 font-medium transition-all duration-300 ease-out shadow-sm ring-1 ring-transparent ${
                      isActive
                        ? "text-white shadow-indigo-500/30 ring-black/5 translate-y-[-1px]"
                        : "text-slate-500 dark:text-slate-300 bg-white/70 dark:bg-slate-900/60 hover:text-slate-700 dark:hover:text-white"
                    }`}
                  >
                    {isActive && (
                      <span className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-r from-primary from-70% to-[#5a66ee]" />
                    )}
                    <span className="whitespace-nowrap">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Attachments Tab Content - Desktop */}
            {desktopActiveTab === "attachments" && (
              <>
                <h2 className="col-span-full mb-3 text-xl font-bold uppercase text-slate-500 md:text-3xl">
                  Attachments
                </h2>
                <div className="flex grid-cols-1 gap-4 overflow-x-auto md:grid">
                  {invoice.photos.map((x, index) => {
                    const allImageUrls = invoice.photos.map(
                      (photo) => photo.photo,
                    );
                    const urlsParam = encodeURIComponent(
                      JSON.stringify(allImageUrls),
                    );
                    return (
                      <Link
                        href={
                          isPublic
                            ? `/public-invoice/${invoiceId}/photo?urls=${urlsParam}&index=${index}`
                            : `/dashboard/estimate/photo?urls=${urlsParam}&index=${index}`
                        }
                        key={x.id}
                        className="relative aspect-square size-36 md:h-full md:w-full"
                      >
                        <Image
                          src={x.photo}
                          alt="attachment"
                          fill
                          className="cursor-pointer object-cover object-center"
                        />
                      </Link>
                    );
                  })}
                  {invoice.photos.length === 0 && (
                    <div className="w-full rounded-md border border-dashed border-gray-300 p-6 text-center text-gray-500">
                      No attachments available
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Inspections Tab Content - Desktop */}
            {desktopActiveTab === "inspections" && (
              <>
                <h2 className="col-span-full mb-3 text-xl font-bold uppercase text-slate-600 md:text-3xl">
                  Inspections
                </h2>
                <InspectionItems
                  invoiceId={invoice.id}
                  damageNotes={invoice.damageNotes ?? ""}
                />
              </>
            )}
          </div>

          {!isPublic && (
            <>
              {invoice?.type === InvoiceType.Invoice &&
                (currentUser?.employeeType === "Admin" ||
                  currentUser?.employeeType === "Manager") && (
                  <WorkOrderModal
                    invoiceId={invoice.id}
                    onWorkOrderCreated={async () => {
                      const updatedInvoice = await getIsWorkorderCreated(
                        invoice.id,
                      );
                      setInvoice((prevInvoice) => {
                        if (!prevInvoice) return prevInvoice;
                        return {
                          ...prevInvoice,
                          isWorkOrder: updatedInvoice?.isWorkOrder ?? null,
                        };
                      });
                    }}
                    buttonChild={
                      <button className="w-full rounded bg-primary px-4 py-2 text-white">
                        {invoice?.isWorkOrder
                          ? "View Work Order"
                          : "Create Work Order"}
                      </button>
                    }
                  />
                )}
              {/* <button
                onClick={handleEmail}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-background py-2 text-primary"
              >
                Share Invoice
                <svg
                  viewBox="0 0 24 24"
                  height="16"
                  width="16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                  <g
                    id="SVGRepo_tracerCarrier"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  ></g>
                  <g id="SVGRepo_iconCarrier">
                    {" "}
                    <path
                      fill-rule="evenodd"
                      clip-rule="evenodd"
                      d="M19.6495 0.799565C18.4834 -0.72981 16.0093 0.081426 16.0093 1.99313V3.91272C12.2371 3.86807 9.65665 5.16473 7.9378 6.97554C6.10034 8.9113 5.34458 11.3314 5.02788 12.9862C4.86954 13.8135 5.41223 14.4138 5.98257 14.6211C6.52743 14.8191 7.25549 14.7343 7.74136 14.1789C9.12036 12.6027 11.7995 10.4028 16.0093 10.5464V13.0069C16.0093 14.9186 18.4834 15.7298 19.6495 14.2004L23.3933 9.29034C24.2022 8.2294 24.2022 6.7706 23.3933 5.70966L19.6495 0.799565ZM7.48201 11.6095C9.28721 10.0341 11.8785 8.55568 16.0093 8.55568H17.0207C17.5792 8.55568 18.0319 9.00103 18.0319 9.55037L18.0317 13.0069L21.7754 8.09678C22.0451 7.74313 22.0451 7.25687 21.7754 6.90322L18.0317 1.99313V4.90738C18.0317 5.4567 17.579 5.90201 17.0205 5.90201H16.0093C11.4593 5.90201 9.41596 8.33314 9.41596 8.33314C8.47524 9.32418 7.86984 10.502 7.48201 11.6095Z"
                      fill="#6571ff"
                    ></path>{" "}
                    <path
                      d="M7 1.00391H4C2.34315 1.00391 1 2.34705 1 4.00391V20.0039C1 21.6608 2.34315 23.0039 4 23.0039H20C21.6569 23.0039 23 21.6608 23 20.0039V17.0039C23 16.4516 22.5523 16.0039 22 16.0039C21.4477 16.0039 21 16.4516 21 17.0039V20.0039C21 20.5562 20.5523 21.0039 20 21.0039H4C3.44772 21.0039 3 20.5562 3 20.0039V4.00391C3 3.45162 3.44772 3.00391 4 3.00391H7C7.55228 3.00391 8 2.55619 8 2.00391C8 1.45162 7.55228 1.00391 7 1.00391Z"
                      fill="#6571ff"
                    ></path>{" "}
                  </g>
                </svg>
              </button> */}
            </>
          )}
        </div>
      </DialogContentBlank>
    </DialogPortal>
  );
}
