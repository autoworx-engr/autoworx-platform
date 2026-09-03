"use client";

import { newPaymentMethod } from "@/actions/payment/newPaymentMethod";
import { updatePayment } from "@/actions/payment/updatePayment";
import { deletePaymentMethod } from "@/actions/payment/deletePaymentMethod";
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
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { cn } from "@/lib/cn";
import { errorToast, successToast } from "@/lib/toast";
import { useEstimateCreateStore } from "@/stores/estimate-create";
import { useListsStore } from "@/stores/lists";
import { formatCurrency } from "@/utils/formatCurrency";
import { PaymentMethod } from "@prisma/client";
import { PencilLineIcon } from "lucide-react";
import moment from "moment-timezone";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

type EditPaymentModalProps = {
  mergedPaymentData: any;
  invoiceGrandTotal: number;
  totalPaidForInvoice: number;
  refundedAmount?: number;
};

export default function EditPaymentModal({
  mergedPaymentData,
  invoiceGrandTotal,
  totalPaidForInvoice,
  refundedAmount = 0,
}: EditPaymentModalProps) {
  const router = useRouter();
  const { paymentMethods } = useListsStore();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const {
    setTotalPayment,
    setDeposit,
    setDue,
    grandTotal,
    deposit: currentDeposit,
    totalPayment: currentTotalPayment,
  } = useEstimateCreateStore();

  const [method, setMethod] = useState(() => {
    const { card } = mergedPaymentData || {};
    if (card?.cardType) return "CARD";
    if (
      mergedPaymentData.paymentMethod === "CHECK" ||
      mergedPaymentData.paymentMethod === "CASH" ||
      mergedPaymentData.paymentMethod === "DEPOSIT"
    )
      return mergedPaymentData.paymentMethod;
    return "OTHER";
  });

  const [date, setDate] = useState<Date>(new Date(mergedPaymentData.date));

  const originalAmount = mergedPaymentData.amount || 0;
  const netAmount = originalAmount - refundedAmount;

  // Show NET amount in the edit field
  const [amount, setAmount] = useState(netAmount);

  const [notes, setNotes] = useState(mergedPaymentData.notes);

  const [paymentMethodInput, setPaymentMethodInput] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(
    () => {
      if (
        mergedPaymentData.paymentMethod === "OTHER" &&
        mergedPaymentData.otherPaymentMethodId
      ) {
        const pm = paymentMethods.find(
          (p) => p.id === mergedPaymentData.otherPaymentMethodId,
        );
        return pm || null;
      }
      return null;
    },
  );
  const [card, setCard] = useState(mergedPaymentData?.card?.creditCard || "");
  const [cardType, setCardType] = useState(
    mergedPaymentData?.card?.cardType || "MASTERCARD",
  );
  const [check, setCheck] = useState(mergedPaymentData.checkNumber || "");
  const [cash, setCash] = useState(mergedPaymentData.cashReceived || "");
  const [depositMethod, setDepositMethod] = useState(
    mergedPaymentData.depositMethod || "",
  );
  const [depositNotes, setDepositNotes] = useState(
    mergedPaymentData.depositNotes || "",
  );

  const [openPaymentMethod, setOpenPaymentMethod] = useState(false);

  // Reset form with NET amount when modal opens
  useEffect(() => {
    if (open) {
      const methodType = mergedPaymentData.paymentMethod || "OTHER";
      setMethod(methodType);

      setDate(new Date(mergedPaymentData.date));

      // Show NET amount (original - refunded)
      const calcOriginal = mergedPaymentData.amount || 0;
      const calcNet = calcOriginal - refundedAmount;
      setAmount(calcNet);

      setNotes(mergedPaymentData.notes || "");
      setCard(mergedPaymentData?.card?.creditCard || "");
      setCardType(mergedPaymentData?.card?.cardType || "MASTERCARD");
      setCheck(mergedPaymentData.checkNumber || "");
      setCash(mergedPaymentData.cashReceived || "");
      setDepositMethod(mergedPaymentData.depositMethod || "");
      setDepositNotes(mergedPaymentData.depositNotes || "");

      if (methodType === "OTHER" && mergedPaymentData.otherPaymentMethodId) {
        const pm = paymentMethods.find(
          (p) => p.id === mergedPaymentData.otherPaymentMethodId,
        );
        setPaymentMethod(pm || null);
      } else {
        setPaymentMethod(null);
      }
    }
  }, [open, mergedPaymentData, paymentMethods, refundedAmount]);

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

  const handleSave = () => {
    startTransition(async () => {
      try {
        let additionalData = {};
        switch (method) {
          case "CARD":
            additionalData = { cardType, creditCard: card };
            break;
          case "CHECK":
            additionalData = { checkNumber: check };
            break;
          case "CASH":
            additionalData = { receivedCash: cash };
            break;
          case "OTHER":
            additionalData = { paymentMethodId: paymentMethod?.id };
            break;
          case "DEPOSIT":
            additionalData = { depositMethod, depositNotes };
            break;
          default:
            additionalData = {};
        }

        const newNetAmount = Number(amount);

        // **FIX 1: Validate NET amount is greater than zero**
        if (newNetAmount <= 0) {
          errorToast("Payment amount must be greater than zero");
          return;
        }

        // Convert NET to TOTAL for database
        const newTotalPaymentAmount = newNetAmount + refundedAmount;

        // ** Get the original NET and TOTAL amounts**
        const originalTotalAmount = mergedPaymentData.amount || 0;
        const originalNetAmount = originalTotalAmount - refundedAmount;

        // ** Calculate the NET change (what affects the invoice balance)**
        const netChange = newNetAmount - originalNetAmount;

        // ** Calculate other payments' NET contribution**
        // Subtract the original NET of this payment, not the TOTAL
        const otherPaymentsNetTotal = totalPaidForInvoice - originalNetAmount;

        // ** Calculate new total NET payments for invoice**
        const newTotalNetPayments = otherPaymentsNetTotal + newNetAmount;

        // ** Validate against invoice grand total**
        if (newTotalNetPayments > invoiceGrandTotal) {
          const maxAllowedNet = invoiceGrandTotal - otherPaymentsNetTotal;
          errorToast(
            `Net payment amount cannot exceed remaining invoice balance. Maximum allowed: ${formatCurrency(maxAllowedNet)}`,
          );
          return;
        }

        const payload = {
          id: Number(mergedPaymentData.id),
          type: method,
          date,
          notes,
          amount: newTotalPaymentAmount,
          additionalData,
        };

        const res = await updatePayment(payload);
        if (res?.type === "success") {
          const originalPaymentType = mergedPaymentData.paymentMethod;
          const isOriginalDeposit = originalPaymentType === "DEPOSIT";
          const isNewDeposit = method === "DEPOSIT";

          // Update store if editing current invoice's payment
          if (
            mergedPaymentData.invoiceId ===
            useEstimateCreateStore.getState().invoiceId
          ) {
            let newTotalPayment = currentTotalPayment;
            let newDeposit = currentDeposit;

            // Use NET change for store updates**
            if (isOriginalDeposit && isNewDeposit) {
              // Deposit to Deposit: adjust deposit amount using NET change
              newDeposit = currentDeposit + netChange;
              setDeposit(newDeposit);
              const newDue = grandTotal - (newDeposit + currentTotalPayment);
              setDue(newDue);
            } else if (isOriginalDeposit && !isNewDeposit) {
              // Deposit to Payment: move from deposit to payment
              newDeposit = currentDeposit - originalNetAmount;
              newTotalPayment = currentTotalPayment + newNetAmount;
              setDeposit(newDeposit);
              setTotalPayment(newTotalPayment);
              const newDue = grandTotal - (newDeposit + newTotalPayment);
              setDue(newDue);
            } else if (!isOriginalDeposit && isNewDeposit) {
              // Payment to Deposit: move from payment to deposit
              newTotalPayment = currentTotalPayment - originalNetAmount;
              newDeposit = currentDeposit + newNetAmount;
              setTotalPayment(newTotalPayment);
              setDeposit(newDeposit);
              const newDue = grandTotal - (newDeposit + newTotalPayment);
              setDue(newDue);
            } else {
              // Payment to Payment: adjust payment amount using NET change
              newTotalPayment = currentTotalPayment + netChange;
              setTotalPayment(newTotalPayment);
              const newDue = grandTotal - (currentDeposit + newTotalPayment);
              setDue(newDue);
            }
          }

          successToast("Payment updated successfully");
          setOpen(false);

          // Refresh the server data
          router.refresh();
        }

        // else if (res?.type === "globalError") {
        //   errorToast(
        //     res?.errorSource?.length ? res.errorSource[0].message : res.message
        //   );
        // }
      } catch (err) {
        console.error(err);
        errorToast("Unexpected error occurred");
      }
    });
  };

  // **Calculate maximum allowed NET amount**
  const currentNetAmount = originalAmount - refundedAmount;
  const otherPaymentsNet = totalPaidForInvoice - currentNetAmount;
  // const maxAllowedNetAmount = invoiceGrandTotal - otherPaymentsNet;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-primary underline"
      >
        <PencilLineIcon className="h-5 w-5" />
      </button>

      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit Payment</DialogTitle>
          <DialogClose />
        </DialogHeader>

        <form className="mt-5 space-y-6" autoComplete="off">
          {/* Type Buttons */}
          <div className="flex flex-wrap gap-2">
            {["CARD", "CHECK", "CASH", "OTHER", "DEPOSIT"].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setMethod(t)}
                className={cn(
                  "rounded-md px-4 py-2 text-sm font-medium transition-all",
                  method === t
                    ? "bg-primary text-white"
                    : "border border-primary text-primary hover:bg-primary/10",
                )}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Common Fields */}
          <div className="grid grid-cols-2 gap-3">
            <SlimInput
              name="date"
              label="Date"
              type="date"
              value={moment(date).format("YYYY-MM-DD")}
              onChange={(e) => setDate(new Date(e.target.value))}
            />
            <div>
              <SlimInput
                label={"Amount"}
                name="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value as unknown as number)}
                step="0.01"
                min="0.01"
              />
            </div>
          </div>

          {/* Conditional Fields */}
          {method === "CARD" && (
            <>
              <SlimInput
                label="Card (Last 4 digits)"
                name="card"
                autoComplete="off"
                data-lpignore="true"
                data-1p-ignore
                data-form-type="other"
                value={card}
                onChange={(e) => setCard(e.target.value)}
              />
              <div className="flex flex-wrap gap-3">
                {["MASTERCARD", "VISA", "AMEX", "OTHER"].map((t) => (
                  <label key={t} className="flex items-center gap-1">
                    <input
                      type="radio"
                      name="cardType"
                      checked={cardType === t}
                      onChange={() => setCardType(t)}
                    />
                    {t}
                  </label>
                ))}
              </div>
            </>
          )}

          {method === "CHECK" && (
            <SlimInput
              label="Check #"
              name="check"
              value={check}
              onChange={(e) => setCheck(e.target.value)}
            />
          )}

          {method === "CASH" && (
            <SlimInput
              label="Cash Received"
              name="cash"
              placeholder="Enter received by"
              value={cash}
              onChange={(e) => setCash(e.target.value)}
            />
          )}

          {method === "OTHER" && (
            <Selector
              label={(pm) => pm?.name || "Payment Method"}
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
              onSearch={(search: string) =>
                paymentMethods.filter((method) =>
                  method.name.toLowerCase().includes(search.toLowerCase()),
                )
              }
              items={paymentMethods}
              selectedItem={paymentMethod}
              setSelectedItem={setPaymentMethod}
              displayList={(pm) => <p>{pm.name}</p>}
              openState={[openPaymentMethod, setOpenPaymentMethod]}
              onRemoveItem={handleRemovePaymentMethod}
            />
          )}

          {method === "DEPOSIT" && (
            <>
              <SlimInput
                label="Deposit Method"
                name="depositMethod"
                value={depositMethod}
                onChange={(e) => setDepositMethod(e.target.value)}
              />
              <div className="mt-3">
                <label className="mb-1 block text-sm font-medium">
                  Deposit Notes
                </label>
                <textarea
                  className="w-full rounded-md border p-2 outline-none"
                  placeholder="Deposit Notes"
                  value={depositNotes}
                  onChange={(e) => setDepositNotes(e.target.value)}
                />
              </div>
            </>
          )}

          {method !== "DEPOSIT" && (
            <textarea
              className="mt-3 w-full rounded-md border p-2 outline-none"
              placeholder="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          )}

          <DialogFooter className="mt-5 flex justify-end gap-3">
            <button
              type="button"
              className="rounded-md border border-slate-400 px-5 py-2"
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={handleSave}
              className="rounded-md bg-primary px-5 py-2 text-white disabled:bg-gray-400"
            >
              {pending ? "Saving..." : "Save Changes"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
