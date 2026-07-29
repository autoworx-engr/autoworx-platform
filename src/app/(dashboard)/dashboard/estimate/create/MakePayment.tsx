import { paymentLeadsConvertion } from "@/actions/estimate/invoice/paymentLeadsConvertion";
import { newPayment } from "@/actions/payment/newPayment";
import { newPaymentMethod } from "@/actions/payment/newPaymentMethod";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/Dialog";
import Selector from "@/components/Selector";
import { SlimInput, slimInputClassName } from "@/components/SlimInput";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { useCompanyTimezone } from "@/hooks/useCompanyTimezone";
import { useInvoiceCreate } from "@/hooks/useInvoiceCreate";
import { cn } from "@/lib/cn";
import { errorToast, successToast } from "@/lib/toast";
import { useEstimateCreateStore } from "@/stores/estimate-create";
import { useListsStore } from "@/stores/lists";
import { additionalDataValidation } from "@/validations/schemas/payment/payment.validation";
import { CardType, PaymentMethod, PaymentType } from "@prisma/client";
import * as Tabs from "@radix-ui/react-tabs";
import { CreditCard } from "lucide-react";
import moment from "moment-timezone";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import React, { useState, useTransition } from "react";

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
        "group relative flex items-center justify-center gap-2.5 rounded-xl px-3 py-2 text-base font-medium transition-all duration-300 ease-out",
        isActive
          ? "text-white shadow-md shadow-indigo-500/25 ring-1 ring-black/5 translate-y-[-1px]"
          : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 [&>svg]:text-slate-400 [&>svg]:group-hover:text-primary",
      )}
    >
      {isActive && (
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary to-[#5a66ee] -z-10" />
      )}
      {children}
    </Tabs.Trigger>
  );
}

export default function MakePayment() {
  const timezone = useCompanyTimezone();
  const { paymentMethods } = useListsStore();

  const {
    payment,
    due,
    deposit: DEPOSIT,
    setDue,
    invoiceId,
    setDeposit: setDEPOSIT,
    setTotalPayment,
    totalPayment: currentTotalPayment,
  } = useEstimateCreateStore();
  const createInvoice = useInvoiceCreate("Invoice");
  const router = useRouter();
  const pathaname = usePathname();
  const [pending, startTransition] = useTransition();
  const isEditPage = pathaname?.includes("/dashboard/estimate/edit/");

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("CARD");
  const [paymentMethodInput, setPaymentMethodInput] = useState("");

  const [date, setDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState("");
  const [card, setCard] = useState("");
  const [cardType, setCardType] = useState("MASTERCARD");
  const [check, setCheck] = useState("");
  const [cash, setCash] = useState<string>("");
  const [amount, setAmount] = useState<number | string>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(
    null,
  );

  const [openPaymentMethod, setOpenPaymentMethod] = useState(false);

  const [deposit, setDeposit] = useState<number | string>(0);
  const [depositMethod, setDepositMethod] = useState<string>("");
  const [depositNotes, setDepositNotes] = useState<string>("");

  const isDueZero = due === 0 ? true : false;

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
    setAmount(0);
    setDepositNotes("");
  }

  async function handleSubmit() {
    const roundedAmount = formatAmount(amount);
    const roundedDue = formatAmount(due);

    if (!roundedAmount || roundedAmount <= 0) {
      errorToast("Payment amount must be greater than 0");
      return;
    }

    if (Number(roundedAmount) > roundedDue) {
      errorToast(`amount exceeds the due of $${roundedDue}  `);
      return;
    }

    if (tab === "DEPOSIT") {
      const roundedDeposit = formatAmount(deposit);

      if (!roundedDeposit || roundedDeposit <= 0) {
        errorToast("Deposit amount must be greater than 0");
        return;
      }

      if (roundedDeposit > roundedDue) {
        errorToast("Deposit amount cannot be greater than due amount");
        return;
      }
    }

    try {
      await additionalDataValidation.parseAsync({
        creditCard: card,
        cardType: cardType ? (cardType as CardType) : "MASTERCARD",
        checkNumber: check,
        receivedCash: cash,
        paymentMethodId: paymentMethod?.id,
      });
      const fromPayment = true;
      const res1: any = await createInvoice(fromPayment);

      if (res1 && res1.type === "globalError") {
        errorToast(
          res1?.errorSource?.length
            ? res1.errorSource[0].message
            : res1.message,
        );
        return;
      }
      let res2;
      let res3;
      if (res1.type === "success") {
        //create payment each time you make payment
        if (tab !== "DEPOSIT") {
          res2 = await newPayment({
            invoiceId: invoiceId,
            type: tab as PaymentType,
            date,
            notes,
            amount: roundedAmount,
            additionalData: {
              creditCard: card,
              cardType: cardType ? (cardType as CardType) : "MASTERCARD",
              checkNumber: check,
              receivedCash: cash,
              paymentMethodId: paymentMethod?.id,
            },
          });
          if (res2?.type === "success") {
            setDue(due - roundedAmount);
            // Update totalPayment in the store for real-time UI update
            useEstimateCreateStore.setState((prev) => ({
              ...prev,
              totalPayment: prev.totalPayment + roundedAmount,
            }));

            // setTotalPayment(currentTotalPayment + roundedAmount);
          }
        }
        // Add deposit
        if (tab === "DEPOSIT") {
          console.log(
            "🚀 ~ handleSubmit ~ formatAmount(deposit) :",
            formatAmount(deposit),
          );
          console.log("🚀 ~ handleSubmit ~ due:", due);

          if (depositMethod === "") {
            errorToast("Deposit method is required");
            return;
          }
          res3 = await newPayment({
            invoiceId: invoiceId,
            type: "DEPOSIT" as PaymentType,
            date,
            notes: depositNotes,
            amount: formatAmount(deposit),
            additionalData: {
              depositMethod: depositMethod,
              depositNotes: depositNotes,
            },
          });
          if (res3?.type === "success") {
            setDue(due - Number(deposit));
            setDEPOSIT(DEPOSIT + Number(deposit));
          }
        }
      }

      if (res2?.type === "success" || res3?.type === "success") {
        await paymentLeadsConvertion(invoiceId);
        setOpen(false);
        successToast("Payment recorded successfully");
        reset();

        // Redirect to the estimate/invoice list page after first payment
        router.push("/dashboard/estimate/invoices");
      } else if (res2?.type === "globalError") {
        errorToast(
          res2?.errorSource?.length
            ? res2.errorSource[0].message
            : res2.message,
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

  async function handleNewPaymentMethod() {
    try {
      const res = await newPaymentMethod(paymentMethodInput);

      if (res.type === "success") {
        setPaymentMethodInput("");
        setPaymentMethod(res.data);
        setOpenPaymentMethod(false);

        useListsStore.setState({
          paymentMethods: [...paymentMethods, res.data],
        });
      } else if (res.type === "globalError") {
        errorToast(
          res?.errorSource?.length ? res.errorSource[0].message : res.message,
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

  const openMakePaymentDialog = () => {
    reset();
    if (payment) {
      setTab(payment.type);
      // setDate(payment.date || new Date());
      setDate(new Date());
      // setNotes(payment.notes || "");
      switch (payment.type) {
        case "CARD":
          setCard(payment.card?.creditCard || "");
          setCardType(payment.card?.cardType || "MASTERCARD");
          break;
        case "CHECK":
          setCheck(payment.check?.checkNumber || "");
          break;
        case "CASH":
          setCash(payment.cash?.receivedCash || "");
          break;
        case "OTHER":
          setPaymentMethod(payment.other?.paymentMethod || null);
          break;
      }
    }
    setAmount(formatAmount(due));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          onClick={openMakePaymentDialog}
          type="button"
          className={cn(
            "w-full rounded-lg py-3 px-4 font-bold transition-all active:scale-95",
            isDueZero
              ? "cursor-not-allowed bg-slate-200 text-slate-400"
              : "bg-white text-[#006d77] shadow-lg shadow-black/10 hover:bg-slate-50",
          )}
          disabled={isDueZero}
        >
          Make Payment
        </button>
      </DialogTrigger>

      <DialogContent className="w-full max-w-xl">
        <form>
          <DialogHeader>
            <DialogTitle>Make Payment</DialogTitle>
            <DialogClose />
          </DialogHeader>

          <Tabs.Root className="mt-5" value={tab} onValueChange={setTab as any}>
            <Tabs.List className="grid grid-cols-3 justify-between gap-1.5 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm shadow-sm md:flex">
              <TabTrigger value="CARD" tab={tab}>
                <svg
                  viewBox="0 0 24 24"
                  height="24"
                  width="24"
                  xmlns="http://www.w3.org/2000/svg"
                  className={tab === "CARD" ? "text-white" : "text-primary"}
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M3.75 5.25L3 6V17.25L3.75 18H19.5L20.25 17.25V6L19.5 5.25H3.75ZM4.5 9V6.75H18.75V9H4.5ZM4.5 10.5V16.5H18.75V10.5H4.5ZM6.10217 14.25H7.67035V12.75H6.10217V14.25ZM13.1589 14.25H8.45435V12.75H13.1589V14.25Z"
                    fill="currentColor"
                  />
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
                        const [year, month, day] = e.target.value
                          .split("-")
                          .map(Number);
                        setDate(new Date(year, month - 1, day));
                      }}
                    />
                  </div>
                  <div className="w-full">
                    <SlimInput
                      labelClassName="text-sm md:text-base"
                      name="card"
                      type="text"
                      label="Credit Cards (Last 4 digits)"
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
                        id="other"
                        name="cardType"
                        checked={cardType === "OTHER"}
                        onChange={() => setCardType("OTHER")}
                      />
                      <label
                        className="mb-1 px-2 text-sm font-medium md:text-base"
                        htmlFor="other"
                      >
                        Other
                      </label>
                    </div>
                  </div>
                </div>
                <div className="">
                  <label
                    className="mb-1 text-sm text-slate-600 font-medium md:text-base"
                    htmlFor="notes"
                  >
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    id="notes"
                    className={cn(
                      "h-20 w-full rounded-md border-2 border-slate-400 p-2 outline-none",
                      slimInputClassName,
                    )}
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
                  className="mb-1 text-sm text-slate-600 font-medium md:text-base"
                  htmlFor="notes"
                >
                  Notes
                </label>
                <textarea
                  name="notes"
                  id="notes"
                  className={cn(
                    "h-20 w-full rounded-md border-2 border-slate-400 p-2 outline-none",
                    slimInputClassName,
                  )}
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
                />
              </div>

              <div className="mt-5">
                <label
                  className="mb-1 text-sm text-slate-600 font-medium md:text-base"
                  htmlFor="notes"
                >
                  Notes
                </label>
                <textarea
                  name="notes"
                  id="notes"
                  className={cn(
                    "h-20 w-full rounded-md border-2 border-slate-400 p-2 outline-none",
                    slimInputClassName,
                  )}
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

              <div className="mt-6 flex justify-between gap-3">
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
                  />
                </div>
              </div>

              <div className="mt-5">
                <label
                  className="mb-1 text-sm text-slate-600 font-medium md:text-base"
                  htmlFor="notes"
                >
                  Notes
                </label>
                <textarea
                  name="notes"
                  id="notes"
                  className={cn(
                    "h-20 w-full rounded-md border-2 border-slate-400 p-2 outline-none",
                    slimInputClassName,
                  )}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </Tabs.Content>
            <Tabs.Content value="DEPOSIT">
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
                    name="deposit"
                    type="text"
                    label="Deposit Amount"
                    value={deposit}
                    onChange={(e) => setDeposit(e.target.value)}
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
                  className="mb-1 text-sm text-slate-600 font-medium md:text-base"
                  htmlFor="depositNotes"
                >
                  Deposit Notes
                </label>
                <textarea
                  name="depositNotes"
                  id="depositNotes"
                  className={cn(
                    "h-20 w-full rounded-md border-2 border-slate-400 p-2 outline-none",
                    slimInputClassName,
                  )}
                  value={depositNotes}
                  onChange={(e) => setDepositNotes(e.target.value)}
                />
              </div>
            </Tabs.Content>
            <DialogFooter className="mt-5 flex justify-center gap-2 md:gap-3">
              <button
                type="button"
                className="rounded-xl mt-2 sm:mt-0 px-5 py-2.5 text-sm font-medium text-slate-500 
                hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800
                transition-colors border"
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
              <button
                className="rounded-xl px-6 py-2.5 text-sm font-medium text-white
                bg-gradient-to-r from-primary to-[#5a66ee]
                shadow-lg shadow-indigo-500/30
                hover:shadow-xl hover:shadow-indigo-500/40
                hover:-translate-y-0.5 hover:scale-[1.02]
                active:translate-y-0 active:scale-100
                transition-all duration-200"
                formAction={() => startTransition(handleSubmit)}
                disabled={pending}
                type="submit"
              >
                Record
              </button>
            </DialogFooter>
          </Tabs.Root>
        </form>
      </DialogContent>
    </Dialog>
  );
}
