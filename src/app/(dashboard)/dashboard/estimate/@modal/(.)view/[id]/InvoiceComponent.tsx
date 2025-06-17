"use client";
import {
  authorizeInvoice,
  deleteInvoiceAuthorize,
} from "@/actions/estimate/invoice/authorize";
import { sendInvoiceEmail } from "@/actions/estimate/invoice/sendInvoiceEmail";
import { getCompany } from "@/actions/settings/getCompany";
import {
  DialogClose,
  DialogContentBlank,
  DialogOverlay,
  DialogPortal,
} from "@/components/Dialog";
import { cn } from "@/lib/cn";
import getUser from "@/lib/getUser";
import { errorToast, successToast } from "@/lib/toast";
import {
  Column,
  Company,
  Invoice,
  InvoiceItem,
  InvoicePhoto,
  InvoiceType,
  Labor,
  Material,
  Service,
  Technician,
  User,
  Vehicle,
} from "@prisma/client";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { Popconfirm } from "antd";
import moment from "moment";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FaPrint, FaRegEdit, FaRegFile, FaShare } from "react-icons/fa";
import { FaRegShareFromSquare } from "react-icons/fa6";
import { HiXMark } from "react-icons/hi2";
import { IoClose } from "react-icons/io5";
import { MdEdit, MdOutlineDelete } from "react-icons/md";
import { TiTick } from "react-icons/ti";
import { useReactToPrint } from "react-to-print";
import { InvoiceItems } from "./InvoiceItems";
import PDFComponent from "./PDFComponent";
import dynamic from "next/dynamic";
const DownloadPDF = dynamic(() => import("./DownloadInvoice"), {
  ssr: false,
});

import { authorizedLeadsConvertion } from "@/actions/estimate/invoice/authorizedLeadsConvertion";
import WorkOrderModal from "@/components/workorder-modal/WorkOrderModal";
import { formatCurrency } from "@/utils/formatCurrency";
const InvoiceComponent = ({
  id,
  clientId,
  invoice,
  vehicle,
  invoiceTechnicians,
}: {
  id: string;
  clientId: any;
  invoice: Invoice & {
    column: Column | null;
    company: Company;
    invoiceItems: (InvoiceItem & {
      materials: Material[] | [];
      service: Service | null;
      invoice: Invoice | null;
      labor: Labor | null;
    })[];
    photos: InvoicePhoto[];
    user: User;
  };
  vehicle: Vehicle | null;
  invoiceTechnicians: Technician[];
}) => {
  const router = useRouter();
  const componentRef = useRef(null);
  const [showAuthorizedName, setShowAuthorizedName] = useState(false);
  const [authorizedName, setAuthorizedName] = useState(
    invoice?.authorizedName || "",
  );
  const [userType, setUserType] = useState<User>();

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
  });

  const handleEdit = () => {
    // window.location.href = `/estimate/edit/${id}`;
    router.push(`/dashboard/estimate/edit/${id}?clientId=${clientId}`);
  };

  const [companyDetails, setCompanyDetails] = useState<Company | null>(null);

  const handleEmail = async () => {
    let res = await sendInvoiceEmail({ invoiceId: invoice.id });
    if (!res?.success) {
      errorToast(res?.message || "Error sharing invoice");
      return;
    }
    successToast("Invoice sent successfully");
    // close the dialog
    router.back();
  };

  useEffect(() => {
    const getCompanyDetails = async () => {
      const companyDetailsnow = await getCompany();

      setCompanyDetails(companyDetailsnow);
    };
    getCompanyDetails();
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      const currentUserType = await getUser();
      setUserType(currentUserType);
    };

    fetchUser();
  }, []);

  const isWorkOrderCreated = invoice?.isWorkOrder;

  return (
    <div>
      <DialogPortal>
        <DialogOverlay />
        <DialogContentBlank className="fixed left-[50%] top-[50%] z-50 flex max-h-[95vh] w-full translate-x-[-50%] translate-y-[-50%] flex-col justify-center gap-1 overflow-y-auto py-4 duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] md:max-h-full md:max-w-[98%] md:flex-row md:gap-4">
          <div
            ref={componentRef}
            className="#shadow-lg no-visible-scrollbar relative grid h-full w-full shrink grow-0 flex-col items-center justify-center gap-4 overflow-y-auto rounded-md border bg-background p-6 md:h-[90vh] md:w-[740px] md:flex-row"
          >
            {/* Action Buttons */}
            <div className="flex w-full items-center justify-center print:hidden">
              <div className="grid w-full grid-cols-2 items-center justify-center gap-2 md:flex md:gap-3">
                <button
                  className="flex items-center justify-center gap-1 rounded bg-[#6571FF] px-2 py-1 text-sm text-white md:px-4 md:text-base"
                  onClick={handleEdit}
                >
                  <FaRegEdit className="h-3 w-3 md:h-4 md:w-4" />
                  <span className="hidden md:inline">Edit</span>
                </button>

                <button
                  className="flex items-center justify-center gap-1 rounded bg-[#6571FF] px-2 py-1 text-sm text-white md:px-4 md:text-base"
                  onClick={handlePrint}
                >
                  <FaPrint className="h-3 w-3 md:h-4 md:w-4" />
                  <span className="hidden md:inline">Print</span>
                </button>

                <button className="flex items-center justify-center gap-1 rounded bg-[#6571FF] px-2 py-0.5 text-xs text-white md:px-4 md:py-1 md:text-base">
                  <DownloadPDF
                    id={id}
                    invoice={invoice}
                    clientId={clientId}
                    vehicle={vehicle}
                    companyDetails={companyDetails}
                    authorizedName={authorizedName}
                  />
                </button>

                <Popconfirm
                  title="Send invoice now?"
                  onConfirm={handleEmail}
                  okText="Yes"
                  cancelText="No"
                >
                  <button className="flex items-center justify-center gap-1 rounded bg-[#6571FF] px-2 py-1 text-sm text-white md:px-4 md:text-base">
                    <FaShare className="h-3 w-3 md:h-4 md:w-4" />
                    <span className="hidden md:inline">Share</span>
                  </button>
                </Popconfirm>
              </div>
            </div>

            {/* Company Info */}
            <div className="flex w-full flex-row justify-between gap-4 md:flex-row md:items-center md:gap-0">
              <div
                className={cn(
                  "flex aspect-square w-24 items-center justify-center text-center font-bold text-white md:w-32",
                  !companyDetails?.image && "bg-gray-500",
                )}
              >
                {companyDetails?.image ? (
                  <Image
                    src={`${companyDetails.image}`}
                    alt="company logo"
                    width={120}
                    height={120}
                    className="object-fit rounded-md border-2 border-gray-200 p-2"
                  />
                ) : (
                  "Logo"
                )}
              </div>
              <div className="text-center text-xs md:text-right">
                <h2 className="font-bold">Contact Information:</h2>
                <p>
                  {companyDetails?.address} {companyDetails?.city}{" "}
                  {companyDetails?.state} {companyDetails?.zip}
                </p>
                <p>{companyDetails?.phone}</p>
                <p>{companyDetails?.email}</p>
              </div>
            </div>

            <DialogClose className="absolute right-2 top-2 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground md:right-4 md:top-4 print:hidden">
              <HiXMark className="h-[18px] w-[18px] text-slate-500 md:h-6 md:w-6" />
              <span className="sr-only">Close</span>
            </DialogClose>

            <hr />

            {/* Information Section */}
            <div className="flex w-full flex-col space-y-4 md:flex-row md:space-x-4 md:space-y-0">
              <div className="grid w-full grow grid-cols-2 gap-4 text-xs md:grid-cols-3">
                <h1 className="col-span-full text-center text-xl font-bold uppercase text-slate-500 md:text-left md:text-3xl">
                  {invoice?.type?.toUpperCase()}
                </h1>

                {/* Client Info */}
                <div>
                  <h2 className="font-bold text-slate-500">Estimate To:</h2>
                  <p>
                    {clientId?.firstName} {clientId?.lastName}
                  </p>
                  <p>{clientId?.mobile}</p>
                  <p>{clientId?.email}</p>
                </div>

                {/* Vehicle Info */}
                <div>
                  <h2 className="font-bold text-slate-500">Vehicle Details:</h2>
                  <div className="flex flex-row gap-2">
                    <p>{vehicle?.year}</p>
                    <p>{vehicle?.make}</p>
                    <p>{vehicle?.model}</p>
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
              </div>

              {/* Price Summary */}
              <div className="w-full space-y-1 text-sm md:w-auto">
                {(
                  [
                    ["subtotal", invoice.subtotal],
                    ["discount", invoice.discount],
                    ["tax", invoice.tax],
                    ["service fee", invoice?.serviceFee],
                    ["grand total", invoice.grandTotal],
                    ["deposit", invoice.deposit],
                    ["due", invoice.due],
                  ] as const
                ).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex rounded border border-solid border-[#6571FF]"
                  >
                    <span className="min-w-0 flex-1 overflow-x-clip text-ellipsis whitespace-nowrap px-2 font-bold uppercase text-[#6571FF]">
                      {key}
                    </span>
                    <div className="shrink-0 basis-20 rounded bg-[#6571FF] px-2 text-white">
                      {key == "tax" || key == "service fee" ? (
                        <> %{Number(value)}</>
                      ) : (
                        formatCurrency(parseFloat("" + value))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <InvoiceItems
                items={JSON.parse(JSON.stringify(invoice.invoiceItems))}
              />
            </div>

            {/**
             * Terms, Policies
             */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <section>
                <h2 className="font-bold">Terms & Conditions:</h2>
                <p>{invoice.terms || companyDetails?.terms}</p>
              </section>
              <section>
                <h2 className="font-bold">Policy & Conditions:</h2>
                <p>{invoice.policy || companyDetails?.policy}</p>
              </section>
            </div>

            {/**
             * Submit
             */}
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-bold text-slate-500">
                  {invoice.company.name}
                </p>
                <p>
                  {invoice.user.firstName} {invoice.user.lastName}
                </p>
              </div>
              <div className="mt-4 space-y-2 md:mt-0">
                {showAuthorizedName && (
                  <div className="flex items-center gap-x-4">
                    <input
                      className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                      placeholder="Your Name"
                      value={authorizedName}
                      onChange={(e) => setAuthorizedName(e.target.value)}
                    />

                    <button
                      onClick={async () => {
                        const res = await authorizeInvoice(
                          invoice.id,
                          authorizedName,
                          invoice.type,
                        );
                        if (res?.type === "success") {
                          successToast("Invoice Authorized");
                          await authorizedLeadsConvertion(invoice.id);
                        }
                        setShowAuthorizedName(false);
                      }}
                      className="text-lg text-green-500 print:hidden"
                    >
                      <TiTick />
                    </button>
                    <button
                      className="text-lg text-red-500 print:hidden"
                      onClick={() => setShowAuthorizedName(false)}
                    >
                      <IoClose />
                    </button>
                  </div>
                )}
                {invoice.authorizedName && !showAuthorizedName && (
                  <div className="flex flex-col items-center gap-y-2">
                    <span className="font-semibold italic">
                      {invoice.authorizedName}
                    </span>

                    <hr className="border-slate-500 bg-slate-500" />
                    <div className="flex items-center gap-x-4">
                      <span className="rounded-sm border border-[#6571ff] px-4 py-1 text-sm text-[#6571ff]">
                        Authorized
                      </span>
                      <button
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
                          }
                          setShowAuthorizedName(false);
                        }}
                      >
                        <MdOutlineDelete />
                      </button>
                    </div>
                  </div>
                )}
                {!showAuthorizedName && !invoice.authorizedName && (
                  <button
                    onClick={() => {
                      setShowAuthorizedName(true);
                    }}
                    className="rounded bg-[#6571FF] px-8 text-white print:hidden"
                  >
                    Authorize
                  </button>
                )}
                {/* {invoice?.stripePaymentLink && (
                  <div>
                    <Link
                      href={invoice.stripePaymentLink}
                      className="mt-4 rounded-sm border border-[#6571ff] px-4 py-1 text-sm text-[#6571ff]"
                    >
                      Pay With Stripe
                    </Link>
                  </div>
                )} */}
              </div>
            </div>
            <p>Thank you for shopping with Autoworx</p>
          </div>
          {/* <PDFViewer width="100%" height="600">
            <PDFComponent
              id={id}
              invoice={invoice}
              clientId={clientId}
              vehicle={vehicle}
              companyDetails={companyDetails}
              authorizedName={authorizedName}
            />
          </PDFViewer> */}
          <div className="h-[300px] w-full shrink grow-0 flex-col gap-4 space-y-1 overflow-y-auto md:flex md:h-[90vh] md:w-[394px] md:space-y-0 print:hidden">
            <div className="#shadow-lg h-[calc(100%-50px)] flex-1 overflow-y-auto rounded-md border bg-background p-3 md:p-6">
              <h2 className="col-span-full mb-3 text-xl font-bold uppercase text-slate-500 md:text-3xl">
                Attachments
              </h2>
              <div className="flex grid-cols-1 gap-4 overflow-x-auto md:grid">
                {invoice.photos.map((x) => {
                  return (
                    <Link
                      href={`/dashboard/estimate/photo?url=${x.photo}`}
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
              </div>
            </div>
            {invoice?.type === InvoiceType.Invoice &&
              (invoice.user.employeeType === "Admin" ||
                invoice.user.employeeType === "Manager") && (
                <WorkOrderModal
                  invoiceId={invoice.id}
                  buttonChild={
                    <button className="w-full rounded bg-[#6571FF] px-4 py-2 text-white">
                      {isWorkOrderCreated
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
          </div>
        </DialogContentBlank>
      </DialogPortal>
    </div>
  );
};

export default InvoiceComponent;
