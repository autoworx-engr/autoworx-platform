"use client";
import { Dialog, DialogTrigger } from "@/components/Dialog";
import { useState } from "react";
import InvoiceModalBody from "./InvoiceModalBody";

export default function InvoiceModal({
  invoiceId,
  buttonChild,
  buttonChildClassName,
  isShowEdit = true,
}: {
  invoiceId: string;
  buttonChild: React.ReactNode;
  buttonChildClassName?: string;
  isShowEdit?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [dataFetched, setDataFetched] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        setOpen(newOpen);
        if (newOpen) {
          setDataFetched(true);
        }
      }}
    >
      <DialogTrigger asChild>
        <div className={buttonChildClassName}>{buttonChild}</div>
      </DialogTrigger>

      {(open || dataFetched) && (
        <InvoiceModalBody invoiceId={invoiceId} isShowEdit={isShowEdit} />
      )}
    </Dialog>
  );
}
