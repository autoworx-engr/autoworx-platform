"use client";
import { Dialog, DialogTrigger } from "@/components/Dialog";
import InvoiceModalBody from "@/components/invoice-modal/InvoiceModalBody";
import Image from "next/image";
import { useState } from "react";

type TProps = {
  invoiceId: string | null;
};
export default function PipelineInvoiceModal({ invoiceId }: TProps) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Image
          src="/icons/estimateDone.png"
          alt="draftEstimateDone"
          width={14}
          height={14}
          className="mt-1.5"
        />
      </DialogTrigger>

      {invoiceId && <InvoiceModalBody invoiceId={invoiceId} />}
    </Dialog>
  );
}
