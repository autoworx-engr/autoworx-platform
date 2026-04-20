"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter,
} from "@/components/Dialog";
import { SlimInput } from "@/components/SlimInput";
import Selector from "@/components/Selector";
import { PaymentType, CardType, PaymentMethod } from "@prisma/client";
import { makeFleetStatementPayment } from "@/actions/fleet/statement";
import { errorToast, successToast } from "@/lib/toast";
import { useListsStore } from "@/stores/lists";
import { cn } from "@/lib/cn";
import * as Tabs from "@radix-ui/react-tabs";
import moment from "moment-timezone";
import Image from "next/image";
import { useCompanyTimezone } from "@/hooks/useCompanyTimezone";

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
  return (
    <Tabs.Trigger
      value={value}
      className="flex items-center gap-1 rounded-md bg-[#6571FF] p-1 px-5 text-white transition-all"
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
  const [amount, setAmount] = useState<number | string>(totalDue);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(
    null,
  );
  const [openPaymentMethod, setOpenPaymentMethod] = useState(false);
  const [paymentMethodInput, setPaymentMethodInput] = useState("");

  const formatAmount = (value: number | string): number => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return Math.round(num * 100) / 100;
  };

  function reset() {
    setTab("CARD");
    setDate(new Date());
    setNotes("");
    setCard("");
    setCardType("MASTERCARD");
    setCheck("");
    setCash("");
    setAmount(totalDue);
    setPaymentMethod(null);
  }

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      reset();
    }
  }, [isOpen, totalDue]);

  const handleSubmit = async () => {
    try {
      const roundedAmount = formatAmount(amount);
      const roundedTotalDue = formatAmount(totalDue);

      if (Number(roundedAmount) > Number(roundedTotalDue)) {
        errorToast("Payment amount exceeds the due amount");
        return;
      }

      if (Number(roundedAmount) <= 0) {
        errorToast("Payment amount must be greater than 0");
        return;
      }

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
            <Tabs.List className="grid grid-cols-4 justify-between gap-3 md:flex">
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
                    {" "}
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
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
                      type="text"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      onBlur={(e) => setAmount(formatAmount(e.target.value))}
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
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  onBlur={(e) => setAmount(formatAmount(e.target.value))}
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
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  onBlur={(e) => setAmount(formatAmount(e.target.value))}
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
                    type="text"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    onBlur={(e) => setAmount(formatAmount(e.target.value))}
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

            <DialogFooter className="mt-5 flex justify-center gap-2 md:gap-5">
              <button
                type="button"
                className="rounded-md border-2 border-slate-400 p-2 px-5"
                onClick={handleCancel}
              >
                Cancel
              </button>
              <button
                className="rounded-md bg-[#6571FF] p-2 px-5 text-white disabled:bg-gray-400"
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
