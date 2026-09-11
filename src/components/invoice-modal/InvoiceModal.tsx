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
  open: controlledOpen,
  onOpenChange,
}: {
  invoiceId: string;
  /** Omit when the modal is driven by `open` from the parent */
  buttonChild?: React.ReactNode;
  buttonChildClassName?: string;
  isShowEdit?: boolean;
  autoOpen?: boolean;
  fromCollaboration?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(autoOpen);
  const [dataFetched, setDataFetched] = useState(autoOpen);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const handleOpenChange = (newOpen: boolean) => {
    if (!isControlled) setUncontrolledOpen(newOpen);
    if (newOpen) setDataFetched(true);
    onOpenChange?.(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {buttonChild && (
        <DialogTrigger asChild>
          <div className={buttonChildClassName}>{buttonChild}</div>
        </DialogTrigger>
      )}

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
