"use client";
import {
  getWorkOrderData,
  IWorkOrderData,
} from "@/actions/estimate/invoice/getWorkOrderData";
import {
  DialogContent,
  DialogOverlay,
  DialogPortal,
} from "@/components/Dialog";
import { useServerGet } from "@/hooks/useServerGet";
import { cn } from "@/lib/cn";
import moment from "moment";
import Image from "next/image";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import DueDate from "./DueDateInput";
import { InvoiceItems } from "./InvoiceItems";
import SaveWorkOrderBtn from "./SaveWorkOrderBtn";

export default function WorkOrderModalBody({
  invoiceId,
  setOpen,
  onWorkOrderCreated,
}: {
  invoiceId: string;
  setOpen: (open: boolean) => void;
  onWorkOrderCreated?: () => void;
}) {
  const [dueDate, setDueDate] = useState<string | null>("");
  const [refreshKey, setRefreshKey] = useState(0);

  const { data, error, loading } = useServerGet(
    getWorkOrderData,
    invoiceId,
    refreshKey
  );

  useEffect(() => {
    if ((data as IWorkOrderData)?.invoice?.dueDate) {
      setDueDate((data as IWorkOrderData)?.invoice?.dueDate ?? "");
    }
  }, [data]);

  useEffect(() => {
    const handleInvoiceUpdate = (event: CustomEvent) => {
      if (event.detail.invoiceId === invoiceId) {
        setRefreshKey((prev) => prev + 1);
      }
    };

    window.addEventListener(
      "invoice-updated" as any,
      handleInvoiceUpdate as any
    );

    return () => {
      window.removeEventListener(
        "invoice-updated" as any,
        handleInvoiceUpdate as any
      );
    };
  }, [invoiceId]);

  if (loading) {
    return (
      <DialogPortal>
        <DialogOverlay />
        <DialogContent className="h-full min-w-fit overflow-y-auto sm:max-w-[740px] lg:h-fit">
          <div className="flex h-full w-full items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[#6571FF] border-t-transparent"></div>
              <p>Loading work order data...</p>
            </div>
          </div>
        </DialogContent>
      </DialogPortal>
    );
  }

  if (error) {
    toast.error(error.message);
    return null;
  }

  if (!data) {
    return null;
  }

  // Now it's safe to destructure after we've confirmed data exists
  const {
    invoice,
    company,
    invoiceTechnicians,
    writePermission,
    techniciansPerItem,
  } = data as IWorkOrderData;

  // console.log("invoiceTechnicians", invoiceTechnicians);

  return (
    <DialogContent className="h-full min-w-fit overflow-y-auto sm:max-w-[740px] lg:h-fit">
      <div className="mt-4 flex items-center justify-between gap-1 lg:mt-4">
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
          <p>
            {company?.address && `${company.address}`}
            {company?.address && company?.city && ", "}
            {company?.city && `${company.city}`}
            {company?.city && company?.state && ", "}
            {company?.state && `${company.state}`}
            {company?.state && company?.zip && ", "}
            {company?.zip && `${company.zip}`}
          </p>
          <p>{company?.phone}</p>
          <p>{company?.email}</p>
          <div className="flex justify-end text-right">
            {writePermission ? (
              <DueDate dueDate={dueDate} setDueDate={setDueDate} />
            ) : (
              invoice?.dueDate && <p>Due Date: {invoice?.dueDate}</p>
            )}
          </div>
        </div>
      </div>

      <hr />

      {/**
       * Information
       */}
      <div className="flex">
        <div className="grid grow grid-cols-3 gap-2 text-xs">
          <h1 className="col-span-full text-3xl font-bold uppercase text-slate-500">
            Work Order
          </h1>
          <div className="overflow-hidden">
            <h2 className="font-bold text-slate-500">Estimate To:</h2>
            <p className="truncate">
              {invoice?.client?.firstName} {invoice?.client?.lastName}
            </p>
            <p className="truncate">{invoice?.client?.mobile}</p>
            <p className="truncate">{invoice?.client?.email}</p>
          </div>
          <div>
            <h2 className="font-bold text-slate-500">Vehicle Details:</h2>
            <p>
              {invoice?.vehicle?.year || ""} {invoice?.vehicle?.make}{" "}
              {invoice?.vehicle?.model} {invoice?.vehicle?.submodel}{" "}
              {invoice?.vehicle?.other}
              {invoice?.vehicle?.type}
            </p>
            {/* <p>{invoice?.vehicle?.year}</p>
            <p>{invoice?.vehicle?.make}</p>
            <p>{invoice?.vehicle?.model}</p>
            <p>{invoice?.vehicle?.submodel}</p>
            <p>{invoice?.vehicle?.type}</p> */}
          </div>
          <div>
            <h2 className="font-bold text-slate-500">Estimate Details:</h2>
            <p>{invoice?.id}</p>
            <p>{moment(invoice?.createdAt).format("MMM DD, YYYY")}</p>
            <p>Bill Status</p>
            <p
              className="max-w-32 rounded-md px-2 py-[1px] text-xs font-semibold"
              style={{
                color: invoice?.column?.textColor || undefined,
                backgroundColor: invoice?.column?.bgColor || undefined,
              }}
            >
              {invoice?.column?.title}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <InvoiceItems
          items={JSON.parse(JSON.stringify(invoice?.invoiceItems ?? ""))}
          invoiceTechnicians={invoiceTechnicians}
          invoiceStatus={invoice?.column?.title}
          writePermission={writePermission}
          techniciansPerItem={techniciansPerItem}
        />
      </div>

      {writePermission && (
        <div>
          <div className="flex">
            <SaveWorkOrderBtn
              invoiceId={invoice?.id}
              dueDate={dueDate}
              setOpen={setOpen}
              onWorkOrderCreated={onWorkOrderCreated}
            />
          </div>
          <div>
            <p className="font-bold text-slate-500">{invoice?.company?.name}</p>
            <p>
              {invoice?.user?.firstName} {invoice?.user?.lastName}
            </p>
          </div>
        </div>
      )}
    </DialogContent>
  );
}
