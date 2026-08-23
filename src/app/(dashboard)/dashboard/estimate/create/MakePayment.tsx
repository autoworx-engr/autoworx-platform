import { checkInventoryForInvoiceSave } from "@/actions/estimate/invoice/checkInventory";
import type { InventoryShortage } from "@/actions/estimate/invoice/checkInventory";
import {
  checkInventoryForPayment,
  type InventoryCheckResult,
} from "@/actions/estimate/invoice/checkInventoryForPayment";
import { notifyInventoryShortage } from "@/actions/estimate/invoice/notifyInventoryShortage";
import InventoryShortageDialog from "@/components/inventory/InventoryShortageDialog";
import { useInventoryConfirm } from "@/hooks/useInventoryConfirm";
import { paymentLeadsConvertion } from "@/actions/estimate/invoice/paymentLeadsConvertion";
import { newPayment } from "@/actions/payment/newPayment";
import { newPaymentMethod } from "@/actions/payment/newPaymentMethod";
import { deletePaymentMethod } from "@/actions/payment/deletePaymentMethod";
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
import { formatAmount, useAmountField } from "@/hooks/useAmountField";
import { useCompanyQuery } from "@/hooks/useCompanyQuery";
import { useCompanyTimezone } from "@/hooks/useCompanyTimezone";
import { useInvoiceCreate } from "@/hooks/useInvoiceCreate";
import { cn } from "@/lib/cn";
import { errorToast, successToast } from "@/lib/toast";
import { useEstimateCreateStore } from "@/stores/estimate-create";
import { useListsStore } from "@/stores/lists";
import { additionalDataValidation } from "@/validations/schemas/payment/payment.validation";
import {
  CardType,
  InvoiceType,
  PaymentMethod,
  PaymentType,
} from "@prisma/client";
import * as Tabs from "@radix-ui/react-tabs";
import { CreditCard } from "lucide-react";
import moment from "moment-timezone";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
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
    items,
    paymentModalOpen,
    setPaymentModalOpen,
  } = useEstimateCreateStore();
  const createInvoice = useInvoiceCreate("Invoice");
  const router = useRouter();
  const pathaname = usePathname();
  const [pending, startTransition] = useTransition();
  const isEditPage = pathaname?.includes("/dashboard/estimate/edit/");
  const { runWithInventoryCheck, dialogProps: inventoryDialogProps } =
    useInventoryConfirm();

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("CARD");
  const [paymentMethodInput, setPaymentMethodInput] = useState("");

  const [date, setDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState("");
  const [card, setCard] = useState("");
  const [cardType, setCardType] = useState("MASTERCARD");
  const [check, setCheck] = useState("");
  const [cash, setCash] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(
    null,
  );

  const { data: company } = useCompanyQuery();
  const companyName = company?.name ?? "";

  // Cash is received by the shop, so a new payment defaults to the company
  // name. An existing payment keeps whatever was saved, blank included.
  useEffect(() => {
    if (!companyName || payment) return;
    setCash((prev) => prev || companyName);
  }, [companyName, payment]);

  const [openPaymentMethod, setOpenPaymentMethod] = useState(false);

  const [depositMethod, setDepositMethod] = useState<string>("");
  const [depositNotes, setDepositNotes] = useState<string>("");

  const isDueZero = due === 0 ? true : false;

  const {
    value: amount,
    setValue: setAmount,
    error: amountError,
    inputProps: amountInputProps,
  } = useAmountField(0, "Amount");

  const {
    value: deposit,
    setValue: setDeposit,
    error: depositError,
    inputProps: depositInputProps,
  } = useAmountField(0, "Deposit amount");

  function reset() {
    setTab("CARD");
    setDate(new Date());
    setNotes("");
    setCard("");
    setCardType("MASTERCARD");
    setCheck("");
    setCash(companyName);
    setAmount(0);
    setDeposit(0);
    setDepositNotes("");
  }

  async function handleSubmit(
    allowInsufficientInventory: boolean = false,
    confirmedShortages: InventoryShortage[] = [],
  ) {
    const roundedDue = formatAmount(due);

    if (tab === "DEPOSIT") {
      if (depositError) {
        errorToast(depositError);
        return;
      }

      if (formatAmount(deposit) > roundedDue) {
        errorToast("Deposit amount cannot be greater than due amount");
        return;
      }

      if (depositMethod === "") {
        errorToast("Deposit method is required");
        return;
      }
    } else {
      if (amountError) {
        errorToast(amountError);
        return;
      }

      if (formatAmount(amount) > roundedDue) {
        errorToast(`amount exceeds the due of $${roundedDue}`);
        return;
      }
    }

    const roundedAmount = formatAmount(amount);

    try {
      await additionalDataValidation.parseAsync({
        creditCard: card,
        cardType: cardType ? (cardType as CardType) : "MASTERCARD",
        checkNumber: check,
        receivedCash: cash,
        paymentMethodId: paymentMethod?.id,
      });
      // Taking a payment normally converts the estimate to an invoice, saves
      // the invoice and draws its materials out of the inventory. When there
      // isn't enough stock the server rejects that whole save, which used to
      // block the payment too — so check first and, if stock is short, record
      // the payment alone and leave the estimate untouched.
      const inventory: InventoryCheckResult = isEditPage
        ? await checkInventoryForPayment({
            invoiceId,
            materials: items.flatMap((item) => item.materials ?? []),
          })
        : { sufficient: true, shortages: [] };

      // On the create page there is no saved estimate to fall back to — the
      // payment needs an invoice, and create.ts rejects the whole save when the
      // stock is short. So warn first and let the user go ahead knowingly
      // instead of handing them "not enough in the inventory".
      if (!isEditPage && !allowInsufficientInventory) {
        const newInvoiceInventory = await checkInventoryForInvoiceSave({
          invoiceId,
          materials: items.flatMap((item) => item.materials ?? []),
          targetType: InvoiceType.Invoice,
        });

        if (!newInvoiceInventory.sufficient) {
          // Already checked — hand the result straight to the warning dialog,
          // which re-runs this submit with the shortage allowed on confirm.
          await runWithInventoryCheck(
            async () => newInvoiceInventory,
            () => handleSubmit(true, newInvoiceInventory.shortages),
          );
          return;
        }
      }

      const fromPayment = true;
      let res1: any = { type: "success" };

      if (inventory.sufficient) {
        res1 = await createInvoice(fromPayment, allowInsufficientInventory);

        if (res1 && res1.type === "globalError") {
          errorToast(
            res1?.errorSource?.length
              ? res1.errorSource[0].message
              : res1.message,
          );
          return;
        }
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
            convertToInvoice: inventory.sufficient,
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
            convertToInvoice: inventory.sufficient,
          });
          if (res3?.type === "success") {
            setDue(due - Number(deposit));
            setDEPOSIT(DEPOSIT + Number(deposit));
          }
        }
      }

      if (res2?.type === "success" || res3?.type === "success") {
        await paymentLeadsConvertion(invoiceId);
        handleOpenChange(false);
        successToast("Payment recorded successfully");
        if (!inventory.sufficient) {
          errorToast(
            `Payment only — not enough inventory for ${inventory.shortages
              .map(
                (item) =>
                  `${item.name} (need ${item.required}, ${item.available} in stock)`,
              )
              .join(
                ", ",
              )}. The estimate was not converted and the inventory was not updated.`,
            { id: "inventory-shortage" },
          );

          // The conversion was skipped, so the server never ran its own
          // lowInventoryNotification — tell the admins/managers here instead,
          // otherwise nobody learns these products need restocking.
          // Fire-and-forget: the server action completes even without awaiting.
          notifyInventoryShortage({
            invoiceId,
            shortages: inventory.shortages,
          }).catch((err) =>
            console.error("notifyInventoryShortage failed", err),
          );
        }

        // The user was warned and chose "Proceed anyway", so create.ts let the
        // shortage through without raising it — report it here instead.
        if (allowInsufficientInventory && confirmedShortages.length) {
          notifyInventoryShortage({
            invoiceId,
            shortages: confirmedShortages,
            reason: "saved-anyway",
          }).catch((err) =>
            console.error("notifyInventoryShortage failed", err),
          );
        }
        reset();
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

  async function handleRemovePaymentMethod(
    item: PaymentMethod,
    e: React.MouseEvent,
  ) {
    try {
      const res = await deletePaymentMethod(item.id);
      if (res.type === "success") {
        useListsStore.setState((state) => ({
          paymentMethods: state.paymentMethods.filter((m) => m.id !== item.id),
        }));
        if (paymentMethod?.id === item.id) {
          setPaymentMethod(null);
        }
        successToast("Payment method deleted");
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
    const dueAmount = formatAmount(due);
    setAmount(isNaN(dueAmount) ? "" : dueAmount);
    setDeposit(isNaN(dueAmount) ? "" : dueAmount);
  };

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setPaymentModalOpen(false);
  }

  // Other parts of the page (e.g. blocking a "Delivered" status change while
  // there is an outstanding balance) ask for this dialog through the store.
  useEffect(() => {
    if (!paymentModalOpen) return;
    openMakePaymentDialog();
    setOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentModalOpen]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
        <form noValidate>
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
                      "h-20 max-h-28 w-full rounded-md border-2 border-slate-400 p-2 outline-none",
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
                  {...amountInputProps}
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
                    placeholder="Enter received by"
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
                          paymentMethodInput ? "bg-primary" : "bg-slate-400",
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
                  onRemoveItem={handleRemovePaymentMethod}
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
                    {...amountInputProps}
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
                className="rounded-xl px-5 py-2.5 text-sm font-medium text-slate-500 
                hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800
                transition-colors border"
                onClick={() => handleOpenChange(false)}
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

            <InventoryShortageDialog {...inventoryDialogProps} />
          </Tabs.Root>
        </form>
      </DialogContent>
    </Dialog>
  );
}
