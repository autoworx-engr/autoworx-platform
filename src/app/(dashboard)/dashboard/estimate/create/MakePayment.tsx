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
import { SlimInput } from "@/components/SlimInput";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { useInvoiceCreate } from "@/hooks/useInvoiceCreate";
import { cn } from "@/lib/cn";
import { errorToast, successToast } from "@/lib/toast";
import { useEstimateCreateStore } from "@/stores/estimate-create";
import { useListsStore } from "@/stores/lists";
import { additionalDataValidation } from "@/validations/schemas/payment/payment.validation";
import { CardType, PaymentMethod, PaymentType } from "@prisma/client";
import * as Tabs from "@radix-ui/react-tabs";
import moment from "moment";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useState, useTransition } from "react";
import { FaRegCreditCard } from "react-icons/fa6";

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

export default function MakePayment() {
  const { paymentMethods } = useListsStore();

  const {
    payment,
    due,
    deposit: DEPOSIT,
    setDue,
    invoiceId,
    setDeposit: setDEPOSIT,
  } = useEstimateCreateStore();
  const createInvoice = useInvoiceCreate("Invoice");
  const router = useRouter();
  const pathaname = usePathname();
  const [pending, startTransition] = useTransition();
  const isEditPage = pathaname?.includes("/estimate/edit/");

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
    null
  );

  const [openPaymentMethod, setOpenPaymentMethod] = useState(false);

  const [deposit, setDeposit] = useState<number | string>(0);
  const [depositMethod, setDepositMethod] = useState<string>("");
  const [depositNotes, setDepositNotes] = useState<string>("");

  const isDueZero = due === 0 ? true : false;

  // useEffect(() => {
  //   if (payment) {
  //     setTab(payment.type);
  //     setDate(payment.date || new Date());
  //     setNotes(payment.notes || "");

  //     switch (payment.type) {
  //       case "CARD":
  //         setCard(payment.card?.creditCard || "");
  //         setCardType(payment.card?.cardType || "MASTERCARD");
  //         break;
  //       case "CHECK":
  //         setCheck(payment.check?.checkNumber || "");
  //         break;
  //       case "CASH":
  //         setCash(payment.cash?.receivedCash || "");
  //         break;
  //       case "OTHER":
  //         setPaymentMethod(payment.other?.paymentMethod || null);
  //         break;
  //     }
  //   }
  // }, [payment]);

  // useEffect(() => setAmount(due), [due]);

  const formatAmount = (value: number | string): number => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return parseFloat(num.toFixed(2));
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
    try {
      const roundedAmount = formatAmount(amount);
      if (Number(roundedAmount) > due) {
        errorToast("amount exceeds the due");
        return;
      }
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
          res1?.errorSource?.length ? res1.errorSource[0].message : res1.message
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
          if (res2?.type === "success") setDue(due - roundedAmount);
        }
        // Add deposit
        if (tab === "DEPOSIT") {
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
        // setDeposit(deposit + Number(amount));

        // Redirect to the index
        reset();
        !isEditPage && router.push("/dashboard/estimate/invoices");
      } else if (res2?.type === "globalError") {
        errorToast(
          res2?.errorSource?.length ? res2.errorSource[0].message : res2.message
        );
      }
    } catch (err) {
      const formattedError = errorHandler(err);
      errorToast(
        formattedError?.errorSource?.length
          ? formattedError.errorSource[0].message
          : formattedError.message
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
          res?.errorSource?.length ? res.errorSource[0].message : res.message
        );
      }
    } catch (err) {
      const formattedError = errorHandler(err);
      errorToast(
        formattedError?.errorSource?.length
          ? formattedError.errorSource[0].message
          : formattedError.message
      );
    }
  }

  const openMakePaymentDialog = () => {
    reset();
    if (payment) {
      setTab(payment.type);
      setDate(payment.date || new Date());
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
          className={`w-full rounded-md  p-2  ${isDueZero ? "cursor-not-allowed bg-gray-500" : "bg-background text-[#006d77]"}`}
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
            <Tabs.List className="grid grid-cols-3 justify-between gap-3 md:flex">
              <TabTrigger value="CARD" tab={tab}>
                <FaRegCreditCard />
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
                      value={moment(date).format("YYYY-MM-DD")}
                      onChange={(e) => setDate(new Date(e.target.value))}
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
                    value={moment(date).format("YYYY-MM-DD")}
                    onChange={(e) => setDate(new Date(e.target.value))}
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
                    value={moment(date).format("YYYY-MM-DD")}
                    onChange={(e) => setDate(new Date(e.target.value))}
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
                          paymentMethodInput ? "bg-slate-700" : "bg-slate-400"
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
                      method.name.toLowerCase().includes(search.toLowerCase())
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
                    value={moment(date).format("YYYY-MM-DD")}
                    onChange={(e) => setDate(new Date(e.target.value))}
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
                <div>
                  <SlimInput
                    labelClassName="text-sm md:text-base"
                    name="date"
                    type="date"
                    value={moment(date).format("YYYY-MM-DD")}
                    onChange={(e) => setDate(new Date(e.target.value))}
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
                  onChange={(e) => setDepositMethod(e.target.value)}
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
            <DialogFooter className="mt-5 flex justify-center gap-2 md:gap-5">
              <button
                type="button"
                className="rounded-md border-2 border-slate-400 p-2 px-5"
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
              <button
                className="rounded-md bg-[#6571FF] p-2 px-5 text-white disabled:bg-gray-400"
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
