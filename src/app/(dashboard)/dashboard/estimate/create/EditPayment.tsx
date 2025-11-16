"use client";

import { newPaymentMethod } from "@/actions/payment/newPaymentMethod";
import { updatePayment } from "@/actions/payment/updatePayment";
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
import { errorToast } from "@/lib/toast";
import { useListsStore } from "@/stores/lists";
import { PaymentMethod } from "@prisma/client";
import { SquarePen } from "lucide-react";
import moment from "moment-timezone";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";

// type EditPaymentModalProps = {
//   paymentData: {
//     invoicesWithFull;
//     allTransactionEntries;
//   };
// };

export default function EditPaymentModal({
  allTransactionEntries,
  invoicesWithFull,
}: {
  invoicesWithFull: any;
  allTransactionEntries: any;
}) {
  const { paymentMethods } = useListsStore();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const mergedPaymentData = {
    id: invoicesWithFull?.[0]?.id,
    invoiceId: invoicesWithFull?.[0]?.id,
    amount: allTransactionEntries?.[0]?.amount || 0,
    date: allTransactionEntries?.[0]?.date || new Date(),
    notes:
      allTransactionEntries?.[0]?.notes || invoicesWithFull?.[0]?.notes || "",
    type:
      // invoicesWithFull?.[0]?.paymentMethod ||
      allTransactionEntries?.[0]?.type || "CARD",
    card: {
      creditCard: invoicesWithFull?.[0]?.paymentMethodInfo?.creditCard || "",
      cardType: invoicesWithFull?.[0]?.paymentMethodInfo?.cardType || "",
    },
    checkNumber: invoicesWithFull?.[0]?.paymentMethodInfo?.checkNumber || "",
    cashReceived: invoicesWithFull?.[0]?.paymentMethodInfo?.cashReceived || "",
    deposit: invoicesWithFull?.[0]?.paymentMethodInfo?.depositAmount || 0,
    depositMethod:
      invoicesWithFull?.[0]?.paymentMethodInfo?.depositMethod || "",
    depositNotes: invoicesWithFull?.[0]?.paymentMethodInfo?.depositNotes || "",
    paymentMethod: invoicesWithFull?.[0]?.paymentMethod || null,
    paymementId: invoicesWithFull?.[0]?.paymentId || null,
  };

  console.log("✅ Invoices with Full:", invoicesWithFull);
  console.log("✅ All Transaction Entries:", allTransactionEntries);

  console.log("✅ Merged Payment Data:", mergedPaymentData);

  // const [method, setMethod] = useState(mergedPaymentData.type);
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
  console.log("payment method ==>", method);
  const [date, setDate] = useState<Date>(new Date(mergedPaymentData.date));
  const [amount, setAmount] = useState(mergedPaymentData.amount);
  const [notes, setNotes] = useState(mergedPaymentData.notes);
  const [paymentMethodInput, setPaymentMethodInput] = useState("");

  const [card, setCard] = useState(mergedPaymentData.card.creditCard);
  const [cardType, setCardType] = useState(
    mergedPaymentData.card.cardType || "MASTERCARD"
  );
  const [check, setCheck] = useState(mergedPaymentData.checkNumber);
  const [cash, setCash] = useState(mergedPaymentData.cashReceived);
  const [deposit, setDeposit] = useState(mergedPaymentData.deposit);
  const [depositMethod, setDepositMethod] = useState(
    mergedPaymentData.depositMethod
  );
  const [depositNotes, setDepositNotes] = useState(
    mergedPaymentData.depositNotes
  );

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(
    mergedPaymentData.paymentMethod
  );
  const [openPaymentMethod, setOpenPaymentMethod] = useState(false);

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

  // ✅ Handle save
  // const handleSave = () => {
  //   startTransition(() => {
  //     const updatedData = {
  //       transactionId: mergedPaymentData.id,
  //       invoiceId: mergedPaymentData.invoiceId,
  //       amount: parseFloat(amount.toString()),
  //       date,
  //       notes,
  //       type: method,
  //       paymentInfo:
  //         method === "CARD"
  //           ? { cardType, creditCard: card }
  //           : method === "CHECK"
  //             ? { checkNumber: check }
  //             : method === "CASH"
  //               ? { cashReceived: cash }
  //               : method === "OTHER"
  //                 ? { paymentMethodId: paymentMethod?.id }
  //                 : method === "DEPOSIT"
  //                   ? {
  //                       depositAmount: deposit,
  //                       depositMethod,
  //                       depositNotes,
  //                     }
  //                   : {},
  //     };

  //     console.log("✅ Updated merged payment:", updatedData);

  //     // Here you’ll send this updatedData to your update API endpoint
  //     setOpen(false);
  //   });
  // };

  const handleSave = () => {
    startTransition(async () => {
      try {
        const payload = {
          id: Number(mergedPaymentData.paymementId), // payment ID
          type: method,
          date,
          notes,
          amount: parseFloat(amount.toString()),
          additionalData:
            method === "CARD"
              ? { cardType, creditCard: card }
              : method === "CHECK"
                ? { checkNumber: check }
                : method === "CASH"
                  ? { receivedCash: cash }
                  : method === "OTHER"
                    ? { paymentMethodId: paymentMethod?.id }
                    : method === "DEPOSIT"
                      ? {
                          depositMethod,
                          depositNotes,
                        }
                      : {},
        };

        console.log("🔄 Sending Payload To updatePayment:", payload);

        const res = await updatePayment(payload);

        if (res.type === "success") {
          console.log("🎉 Payment Updated:", res.data);
          toast.success("Payment updated successfully");
          setOpen(false);
        } else {
          errorToast(res.message || "Update failed");
        }
      } catch (err) {
        console.error(err);
        errorToast("Unexpected error occurred");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        onClick={() => setOpen(true)}
        className="text-[#6571FF] underline flex items-center gap-1"
      >
        <SquarePen className="w-5 h-5" />
        Edit Payment
      </button>

      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit Payment</DialogTitle>
          <DialogClose />
        </DialogHeader>

        <form className="space-y-6 mt-5">
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
                    ? "bg-[#6571FF] text-white"
                    : "border border-[#6571FF] text-[#6571FF] hover:bg-[#6571FF]/10"
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
            <SlimInput
              label="Amount"
              name="amount"
              type="number"
              value={amount}
              // readonly={true}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {/* Conditional Fields */}
          {method === "CARD" && (
            <>
              <SlimInput
                label="Card (Last 4 digits)"
                name="card"
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
                      paymentMethodInput ? "bg-slate-700" : "bg-slate-400"
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
                  method.name.toLowerCase().includes(search.toLowerCase())
                )
              }
              items={paymentMethods}
              selectedItem={paymentMethod}
              setSelectedItem={setPaymentMethod}
              displayList={(pm) => <p>{pm.name}</p>}
              openState={[openPaymentMethod, setOpenPaymentMethod]}
            />
          )}

          {method === "DEPOSIT" && (
            <>
              <SlimInput
                label="Deposit Amount"
                name="deposit"
                value={deposit}
                onChange={(e) => setDeposit(e.target.value)}
              />
              <SlimInput
                label="Deposit Method"
                name="depositMethod"
                value={depositMethod}
                onChange={(e) => setDepositMethod(e.target.value)}
              />
              <textarea
                className="mt-3 w-full rounded-md border p-2 outline-none"
                placeholder="Deposit Notes"
                value={depositNotes}
                onChange={(e) => setDepositNotes(e.target.value)}
              />
            </>
          )}

          <textarea
            className="mt-3 w-full rounded-md border p-2 outline-none"
            placeholder="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

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
              className="rounded-md bg-[#6571FF] px-5 py-2 text-white disabled:bg-gray-400"
            >
              Save Changes
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
