"use client";
import { Dialog, DialogTrigger } from "@/components/Dialog";
import { useState } from "react";
import InvoiceModalBody from "./InvoiceModalBody";

export default function InvoiceModal({
  invoiceId,
  buttonChild,
  buttonChildClassName,
  isShowEdit = true,
  autoOpen = false,
  fromCollaboration = false,
}: {
  invoiceId: string;
  buttonChild: React.ReactNode;
  buttonChildClassName?: string;
  isShowEdit?: boolean;
  autoOpen?: boolean;
  fromCollaboration?: boolean;
}) {
  const [open, setOpen] = useState(autoOpen);
  const [dataFetched, setDataFetched] = useState(autoOpen);

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
        <InvoiceModalBody
          invoiceId={invoiceId}
          isShowEdit={isShowEdit}
          fromCollaboration={fromCollaboration}
        />
      )}
    </Dialog>
  );
}
