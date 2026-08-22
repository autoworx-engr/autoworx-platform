"use client";
import { Dialog, DialogTrigger } from "@/components/Dialog";

import { useState } from "react";
import WorkOrderModalBody from "./WorkOrderModalBody";

export default function WorkOrderModal({
  invoiceId,
  buttonChild,
  onWorkOrderCreated,
}: {
  invoiceId: string;
  buttonChild: React.ReactNode;
  onWorkOrderCreated?: () => void;
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
      <DialogTrigger asChild>{buttonChild}</DialogTrigger>

      {(open || dataFetched) && (
        <WorkOrderModalBody
          open={open}
          invoiceId={invoiceId}
          setOpen={setOpen}
          onWorkOrderCreated={onWorkOrderCreated}
        />
      )}
    </Dialog>
  );
}
