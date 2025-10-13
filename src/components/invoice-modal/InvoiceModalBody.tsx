"use client";
import { authorizeInvoice } from "@/actions/estimate/invoice/authorize";
import { authorizedLeadsConvertion } from "@/actions/estimate/invoice/authorizedLeadsConvertion";
import { getInvoiceModalData } from "@/actions/estimate/invoice/getInvoiceModalData";
import { getIsWorkorderCreated } from "@/actions/estimate/invoice/getworkorderCreated";
import { sendInvoiceEmail } from "@/actions/estimate/invoice/sendInvoiceEmail";
import { sendInvoiceSms } from "@/actions/estimate/invoice/sendInvoiceSms";
import { getOrCreateShortLinkAction } from "@/actions/shortener/getOrCreateShortLink";
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
import { Popconfirm, Spin, Tooltip } from "antd";
import moment from "moment";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FaCopy, FaPrint, FaRegEdit } from "react-icons/fa";
import { FaCommentSms, FaRegShareFromSquare } from "react-icons/fa6";
import { HiXMark } from "react-icons/hi2";
import { IoCloseCircleSharp } from "react-icons/io5";
import { MdOutlineMail } from "react-icons/md";
import { PiWechatLogoLight } from "react-icons/pi";
import { useReactToPrint } from "react-to-print";
import WorkOrderModal from "../workorder-modal/WorkOrderModal";
import { InspectionItems } from "./InspectionItems";
import { InvoiceItems } from "./InvoiceItems";
import { StripePay } from "./StripePay";
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
  const [showAuthorizedName, setShowAuthorizedName] = useState(false);
  const [authorizedName, setAuthorizedName] = useState("");
  const [authorizedNameInput, setAuthorizedNameInput] = useState("");
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
      return new Promise(resolve => {
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

  if (isLoading) {
    return (
      <DialogPortal>
        {/* <DialogOverlay /> */}
        <DialogContentBlank className="fixed left-[50%] top-[50%] z-50 flex h-full w-full translate-x-[-50%] translate-y-[-50%] flex-col justify-center gap-1 overflow-y-auto py-4 duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] md:max-h-full md:max-w-[98%] md:flex-row md:gap-4">
          <div className="flex h-full w-full items-center justify-center">
            <div className="text-center">
              <Spin percent="auto" size="large" />
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
    try {
      const clientName =
        invoice?.client?.firstName || invoice?.client?.lastName || "";

      const shortLinkResult = await getOrCreateShortLinkAction({
        invoiceId: invoiceId!,
        clientName,
      });

      if (shortLinkResult.success && shortLinkResult.shortUrl) {
        await navigator.clipboard.writeText(shortLinkResult.shortUrl);
        successToast("Short link copied to clipboard");
      } else {
        // Fallback to original URL if short link creation fails
        const fallbackUrl =
          shortLinkResult.originalUrl ||
          `${process.env.NEXT_PUBLIC_APP_URL}/public-invoice/${invoiceId}`;
        await navigator.clipboard.writeText(fallbackUrl);
        console.log("⚠️ Copy Link - Using original URL:", {
          error: shortLinkResult.error,
          originalUrl: fallbackUrl,
          invoiceId: invoiceId,
        });
        successToast("Link copied to clipboard");
      }
    } catch (error) {
      console.error("Error copying link:", error);
      // Fallback to original URL
      const fallbackLink = `${process.env.NEXT_PUBLIC_APP_URL}/public-invoice/${invoiceId}`;
      await navigator.clipboard.writeText(fallbackLink);
      successToast("Link copied to clipboard");
    }
  };
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogContentBlank className="fixed left-[50%] top-[50%] z-50 flex h-full w-full translate-x-[-50%] translate-y-[-50%] flex-col justify-center gap-1 overflow-y-auto py-4 duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] md:max-h-full md:max-w-[98%] md:flex-row md:gap-4">
        <div
          ref={printComponentRef}
          className="#shadow-lg no-visible-scrollbar relative grid h-full w-full shrink grow-0 flex-col items-center justify-center gap-4 overflow-y-auto rounded-md border bg-background p-6 md:h-[90vh] md:w-[740px] md:flex-row"
        >
          {/* Action Buttons */}
          {!isPublic && (
            <div className="mt-2 flex w-full flex-wrap items-center justify-center print:hidden">
              <div className="grid w-full grid-cols-2 flex-wrap items-center justify-center gap-2 md:flex md:gap-3">
                <Link
                  className="flex items-center justify-center gap-1 rounded bg-[#6571FF] px-2 py-1 text-sm text-white md:px-4 md:text-base"
                  href={`/dashboard/estimate/edit/${invoice.id}?clientId=${invoice.clientId}`}
                >
                  <FaRegEdit className="h-3 w-3 md:h-4 md:w-4" />
                  <span className="hidden md:inline">Edit</span>
                </Link>
                <Link
                  href={`/dashboard/communication/client/${invoice.clientId}?chat=true`}
                  className="flex items-center justify-center gap-1 rounded bg-[#6571FF] px-2 py-1 text-sm text-white md:px-4 md:text-base"
                >
                  <PiWechatLogoLight className="text-sm text-white md:text-xl" />
                  <span className="invisible absolute bottom-full left-14 mb-1 w-max -translate-x-1/2 transform whitespace-nowrap rounded-md border-2 border-white bg-[#66738C] px-2 py-1 text-xs text-white shadow-lg transition-opacity group-hover:visible">
                    Communications
                  </span>
                </Link>
                <button
                  className="flex items-center justify-center gap-1 rounded bg-[#6571FF] px-2 py-1 text-sm text-white md:px-4 md:text-base"
                  onClick={handlePrint}
                >
                  <FaPrint className="h-3 w-3 md:h-4 md:w-4" />
                  <span className="hidden md:inline">Print</span>
                </button>

                <button className="flex items-center justify-center gap-1 rounded bg-[#6571FF] px-2 py-0.5 text-xs text-white md:px-4 md:py-1 md:text-base">
                  {client && (
                    <DownloadPDF
                      id={invoice.id}
                      invoice={invoice}
                      client={client}
                      vehicle={vehicle}
                      companyDetails={company}
                      authorizedName={authorizedName}
                      isStripe={
                        (stripeAccountData?.success &&
                          stripeAccountData?.enabled &&
                          parseFloat(Number(invoice?.due ?? 0).toFixed(2)) >
                            0) ??
                        false
                      }
                    />
                  )}
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
                  {twilioCredentials && (
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
                <button
                  className="flex items-center justify-center gap-1 rounded bg-[#6571FF] px-2 py-1 text-sm text-white md:px-4 md:text-base"
                  onClick={handleCopyLink}
                >
                  <FaCopy className="h-3 w-3 md:h-4 md:w-4" />
                  <span className="hidden md:inline">Copy Link</span>
                </button>
              </div>
            </div>
          )}

          {/* Company Info */}
          <div className="flex w-full flex-row justify-between gap-4 md:flex-row md:items-center md:gap-0">
            <div
              className={cn(
                "flex aspect-square items-center justify-center text-center font-bold text-white",
                company?.image ? "w-32 md:w-44" : "w-32 bg-gray-500"
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
            <div className="text-right text-xs">
              <h2 className="font-bold">Contact Information:</h2>
              <p>{company?.name}</p>
              <p>
                {company?.address && `${company.address}`}
                {company?.address && company?.city && ", "}
                {company?.city && `${company.city}`}
                {company?.city && company?.state && ", "}
                {company?.state && `${company.state}`}
                {company?.state && company?.zip && ", "}
                {company?.zip && `${company.zip}`}
              </p>
              <p className="mt-1">{company?.phone}</p>
              <p className="mt-1 break-words">{company?.email}</p>
            </div>
          </div>

          <DialogClose
            className={`absolute right-4 top-1 rounded-sm font-bold opacity-90 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground md:right-2 md:top-3 print:hidden ${isPublic ? "hidden" : ""}`}
          >
            <HiXMark className="h-6 w-6 font-bold text-slate-500" />
            <span className="sr-only">Close</span>
          </DialogClose>

          <hr />

          {/* Information Section */}
          <div className="flex w-full flex-col space-y-4 md:flex-row md:space-x-2 md:space-y-0">
            <div className="grid w-full grow grid-cols-2 gap-2 text-xs md:grid-cols-3">
              {/* Tabs */}
              <div className="col-span-full flex justify-center gap-2 md:hidden">
                <button
                  className={`rounded px-3 py-1 text-sm font-medium ${activeTab === "estimate" ? "bg-[#6571FF] text-white" : "bg-gray-200"}`}
                  onClick={() => setActiveTab("estimate")}
                >
                  Estimate
                </button>
                <button
                  className={`rounded px-3 py-1 text-sm font-medium ${activeTab === "attachments" ? "bg-[#6571FF] text-white" : "bg-gray-200"}`}
                  onClick={() => setActiveTab("attachments")}
                >
                  Attachments
                </button>
                <button
                  className={`rounded px-3 py-1 text-sm font-medium ${activeTab === "inspections" ? "bg-[#6571FF] text-white" : "bg-gray-200"}`}
                  onClick={() => setActiveTab("inspections")}
                >
                  Inspections
                </button>
              </div>

              {/* Estimate Tab Content */}
              {(activeTab === "estimate" ||
                !window.matchMedia("(max-width: 768px)").matches) && (
                <>
                  <h1 className="col-span-full text-center text-xl font-bold uppercase text-slate-500 md:text-left md:text-3xl">
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
                      <span className="inline-flex cursor-pointer items-center rounded bg-[#6571FF] px-2 py-0.5 text-xs text-white">
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
                        {invoice.photos.map(x => {
                          return (
                            <Link
                              href={
                                isPublic
                                  ? `/public-invoice/${invoiceId}/photo?url=${x.photo}`
                                  : `/dashboard/estimate/photo?url=${x.photo}`
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
                      <div className="shrink-0 basis-20 rounded bg-[#6571FF] px-2 text-white">
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
              <p className="font-bold text-slate-500">{invoice.company.name}</p>
              <p>
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
                      onChange={e => setAuthorizedNameInput(e.target.value)}
                    />
                    <button
                      className="absolute -right-[10px] -top-4 text-red-700 print:hidden"
                      onClick={() => setShowAuthorizedName(false)}
                    >
                      <IoCloseCircleSharp size={24} />
                    </button>
                  </div>
                  <button
                    onClick={async () => {
                      const res = await authorizeInvoice(
                        invoice.id,
                        authorizedNameInput,
                        invoice.type
                      );
                      if (res?.type === "success") {
                        successToast("Invoice Authorized");
                        await authorizedLeadsConvertion(invoice.id);
                        setAuthorizedName(authorizedNameInput);

                        // Update the invoice object in state to reflect the change
                        setInvoice(prev => {
                          if (!prev) return prev;
                          return {
                            ...prev,
                            authorizedName: authorizedNameInput,
                          };
                        });
                      }
                      setShowAuthorizedName(false);
                    }}
                    className="text-md rounded bg-green-500 px-1.5 pb-1 text-center text-white print:hidden"
                  >
                    Authorize
                  </button>
                </div>
              )}
              {authorizedName && !showAuthorizedName && (
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
              {!showAuthorizedName && !authorizedName && (
                <button
                  onClick={() => {
                    setShowAuthorizedName(true);
                  }}
                  className="rounded bg-[#6571FF] px-8 pb-1 text-white print:hidden"
                >
                  Authorize
                </button>
              )}
            </div>
          </div>
          {!isPrinting && (
            <div className="text-right">
              {stripeAccountData?.success &&
                stripeAccountData?.enabled &&
                parseFloat(Number(invoice?.due ?? 0).toFixed(2)) > 0 && (
                  <StripePay
                    invoiceId={invoice.id}
                    companyId={invoice.companyId}
                    due={parseFloat(
                      Number(invoice?.due ?? 0).toFixed(2)
                    ).toString()}
                    open={isStripeDialogOpen}
                    setOpen={setIsStripeDialogOpen}
                  />
                )}
            </div>
          )}
          <p className="font-semibold">Powered by Autoworx.</p>
        </div>

        <div className="flex w-full flex-col gap-1 space-y-1 md:flex md:h-[90vh] md:w-[394px] md:shrink md:grow-0 md:gap-4 md:space-y-0 md:overflow-y-auto print:hidden">
          <div className="#shadow-lg hidden h-[calc(100%-50px)] flex-1 overflow-y-auto rounded-md border bg-background p-3 md:p-6 lg:block">
            {/* Desktop tabs are here */}
            <div className="hidden lg:mb-4 lg:flex lg:justify-center lg:gap-4">
              <button
                className={`rounded px-4 py-1 text-sm font-medium ${
                  desktopActiveTab === "attachments"
                    ? "bg-[#6571FF] text-white"
                    : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                }`}
                onClick={() => setDesktopActiveTab("attachments")}
              >
                Attachments
              </button>
              <button
                className={`rounded px-4 py-1 text-sm font-medium ${
                  desktopActiveTab === "inspections"
                    ? "bg-[#6571FF] text-white"
                    : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                }`}
                onClick={() => setDesktopActiveTab("inspections")}
              >
                Inspections
              </button>
            </div>

            {/* Attachments Tab Content - Desktop */}
            {desktopActiveTab === "attachments" && (
              <>
                <h2 className="col-span-full mb-3 text-xl font-bold uppercase text-slate-500 md:text-3xl">
                  Attachments
                </h2>
                <div className="flex grid-cols-1 gap-4 overflow-x-auto md:grid">
                  {invoice.photos.map(x => {
                    return (
                      <Link
                        href={
                          isPublic
                            ? `/public-invoice/${invoiceId}/photo?url=${x.photo}`
                            : `/dashboard/estimate/photo?url=${x.photo}`
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
                <h2 className="col-span-full mb-3 text-xl font-bold uppercase text-slate-500 md:text-3xl">
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
                      setInvoice(prevInvoice => {
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
                <FaRegShareFromSquare />
              </button>
            </>
          )}
        </div>
      </DialogContentBlank>
    </DialogPortal>
  );
}
