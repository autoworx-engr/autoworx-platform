"use client";
import { Dialog, DialogTrigger } from "@/components/Dialog";

import { useState } from "react";
import WorkOrderModalBody from "./WorkOrderModalBody";

export default function WorkOrderModal({
  invoiceId,
  buttonChild,
  onWorkOrderCreated,
  open: controlledOpen,
  onOpenChange,
}: {
  invoiceId: string;
  buttonChild?: React.ReactNode;
  onWorkOrderCreated?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [dataFetched, setDataFetched] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const handleOpenChange = (newOpen: boolean) => {
    if (!isControlled) setUncontrolledOpen(newOpen);
    if (newOpen) setDataFetched(true);
    onOpenChange?.(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {buttonChild && <DialogTrigger asChild>{buttonChild}</DialogTrigger>}

      {(open || dataFetched) && (
        <WorkOrderModalBody
          open={open}
          invoiceId={invoiceId}
          setOpen={handleOpenChange}
          onWorkOrderCreated={onWorkOrderCreated}
        />
      )}
    </Dialog>
  );
}
