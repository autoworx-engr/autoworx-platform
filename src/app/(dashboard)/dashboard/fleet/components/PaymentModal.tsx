"use client";

import { makeFleetStatementPayment } from "@/actions/fleet/statement";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/Dialog";
import Selector from "@/components/Selector";
import { SlimInput } from "@/components/SlimInput";
import { formatAmount, useAmountField } from "@/hooks/useAmountField";
import { useCompanyTimezone } from "@/hooks/useCompanyTimezone";
import { cn } from "@/lib/cn";
import { errorToast, successToast } from "@/lib/toast";
import { useListsStore } from "@/stores/lists";
import { CardType, PaymentMethod, PaymentType } from "@prisma/client";
import * as Tabs from "@radix-ui/react-tabs";
import moment from "moment-timezone";
import Image from "next/image";
import React, { useEffect, useState } from "react";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  statementId: string;
  totalDue: number;
  onPaymentSuccess?: () => void;
}

function TabTrigger({
  value,
  children,
  tab,
}: {
  value: string;
  children: React.ReactNode;
  tab: string;
}) {
  const isActive = tab === value;
  return (
    <Tabs.Trigger
      value={value}
      className={cn(
        "group relative flex items-center justify-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-300 ease-out md:text-base",
        isActive
          ? "text-white shadow-md shadow-indigo-500/25 ring-1 ring-black/5 translate-y-[-1px]"
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 [&>svg]:text-slate-400 [&>svg]:group-hover:text-primary",
      )}
    >
      {isActive && (
        <div className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-r from-primary to-[#5a66ee]" />
      )}
      {children}
    </Tabs.Trigger>
  );
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  statementId,
  totalDue,
  onPaymentSuccess,
}) => {
  const timezone = useCompanyTimezone();

  const { paymentMethods } = useListsStore();
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("CARD");

  // Form states
  const [date, setDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState("");
  const [card, setCard] = useState("");
  const [cardType, setCardType] = useState("MASTERCARD");
  const [check, setCheck] = useState("");
  const [cash, setCash] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(
    null,
  );
  const [openPaymentMethod, setOpenPaymentMethod] = useState(false);
  const [paymentMethodInput, setPaymentMethodInput] = useState("");
  const [depositMethod, setDepositMethod] = useState("");
  const [depositNotes, setDepositNotes] = useState("");

  const {
    value: amount,
    setValue: setAmount,
    error: amountError,
    inputProps: amountInputProps,
  } = useAmountField(totalDue, "Amount");

  const {
    value: deposit,
    setValue: setDeposit,
    error: depositError,
    inputProps: depositInputProps,
  } = useAmountField(totalDue, "Deposit amount");

  function reset() {
    setTab("CARD");
    setDate(new Date());
    setNotes("");
    setCard("");
    setCardType("MASTERCARD");
    setCheck("");
    setCash("");
    setAmount(totalDue);
    setDeposit(totalDue);
    setPaymentMethod(null);
    setDepositMethod("");
    setDepositNotes("");
  }

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      reset();
    }
  }, [isOpen, totalDue]);

  const handleSubmit = async () => {
    try {
      const roundedTotalDue = formatAmount(totalDue);
      const isDeposit = tab === "DEPOSIT";

      if (isDeposit) {
        if (depositError) {
          errorToast(depositError);
          return;
        }

        if (formatAmount(deposit) > roundedTotalDue) {
          errorToast("Deposit amount cannot be greater than due amount");
          return;
        }

        if (!depositMethod) {
          errorToast("Deposit method is required");
          return;
        }
      } else {
        if (amountError) {
          errorToast(amountError);
          return;
        }

        if (formatAmount(amount) > roundedTotalDue) {
          errorToast("Payment amount exceeds the due amount");
          return;
        }
      }

      const roundedAmount = isDeposit
        ? formatAmount(deposit)
        : formatAmount(amount);

      setLoading(true);

      const paymentData = {
        statementId,
        amount: roundedAmount,
        paymentMethod: tab as PaymentType,
        notes,
        date,
        ...(tab === "CARD" && {
          creditCard: card,
          cardType: cardType as CardType,
        }),
        ...(tab === "CHECK" && {
          checkNumber: check,
        }),
        ...(tab === "OTHER" && {
          paymentMethodId: paymentMethod?.id,
        }),
        ...(tab === "CASH" && {
          receivedCash: cash,
        }),
        ...(tab === "DEPOSIT" && {
          depositMethod,
          depositNotes,
        }),
      };

      const result = await makeFleetStatementPayment(paymentData);

      if (result.type === "success") {
        successToast(result.message || "Payment recorded successfully");
        reset();
        onClose();
        if (onPaymentSuccess) {
          onPaymentSuccess();
        }
      } else {
        errorToast(result.message || "Payment failed");
      }
    } catch (error) {
      console.error("Payment error:", error);
      errorToast("Payment failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    reset();
    onClose();
  };

  async function handleNewPaymentMethod() {
    try {
      // For now, we'll skip the new payment method creation
      // since it's not implemented in the fleet context
      errorToast("New payment method creation not available in fleet payments");
    } catch (error) {
      errorToast("Failed to create payment method");
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-xl">
        <form>
          <DialogHeader>
            <DialogTitle>Make Payment</DialogTitle>
            <DialogClose />
          </DialogHeader>

          <Tabs.Root className="mt-5" value={tab} onValueChange={setTab as any}>
            <Tabs.List className="grid grid-cols-5 gap-1.5 rounded-2xl border border-slate-200 bg-white/50 p-1.5 shadow-sm md:flex">
              <TabTrigger value="CARD" tab={tab}>
                <svg
                  viewBox="0 0 24 24"
                  fill="#ffffff"
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
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M3.75 5.25L3 6V17.25L3.75 18H19.5L20.25 17.25V6L19.5 5.25H3.75ZM4.5 9V6.75H18.75V9H4.5ZM4.5 10.5V16.5H18.75V10.5H4.5ZM6.10217 14.25H7.67035V12.75H6.10217V14.25ZM13.1589 14.25H8.45435V12.75H13.1589V14.25Z"
                      fill={tab === "CARD" ? "#ffffff" : "#6571ff"}
                    ></path>
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
                    tab === "CASH" ? "/icons/CashWhite.svg" : "/icons/Cash.svg"
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

              <TabTrigger value="DEPOSIT" tab={tab}>
                Deposit
              </TabTrigger>
            </Tabs.List>

            <Tabs.Content value="CARD">
              <div className="mt-5 flex flex-col gap-5">
                <div className="flex gap-3">
                  <div className="w-40 md:w-fit">
                    <SlimInput
                      labelClassName="text-sm md:text-base"
                      name="date"
                      type="date"
                      value={date ? moment(date).format("YYYY-MM-DD") : ""}
                      onChange={(e) => {
                        const localDate = moment.tz(
                          e.target.value,
                          "YYYY-MM-DD",
                          timezone,
                        );
                        setDate(localDate.toDate());
                      }}
                    />
                  </div>
                  <div className="w-full">
                    <SlimInput
                      labelClassName="text-sm md:text-base"
                      name="card"
                      type="text"
                      label="Credit Card (Last 4 digits)"
                      value={card}
                      onChange={(e) => setCard(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-5 md:flex-row md:items-end">
                  <div className="md:w-[40%]">
                    <SlimInput
                      labelClassName="text-sm md:text-base"
                      name="amount"
                      {...amountInputProps}
                    />
                  </div>

                  <div className="flex flex-row gap-3">
                    <div className="flex items-center gap-1">
                      <input
                        type="radio"
                        id="mastercard"
                        name="cardType"
                        checked={cardType === "MASTERCARD"}
                        onChange={() => setCardType("MASTERCARD")}
                      />
                      <label
                        className="mb-1 px-2 text-sm font-medium md:text-base"
                        htmlFor="mastercard"
                      >
                        Mastercard
                      </label>
                    </div>

                    <div className="flex items-center gap-1">
                      <input
                        type="radio"
                        id="visa"
                        name="cardType"
                        checked={cardType === "VISA"}
                        onChange={() => setCardType("VISA")}
                      />
                      <label
                        className="mb-1 px-2 text-sm font-medium md:text-base"
                        htmlFor="visa"
                      >
                        Visa
                      </label>
                    </div>

                    <div className="flex items-center gap-1">
                      <input
                        type="radio"
                        id="amex"
                        name="cardType"
                        checked={cardType === "AMEX"}
                        onChange={() => setCardType("AMEX")}
                      />
                      <label
                        className="mb-1 px-2 text-sm font-medium md:text-base"
                        htmlFor="amex"
                      >
                        Amex
                      </label>
                    </div>

                    <div className="flex items-center gap-1">
                      <input
                        type="radio"
                        id="discover"
                        name="cardType"
                        checked={cardType === "DISCOVER"}
                        onChange={() => setCardType("DISCOVER")}
                      />
                      <label
                        className="mb-1 px-2 text-sm font-medium md:text-base"
                        htmlFor="discover"
                      >
                        Discover
                      </label>
                    </div>
                  </div>
                </div>
                <div className="">
                  <label
                    className="mb-1 px-2 text-sm font-medium md:text-base"
                    htmlFor="notes"
                  >
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    id="notes"
                    className="h-20 w-full rounded-md border-2 border-slate-400 p-2 outline-none"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
            </Tabs.Content>

            <Tabs.Content value="CHECK">
              <div className="mt-5 flex justify-between gap-3">
                <div className="w-40 md:w-[40%]">
                  <SlimInput
                    labelClassName="text-sm md:text-base"
                    name="date"
                    type="date"
                    value={date ? moment(date).format("YYYY-MM-DD") : ""}
                    onChange={(e) => {
                      const localDate = moment.tz(
                        e.target.value,
                        "YYYY-MM-DD",
                        timezone,
                      );
                      setDate(localDate.toDate());
                    }}
                  />
                </div>

                <div className="w-[60%]">
                  <SlimInput
                    labelClassName="text-sm md:text-base"
                    name="check"
                    type="text"
                    label="Check #"
                    value={check}
                    onChange={(e) => setCheck(e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-5 md:w-[40%]">
                <SlimInput
                  labelClassName="text-sm md:text-base"
                  name="amount"
                  {...amountInputProps}
                />
              </div>

              <div className="mt-5">
                <label
                  className="mb-1 px-2 text-sm font-medium md:text-base"
                  htmlFor="notes"
                >
                  Notes
                </label>
                <textarea
                  name="notes"
                  id="notes"
                  className="h-20 w-full rounded-md border-2 border-slate-400 p-2 outline-none"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </Tabs.Content>

            <Tabs.Content value="CASH">
              <div className="mt-5 flex justify-between gap-3">
                <div className="w-40 md:w-[40%]">
                  <SlimInput
                    labelClassName="text-sm md:text-base"
                    name="date"
                    type="date"
                    value={date ? moment(date).format("YYYY-MM-DD") : ""}
                    onChange={(e) => {
                      const localDate = moment.tz(
                        e.target.value,
                        "YYYY-MM-DD",
                        timezone,
                      );
                      setDate(localDate.toDate());
                    }}
                  />
                </div>

                <div className="w-[60%]">
                  <SlimInput
                    labelClassName="text-sm md:text-base"
                    name="cash"
                    type="text"
                    label="Cash Received"
                    value={cash}
                    onChange={(e) => setCash(e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-5 md:w-[40%]">
                <SlimInput
                  labelClassName="text-sm md:text-base"
                  name="amount"
                  {...amountInputProps}
                />
              </div>

              <div className="mt-5">
                <label
                  className="mb-1 px-2 text-sm font-medium md:text-base"
                  htmlFor="notes"
                >
                  Notes
                </label>
                <textarea
                  name="notes"
                  id="notes"
                  className="h-20 w-full rounded-md border-2 border-slate-400 p-2 outline-none"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </Tabs.Content>

            <Tabs.Content value="OTHER">
              <div className="mt-5">
                <label className="mb-1 px-2 text-sm font-medium md:text-base">
                  Payment Method
                </label>

                <Selector
                  label={(paymentMethod: PaymentMethod | null) =>
                    paymentMethod
                      ? paymentMethod.name ||
                        `Payment Method ${paymentMethod.id}`
                      : "Payment Method"
                  }
                  newButton={
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Payment Method Name"
                        value={paymentMethodInput}
                        onChange={(e) => setPaymentMethodInput(e.target.value)}
                        className="w-full rounded-md border-2 border-slate-400 p-1"
                      />
                      <button
                        onClick={handleNewPaymentMethod}
                        className={cn(
                          "text-nowrap rounded-md px-2 text-white",
                          paymentMethodInput ? "bg-slate-700" : "bg-slate-400",
                        )}
                        type="button"
                        disabled={!paymentMethodInput}
                      >
                        Quick Add
                      </button>
                    </div>
                  }
                  items={paymentMethods}
                  onSearch={(search: string) =>
                    paymentMethods.filter((method) =>
                      method.name.toLowerCase().includes(search.toLowerCase()),
                    )
                  }
                  displayList={(paymentMethod: PaymentMethod) => (
                    <p>{paymentMethod.name}</p>
                  )}
                  openState={[openPaymentMethod, setOpenPaymentMethod]}
                  selectedItem={paymentMethod}
                  setSelectedItem={setPaymentMethod}
                />
              </div>

              <div className="mt-5 flex justify-between gap-3">
                <div>
                  <SlimInput
                    labelClassName="text-sm md:text-base"
                    name="date"
                    type="date"
                    value={date ? moment(date).format("YYYY-MM-DD") : ""}
                    onChange={(e) => {
                      const localDate = moment.tz(
                        e.target.value,
                        "YYYY-MM-DD",
                        timezone,
                      );
                      setDate(localDate.toDate());
                    }}
                  />
                </div>

                <div className="w-full">
                  <SlimInput
                    labelClassName="text-sm md:text-base"
                    name="amount"
                    {...amountInputProps}
                  />
                </div>
              </div>

              <div className="mt-5">
                <label
                  className="mb-1 px-2 text-sm font-medium md:text-base"
                  htmlFor="notes"
                >
                  Notes
                </label>
                <textarea
                  name="notes"
                  id="notes"
                  className="h-20 w-full rounded-md border-2 border-slate-400 p-2 outline-none"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </Tabs.Content>

            <Tabs.Content value="DEPOSIT">
              <div className="mt-5 flex justify-between gap-3">
                <div className="w-40 md:w-[40%]">
                  <SlimInput
                    labelClassName="text-sm md:text-base"
                    name="date"
                    type="date"
                    value={date ? moment(date).format("YYYY-MM-DD") : ""}
                    onChange={(e) => {
                      const localDate = moment.tz(
                        e.target.value,
                        "YYYY-MM-DD",
                        timezone,
                      );
                      setDate(localDate.toDate());
                    }}
                  />
                </div>

                <div className="w-[60%]">
                  <SlimInput
                    labelClassName="text-sm md:text-base"
                    name="deposit"
                    label="Deposit Amount"
                    {...depositInputProps}
                  />
                </div>
              </div>

              <div className="mt-5">
                <SlimInput
                  labelClassName="text-sm md:text-base"
                  name="depositMethod"
                  type="text"
                  label="Deposit Method"
                  value={depositMethod}
                  onChange={(e) =>
                    setDepositMethod(e.target.value.replace(/[^a-zA-Z ]/g, ""))
                  }
                  required={true}
                />
              </div>

              <div className="mt-5">
                <label
                  className="mb-1 px-2 text-sm font-medium md:text-base"
                  htmlFor="depositNotes"
                >
                  Deposit Notes
                </label>
                <textarea
                  name="depositNotes"
                  id="depositNotes"
                  className="h-20 w-full rounded-md border-2 border-slate-400 p-2 outline-none"
                  value={depositNotes}
                  onChange={(e) => setDepositNotes(e.target.value)}
                />
              </div>
            </Tabs.Content>

            <DialogFooter className="mt-5 flex justify-center gap-2 md:gap-3">
              <button
                type="button"
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                onClick={handleCancel}
              >
                Cancel
              </button>
              <button
                className="rounded-xl bg-gradient-to-r from-primary to-[#5a66ee] px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/30 transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-xl hover:shadow-indigo-500/40 active:translate-y-0 active:scale-100 disabled:opacity-60"
                onClick={handleSubmit}
                disabled={loading}
                type="button"
              >
                {loading ? "Processing..." : "Record"}
              </button>
            </DialogFooter>
          </Tabs.Root>
        </form>
      </DialogContent>
    </Dialog>
  );
};
