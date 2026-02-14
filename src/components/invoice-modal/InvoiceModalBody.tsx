"use client";
import { authorizeInvoice } from "@/actions/estimate/invoice/authorize";
import { authorizedLeadsConvertion } from "@/actions/estimate/invoice/authorizedLeadsConvertion";
import { getInvoiceModalData } from "@/actions/estimate/invoice/getInvoiceModalData";
import { getIsWorkorderCreated } from "@/actions/estimate/invoice/getworkorderCreated";
import { sendInvoiceEmail } from "@/actions/estimate/invoice/sendInvoiceEmail";
import { sendInvoiceSms } from "@/actions/estimate/invoice/sendInvoiceSms";
import { getOrCreateShortLinkAction } from "@/actions/shortener/getOrCreateShortLink";
import { getPaymentGatewayInfo } from "@/app/(dashboard)/dashboard/settings/payments/getPaymentGatewayInfo";
import { getStripeAccount } from "@/app/(dashboard)/dashboard/settings/payments/stripe";
import {
  DialogClose,
  DialogContentBlank,
  DialogOverlay,
  DialogPortal,
} from "@/components/Dialog";
import { useServerGet } from "@/hooks/useServerGet";
import { cn } from "@/lib/cn";
import { queryKeys } from "@/lib/queryKeys";
import { errorToast, successToast } from "@/lib/toast";
import { calculateDue } from "@/utils/calculateDue";
import { formatCurrency } from "@/utils/formatCurrency";
import { getFileFromCanvas } from "@/utils/getFileFromCanvas";
import { useGetCurrentUser } from "@/utils/useGetCurrentUser";
import {
  Client,
  Column,
  Company,
  InfobipConfig,
  Invoice,
  InvoiceItem,
  InvoicePhoto,
  InvoiceType,
  Labor,
  Material,
  Refund,
  Service,
  TwilioCredentials,
  User,
  Vehicle,
} from "@prisma/client";
import { useQuery } from "@tanstack/react-query";
import { Popconfirm, Tooltip } from "antd";
import { Eye, Mail, MessageCircleMore, SquarePen, X } from "lucide-react";
import moment from "moment";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { useReactToPrint } from "react-to-print";
import CarLoading from "../common/CarLoading";
import WorkOrderModal from "../workorder-modal/WorkOrderModal";
import { InspectionItems } from "./InspectionItems";
import { InvoiceItems } from "./InvoiceItems";
import { PayNow } from "./PayNow";

const DownloadPDF = dynamic(() => import("./DownloadInvoice"), {
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
};

export default function InvoiceModalBody({
  invoiceId,
  isPublic = false,
}: {
  invoiceId?: string;
  isPublic?: boolean;
}) {
  const searchParams = useSearchParams();

  const [invoice, setInvoice] = useState<InvoiceData>();
  const { data, isLoading, isError, error, isFetched } = useQuery({
    queryKey: queryKeys.getInvoiceModalDataKey(invoiceId!),
    queryFn: () => getInvoiceModalData(invoiceId!),
    enabled: !!invoiceId,
  });

  // console.log({ isError, error, data });

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
          0
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
  console.log("🚀 ~ InvoiceModalBody ~ gatewayInfo:", gatewayInfo);

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
    // 1. Identify what you want to copy
    const clientName = invoice?.client?.firstName || invoice?.client?.lastName || "";

    const shortLinkResult = await getOrCreateShortLinkAction({
      invoiceId: invoiceId!,
      clientName,
    });

    const urlToCopy = shortLinkResult.success && shortLinkResult.shortUrl
      ? shortLinkResult.shortUrl
      : (shortLinkResult.originalUrl || `${process.env.NEXT_PUBLIC_APP_URL}/public-invoice/${invoiceId}`);

    try {
      // 2. Check if the Clipboard API is available AND the context is secure
      if (typeof window !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(urlToCopy);
        successToast("Link copied to clipboard");
      } else {
        // 3. Fallback for insecure connections (like your IP address testing)
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
        `signature-${invoiceId}.png`
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
        invoice.type
      );

      if (response?.type === "success") {
        successToast("Invoice Authorized");
        await authorizedLeadsConvertion(invoice.id);
      } else {
        errorToast("Signature upload failed");
        console.error("Signature upload failed:");
      }
    } catch (err) {
      errorToast("Signature upload failed");
      console.error("Signature upload failed:", err);
    }
  };

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
          className="#shadow-lg no-visible-scrollbar relative grid h-full w-full shrink grow-0 flex-col items-center justify-center gap-4 overflow-y-auto rounded-md border bg-background p-6 md:h-[90vh] md:w-[740px] md:flex-row"
        >
          {/* Action Buttons */}
          {!isPublic && (
            <div className="mt-6 flex w-full flex-wrap items-center justify-center print:hidden">
              <div className="flex w-full flex-wrap items-center justify-center gap-3 md:gap-4">

                {/* Edit Link */}
                <Link
                  className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#6571FF] from-70% to-[#5a66ee] px-5 py-1.5 text-sm font-medium text-white shadow-md shadow-indigo-200 transition-all hover:scale-[1.02] hover:shadow-lg active:scale-95 md:text-base"
                  href={`/dashboard/estimate/edit/${invoice.id}?clientId=${invoice.clientId}`}
                >
                  <SquarePen className="h-4 w-4" />
                  <span className="hidden md:inline">Edit</span>
                </Link>

                {/* Communications Link */}
                <Link
                  href={`/dashboard/communication/client/${invoice.clientId}?chat=true`}
                  className="group relative flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#6571FF] from-70% to-[#5a66ee] px-5 py-2 text-sm font-medium text-white shadow-md shadow-indigo-200 transition-all hover:scale-[1.02] hover:shadow-lg active:scale-95 md:text-base"
                >
                  <MessageCircleMore className="h-4 w-4 md:h-5 md:w-5" />
                  <span className="invisible absolute bottom-full left-1/2 mb-3 w-max -translate-x-1/2 transform rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-white opacity-0 shadow-xl transition-all group-hover:visible group-hover:opacity-100">
                    Communications
                  </span>
                </Link>

                {/* Print Button */}
                <button
                  className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#6571FF] from-70% to-[#5a66ee] px-5 py-1.5 text-sm font-medium text-white shadow-md shadow-indigo-200 transition-all hover:scale-[1.02] hover:shadow-lg active:scale-95 md:text-base"
                  onClick={handlePrint}
                >
                  <svg fill="#ffffff" viewBox="0 0 32 32" height="18" width="18">
                    <path d="M30 13.75h-2.75v-7.75c0-0 0-0.001 0-0.001 0-0.345-0.14-0.657-0.365-0.883l-4-4c-0.226-0.226-0.539-0.366-0.885-0.366-0 0-0 0-0 0h-17c-0.69 0-1.25 0.56-1.25 1.25v0 11.75h-1.75c-0.69 0-1.25 0.56-1.25 1.25v0 9c0 0.69 0.56 1.25 1.25 1.25s1.25-0.56 1.25-1.25v0-7.75h25.5v7.75c0 0.69 0.56 1.25 1.25 1.25s1.25-0.56 1.25-1.25v0-9c-0-0.69-0.56-1.25-1.25-1.25h-0zM6.25 3.25h15.232l3.268 3.268v7.232h-18.5zM26 20.75h-20c-0.69 0-1.25 0.56-1.25 1.25v8c0 0.69 0.56 1.25 1.25 1.25h20c0.69-0.001 1.249-0.56 1.25-1.25v-8c-0.001-0.69-0.56-1.249-1.25-1.25h-0zM24.75 28.75h-17.5v-5.5h17.5zM26.879 17.62c-0.228-0.228-0.544-0.37-0.893-0.37-0.168 0-0.329 0.033-0.475 0.093l0.008-0.003c-0.16 0.060-0.295 0.156-0.399 0.279l-0.001 0.001c-0.119 0.109-0.213 0.242-0.277 0.392l-0.003 0.007c-0.059 0.142-0.095 0.306-0.1 0.479l-0 0.002c0.002 0.346 0.147 0.657 0.378 0.878l0 0c0.226 0.223 0.537 0.361 0.88 0.361s0.654-0.138 0.88-0.361l-0 0c0.233-0.222 0.378-0.533 0.381-0.878v-0c-0.005-0.174-0.041-0.339-0.103-0.49l0.003 0.009c-0.066-0.158-0.161-0.291-0.28-0.399l-0.001-0.001z" />
                  </svg>
                  <span className="hidden md:inline">Print</span>
                </button>

                {/* Download PDF Component Wrapper */}
                <button className="flex items-center justify-center rounded-xl bg-gradient-to-r from-[#6571FF] from-70% to-[#5a66ee] px-5 py-1.5 text-sm font-medium text-white shadow-md shadow-indigo-200 transition-all hover:scale-[1.02] hover:shadow-lg active:scale-95 md:text-base">
                  {client && (
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
                          parseFloat(Number(invoice?.due ?? 0).toFixed(2)) >
                          0) ??
                        false
                      }
                    />
                  )}
                </button>

                {/* Share Section Wrapper */}
                <div className="flex items-center gap-x-2 rounded-xl border border-slate-200 bg-slate-50/50 pl-4 pr-0.5 dark:border-slate-700 dark:bg-slate-800/50">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 md:text-xs">
                    Share
                  </span>

                  <Popconfirm onConfirm={handleEmail} title="Send via Email?" okText="Yes" cancelText="No">
                    <button className="flex items-center justify-center gap-2 rounded-lg bg-[#6571FF] px-3 py-1.5 my-0.5 text-sm font-medium text-white transition-all hover:brightness-110 active:scale-95">
                      <Mail className="h-5 w-5" strokeWidth={2} />
                      <span className="hidden md:inline">Email</span>
                    </button>
                  </Popconfirm>

                  {twilioCredentials && (
                    <Popconfirm onConfirm={handleSms} title="Send via SMS?" okText="Yes" cancelText="No">
                      <button className="flex items-center justify-center gap-2 rounded-lg bg-[#6571FF] px-3 py-1.5 text-sm font-medium text-white transition-all hover:brightness-110 active:scale-95">
                        <svg fill="#ffffff" height="20" width="20" viewBox="0 0 24 24">
                          <path d="M12,1C5.37,1,0,5.58,0,10.55c0,2.92,1.86,5.95,4.72,7.59L3,23l5.85-3.32C9.86,19.88,10.91,20,12,20c6.63,0,12-4.48,12-9.45 C24,5.58,18.63,1,12,1z" />
                        </svg>
                        <span className="hidden md:inline">SMS</span>
                      </button>
                    </Popconfirm>
                  )}
                </div>

                {/* Copy Link Button */}
                <button
                  className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#6571FF] from-70% to-[#5a66ee] px-5 py-1.5 text-sm font-medium text-white shadow-md shadow-indigo-200 transition-all hover:scale-[1.02] hover:shadow-lg active:scale-95 md:text-base"
                  onClick={handleCopyLink}
                >
                  <svg viewBox="0 0 32 32" height="18" width="18" fill="currentColor">
                    <path d="m24.110782 0 5.889218 8.76607872v19.23392128h-4v4h-24v-28h4v-4zm-18.110782 6h-2v24h20v-2h-18z" />
                  </svg>
                  <span className="hidden md:inline">Copy Link</span>
                </button>

              </div>
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
              <h2 className="mb-1.5 text-sm font-black uppercase tracking-[0.2em] text-[#6571FF] dark:text-indigo-400">
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
                  <p className="max-w-[200px] break-words italic text-slate-500 dark:text-slate-500">
                    {company?.email}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogClose
            className={`absolute right-2 top-2 z-50 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100/50 text-slate-500 transition-all duration-300 hover:bg-red-50 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-200 active:scale-90 dark:bg-slate-800/50 dark:hover:bg-red-900/30 md:right-3 md:top-3 print:hidden ${isPublic ? "hidden" : ""
              }`}
          >
            <X className="h-5 w-5 stroke-[2.5px]" />
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
                      className={`group relative flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium transition-all duration-300 ease-out shadow-sm ring-1 ring-transparent ${isActive
                        ? "text-white shadow-indigo-500/30 ring-black/5 translate-y-[-1px]"
                        : "text-slate-500 dark:text-slate-300 bg-white/70 dark:bg-slate-900/60"
                        }`}
                    >
                      {isActive && (
                        <span className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-r from-[#6571FF] from-70% to-[#5a66ee]" />
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
                      {invoice?.type?.toUpperCase()}
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
                      <div className="flex flex-row flex-wrap gap-2">
                        <p>{vehicle?.year || ""}</p>
                        <p>{vehicle?.make}</p>
                        <p>{vehicle?.model}</p>
                        {vehicle?.other && <p>{vehicle?.other}</p>}
                      </div>
                      <p>{vehicle?.submodel}</p>
                      <p>{vehicle?.type}</p>
                    </div>

                    {/* Estimate Details */}
                    <div>
                      <h2 className="font-bold text-slate-500">
                        Estimate Details:
                      </h2>
                      <p>{invoice.id}</p>
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

                      {invoice.isViewed && (
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
                            (photo) => photo.photo
                          );
                          const urlsParam = encodeURIComponent(
                            JSON.stringify(allImageUrls)
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
                  ["discount", invoice.discount],
                  ["tax", invoice.tax],
                  ["shop supplies", invoice?.serviceFee],
                  ["grand total", invoice.grandTotal],
                  ["deposit", invoice.deposit],
                  ["payment", invoice.totalPayment],
                  [
                    "due",
                    calculateDue(
                      Number(invoice.grandTotal),
                      Number(invoice.totalPayment),
                      Number(invoice.deposit)
                    ),
                  ],
                  ["Refunded", refundAmount],
                ] as const
              ).map(([key, value]) => (
                <div key={key}>
                  {key === "tax" || key === "shop supplies" ? (
                    Number(value) > 0 && (
                      <div className="flex rounded border border-solid border-[#6571FF]">
                        <span className="min-w-0 flex-1 overflow-x-clip text-ellipsis whitespace-nowrap px-2 font-bold uppercase text-[#6571FF]">
                          {key}
                        </span>
                        <div className="basis-30 shrink-0 rounded bg-[#6571FF] px-2 text-white">
                          {Number(value)}%
                          {Number(value) !== 0 && (
                            <span>
                              {" "}
                              |
                              {formatCurrency(
                                (Number(
                                  (invoice.subtotal as any) -
                                  (invoice.discount as any)
                                ) *
                                  Number(value)) /
                                100
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="flex rounded border border-solid border-[#6571FF]">
                      <span className="min-w-0 flex-1 overflow-x-clip text-ellipsis whitespace-nowrap px-2 font-bold uppercase text-[#6571FF]">
                        {key}
                      </span>
                      <div className="shrink-0 basis-20 rounded bg-gradient-to-br from-[#6571FF] from-60% to-[#4A55E2] px-2 text-white">
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
              <p className="font-medium">
                {invoice.user.firstName} {invoice.user.lastName}
              </p>
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
                    <span className="rounded-sm border border-[#6571ff] px-4 py-1 text-sm text-[#6571ff]">
                      Authorized
                    </span>
                    {/* <button
                      className="text-lg text-[#6571ff] print:hidden"
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
                    className="rounded-xl pt-1 bg-gradient-to-r from-70% from-[#6571FF] to-[#5a66ee] px-8 pb-2 text-white print:hidden"
                  >
                    {invoice?.wasAuthorized ? "Re-Authorize" : "Authorize"}
                  </button>
                )}
            </div>
          </div>

          <div className="flex justify-end items-center">
            {showSignaturePad && !sigImageURL && !invoice?.signatureImage && (
              <div className="flex flex-col lg:flex-row justify-end items-end gap-4">
                <SignatureCanvas
                  ref={sigCanvas}
                  penColor="black"
                  backgroundColor="#f9fafb"
                  canvasProps={{
                    width: 300,
                    height: 100,
                    className: "border border-gray-400 rounded-md",
                  }}
                />

                <div className="flex flex-row justify-end lg:flex-col lg:items-center gap-3">
                  <button
                    onClick={() => {
                      if (!sigCanvas.current || sigCanvas.current.isEmpty()) {
                        errorToast(
                          "Please provide your signature before saving."
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
                    className="
                    rounded-xl px-6 py-2.5 text-sm font-medium text-white
                    bg-gradient-to-r from-[#6571FF] to-[#5a66ee]
                    shadow-lg shadow-indigo-500/30
                    hover:shadow-xl hover:shadow-indigo-500/40
                    hover:-translate-y-0.5 hover:scale-[1.02]
                    active:translate-y-0 active:scale-100
                    transition-all duration-200
                    "
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      sigCanvas.current.clear();
                      setShowSignaturePad(false);
                      setSigImageURL(null);
                    }}
                    className="
                    rounded-xl lg:mt-2 sm:mt-0 px-5 py-2.5 text-sm font-medium text-slate-500 
                    hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800
                    transition-colors border
                    "
                  >
                    Clear
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
                <span className="rounded-sm border border-[#6571ff] px-4 py-1 text-sm text-[#6571ff]">
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
                <span className="rounded-sm border border-[#6571ff] px-4 py-1 text-sm text-[#6571ff]">
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
                      Number(invoice?.due ?? 0).toFixed(2)
                    ).toString()}
                    open={isStripeDialogOpen}
                    setOpen={setIsStripeDialogOpen}
                    gatewayInfo={{
                      paymentGateway: gatewayInfo.paymentGateway || "STRIPE",
                      hasStripe: gatewayInfo.hasStripe,
                      hasAuthorizeNet: gatewayInfo.hasAuthorizeNet,
                    }}
                  />
                )}
            </div>
          )}
          <p className="font-semibold">Powered by Autoworx.</p>
        </div>

        <div className="flex w-full flex-col gap-1 space-y-1 md:flex md:h-[90vh] md:w-[394px] md:shrink md:grow-0 md:gap-4 md:space-y-0 md:overflow-y-auto print:hidden">
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
                    onClick={() => setDesktopActiveTab(tab.key as typeof desktopActiveTab)}
                    data-active={isActive}
                    className={`group relative flex items-center gap-2 rounded-xl px-6 py-2 font-medium transition-all duration-300 ease-out shadow-sm ring-1 ring-transparent ${isActive
                      ? "text-white shadow-indigo-500/30 ring-black/5 translate-y-[-1px]"
                      : "text-slate-500 dark:text-slate-300 bg-white/70 dark:bg-slate-900/60 hover:text-slate-700 dark:hover:text-white"
                      }`}
                  >
                    {isActive && (
                      <span className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-r from-[#6571FF] from-70% to-[#5a66ee]" />
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
                      (photo) => photo.photo
                    );
                    const urlsParam = encodeURIComponent(
                      JSON.stringify(allImageUrls)
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
                          className="cursor-pointer"
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
                        invoice.id
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
                      <button className="w-full rounded bg-[#6571FF] px-4 py-2 text-white">
                        {invoice?.isWorkOrder
                          ? "View Work Order"
                          : "Create Work Order"}
                      </button>
                    }
                  />
                )}
              <button
                onClick={handleEmail}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-background py-2 text-[#6571FF]"
              >
                Share Invoice
                <svg
                  viewBox="0 0 24 24"
                  height="16"
                  width="16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                  <g
                    id="SVGRepo_tracerCarrier"
                    stroke-linecap="round"
                    stroke-linejoin="round"
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
              </button>
            </>
          )}
        </div>
      </DialogContentBlank>
    </DialogPortal>
  );
}
