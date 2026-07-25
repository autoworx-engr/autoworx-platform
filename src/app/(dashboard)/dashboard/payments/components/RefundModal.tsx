import { deleteRefund, refundPayment } from "@/actions/payment/refundPayment";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/Dialog";
import { SlimInput } from "@/components/SlimInput";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { queryKeys } from "@/lib/queryKeys";
import { errorToast, successToast } from "@/lib/toast";
import { PaymentType } from "@prisma/client";
import * as Tabs from "@radix-ui/react-tabs";
import { useQueryClient } from "@tanstack/react-query";
import { Settings, Trash2 } from "lucide-react";
import moment from "moment";
import Image from "next/image";
import React, { useEffect, useState, useTransition } from "react";

function TabTrigger({
  value,
  children,
  tab,
}: {
  value: string;
  children: React.ReactNode;
  tab: string;
}) {
  return (
    <Tabs.Trigger
      value={value}
      className="flex items-center gap-1 rounded-md bg-primary p-1 px-5 text-white transition-all"
      style={{
        backgroundColor: tab === value ? "#6571FF" : "transparent",
        border: tab === value ? "none" : "1px solid #6571FF",
        color: tab === value ? "white" : "#6571FF",
      }}
    >
      {children}
    </Tabs.Trigger>
  );
}

interface RefundModalProps {
  paymentId: number;
  paymentType: PaymentType;
  totalAmount: number;
  refundedAmount: number;
  refundMethod?: string;
  refundReason?: string;
  refundDate?: Date;
  onRefundSuccess: () => Promise<void>;
}

export default function RefundModal({
  paymentId,
  paymentType,
  totalAmount,
  refundedAmount,
  refundMethod,
  refundReason,
  refundDate,
  onRefundSuccess,
}: RefundModalProps) {
  const [pending, startTransition] = useTransition();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState(paymentType);

  const [date, setDate] = useState<Date>(new Date());
  const [refundAmount, setRefundAmount] = useState<number | string>(0);
  const [refundReasonInput, setRefundReasonInput] = useState("");
  const availableToRefund = totalAmount;
  const hasRefund = refundedAmount > 0;
  const queryClient = useQueryClient();

  // Populate form with existing refund data when editing
  useEffect(() => {
    if (hasRefund && open) {
      setRefundAmount(refundedAmount);
      setRefundReasonInput(refundReason || "");
      if (refundMethod) {
        setTab(refundMethod as PaymentType);
      }
      if (refundDate) {
        setDate(new Date(refundDate));
      }
    }
  }, [hasRefund, open, refundedAmount, refundReason, refundMethod, refundDate]);

  const formatAmount = (value: number | string): number => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return parseFloat(num.toFixed(2));
  };

  function reset() {
    setTab(paymentType);
    setDate(new Date());
    setRefundAmount(0);
    setRefundReasonInput("");
  }

  function invalidateInvoiceModalData(invoiceId: string) {
    queryClient.invalidateQueries({
      queryKey: queryKeys.getInvoiceModalDataKey(invoiceId),
    });
    queryClient.invalidateQueries({
      queryKey: queryKeys.getWorkOrderDataKey(invoiceId),
    });
  }

  async function handleSubmit() {
    try {
      const roundedAmount = formatAmount(refundAmount);

      if (roundedAmount <= 0) {
        errorToast("Refund amount must be greater than 0");
        return;
      }
      if (roundedAmount > totalAmount) {
        errorToast(
          `Refund amount cannot exceed original payment amount: $${totalAmount.toFixed(2)}`,
        );
        return;
      }

      const res = await refundPayment({
        paymentId,
        refundAmount: roundedAmount,
        refundMethod: tab,
        refundReason: refundReasonInput,
        refundDate: date,
      });

      if (res?.type === "success") {
        setOpen(false);
        successToast("Refund updated successfully");
        const invoiceId = res.data?.invoiceId;
        if (!invoiceId) {
          console.warn("No invoiceId returned from refundPayment");
          return;
        }
        reset();
        // Call the refresh function to update the data
        await onRefundSuccess();
        invalidateInvoiceModalData(invoiceId);
      } else if (res?.type === "globalError") {
        errorToast(
          Array.isArray(res?.errorSource) &&
            res.errorSource.length &&
            typeof res.errorSource[0] === "object" &&
            res.errorSource[0] !== null &&
            "message" in res.errorSource[0] &&
            typeof (res.errorSource[0] as any).message === "string"
            ? (res.errorSource[0] as any).message
            : (res as any).message,
        );
      }
    } catch (err) {
      const formattedError = errorHandler(err);
      errorToast(
        formattedError?.errorSource?.length
          ? formattedError.errorSource[0].message
          : formattedError.message,
      );
    }
  }

  async function handleDeleteRefund() {
    try {
      const res = await deleteRefund({
        paymentId,
      });

      if (res?.type === "success") {
        setDeleteConfirmOpen(false);
        setOpen(false);
        successToast("Refund removed successfully");
        reset();

        const invoiceId = res.data?.invoiceId;
        if (!invoiceId) {
          console.warn("No invoiceId returned from deleteRefund");
          return;
        }

        // Call the refresh function to update the data
        await onRefundSuccess();
        invalidateInvoiceModalData(invoiceId);
      } else if (res?.type === "globalError") {
        errorToast(
          Array.isArray(res?.errorSource) &&
            res.errorSource.length &&
            typeof res.errorSource[0] === "object" &&
            res.errorSource[0] !== null &&
            "message" in res.errorSource[0] &&
            typeof (res.errorSource[0] as any).message === "string"
            ? (res.errorSource[0] as any).message
            : (res as any).message,
        );
      }
    } catch (err) {
      const formattedError = errorHandler(err);
      errorToast(
        formattedError?.errorSource?.length
          ? formattedError.errorSource[0].message
          : formattedError.message,
      );
    }
  }

  const openRefundDialog = () => {
    if (hasRefund) {
      // Prepopulate with existing refund data
      setRefundAmount(formatAmount(refundedAmount));
      setRefundReasonInput(refundReason || "");
      setTab((refundMethod as PaymentType) || paymentType);
      setDate(refundDate || new Date());
    } else {
      // Default values for new refund
      reset();
      setRefundAmount(formatAmount(availableToRefund));
    }
  };

  const isDisabled = totalAmount === 0;

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button
            onClick={openRefundDialog}
            type="button"
            className={`
                flex w-max items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all duration-300 shadow-sm hover:shadow-md active:translate-y-0
                ${isDisabled ? "cursor-not-allowed opacity-50" : ""} 
                ${
                  hasRefund
                    ? "border border-slate-200 bg-white text-slate-700 hover:text-primary hover:border-primary"
                    : "bg-gradient-to-r from-primary to-[#5a66ee] text-white shadow-primary/20"
                }
            `}
            disabled={isDisabled}
          >
            <span>{hasRefund ? "Manage Refund" : "Refund"}</span>
            {hasRefund && <Settings size={14} color="#6571FF" />}
          </button>
        </DialogTrigger>

        <DialogContent
          className="w-[95vw] max-w-xl max-h-[90vh] overflow-y-auto [&>button]:hidden p-4 sm:p-6"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <form>
            <DialogHeader>
              <DialogTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-lg sm:text-xl text-gray-600">
                <span>{hasRefund ? "Manage Refund" : "Refund"}</span>
                {hasRefund && (
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmOpen(true)}
                    className="flex items-center gap-1 rounded-lg border bg-[#FF7575] p-2 text-sm text-white self-start sm:self-auto"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </DialogTitle>
              {/* Removed DialogClose component */}
            </DialogHeader>

            <Tabs.Root
              className="mt-4 sm:mt-5"
              value={tab}
              onValueChange={setTab as any}
            >
              <div className="mt-4 sm:mt-5 flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="w-full sm:w-40">
                  <SlimInput
                    labelClassName="text-sm md:text-base"
                    name="date"
                    type="date"
                    label="Date"
                    onFocus={(e) => {
                      // Prevent the default focus behavior to avoid opening the calendar popup
                      e.preventDefault();
                    }}
                    value={moment.utc(date).format("YYYY-MM-DD")}
                    onChange={(e) => {
                      if (e.target.value) {
                        setDate(new Date(`${e.target.value}T00:00:00Z`));
                      }
                    }}
                  />
                </div>
                <div className="w-full">
                  <SlimInput
                    labelClassName="text-sm md:text-base"
                    name="refundAmount"
                    type="number"
                    label="Amount"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    onBlur={(e) =>
                      setRefundAmount(formatAmount(e.target.value))
                    }
                    max={availableToRefund}
                  />
                </div>
              </div>

              <p className="mb-2 mt-5">Method</p>
              <Tabs.List className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                <TabTrigger value="CARD" tab={tab}>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    height="24"
                    width="24"
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
                        d="M3.75 5.25L3 6V17.25L3.75 18H19.5L20.25 17.25V6L19.5 5.25H3.75ZM4.5 9V6.75H18.75V9H4.5ZM4.5 10.5V16.5H18.75V10.5H4.5ZM6.10217 14.25H7.67035V12.75H6.10217V14.25ZM13.1589 14.25H8.45435V12.75H13.1589V14.25Z"
                        fill={tab === "CARD" ? "#ffffff" : "#6571ff"}
                      ></path>{" "}
                    </g>
                  </svg>
                  Card
                </TabTrigger>

                <TabTrigger value="CHECK" tab={tab}>
                  <Image
                    src={
                      tab === "CHECK"
                        ? "/icons/CheckWhite.svg"
                        : "/icons/Check.svg"
                    }
                    alt="Check icon"
                    width={20}
                    height={20}
                  />
                  Check
                </TabTrigger>

                <TabTrigger value="CASH" tab={tab}>
                  <Image
                    src={
                      tab === "CASH"
                        ? "/icons/CashWhite.svg"
                        : "/icons/Cash.svg"
                    }
                    alt="Cash icon"
                    width={20}
                    height={20}
                  />
                  Cash
                </TabTrigger>

                <TabTrigger value="OTHER" tab={tab}>
                  Other
                </TabTrigger>
              </Tabs.List>
              <div className="mt-5">
                {/* <SlimInput
                  className="h-20"
                  labelClassName="text-sm md:text-base"
                  name="refundReason"
                  type="text"
                  label="Reason for Refund"
                  value={refundReasonInput}
                  onChange={(e) => setRefundReasonInput(e.target.value)}
                /> */}

                <label
                  htmlFor="refundReason"
                  className="block mb-2 text-sm md:text-base font-medium text-gray-700"
                >
                  Reason for Refund
                </label>
                <textarea
                  id="refundReason"
                  name="refundReason"
                  value={refundReasonInput}
                  placeholder="Enter reason for refund..."
                  onChange={(e) => setRefundReasonInput(e.target.value)}
                  rows={3}
                  className="w-full p-2 sm:p-3 border border-gray-500 rounded-md shadow-sm focus:outline-none   resize-none"
                />
              </div>

              <DialogFooter className="mt-8 flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 border-t border-slate-100 dark:border-slate-800 pt-6">
                <button
                  type="button"
                  className="w-full sm:w-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 px-6 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-primary to-[#5a66ee] p-2.5 px-8 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                  formAction={() => startTransition(handleSubmit)}
                  disabled={pending}
                  type="submit"
                >
                  {pending ? "Recording..." : "Record"}
                </button>
              </DialogFooter>
            </Tabs.Root>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="w-full max-w-md">
          <DialogHeader>
            <DialogTitle>Remove Refund</DialogTitle>
            <DialogClose />
          </DialogHeader>

          <div className="mt-3 text-sm text-gray-600">
            <p>Are you sure you want to remove this refund?</p>
            <p className="mt-2">
              This will restore the payment to its original amount and remove
              all refund information.
            </p>
          </div>

          <DialogFooter className="mt-5 flex justify-center gap-2 md:gap-5">
            <button
              type="button"
              className="rounded-md border-2 border-slate-400 p-2 px-5"
              onClick={() => setDeleteConfirmOpen(false)}
            >
              Cancel
            </button>
            <button
              className="rounded-md bg-red-500 p-2 px-5 text-white disabled:bg-gray-400"
              onClick={() => startTransition(handleDeleteRefund)}
              disabled={pending}
            >
              {pending ? "Removing..." : "Remove Refund"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
