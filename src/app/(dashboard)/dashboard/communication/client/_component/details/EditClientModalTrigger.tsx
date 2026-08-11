"use client";

import EditClientModalBody from "@/app/(dashboard)/dashboard/client/EditClientModalBody";
import { Dialog, DialogTrigger } from "@/components/Dialog";
import { Client } from "@prisma/client";
import { PencilLineIcon } from "lucide-react";
import { useState } from "react";

type TProps = {
  client: Client;
};

export default function EditClientModalTrigger({ client }: TProps) {
  const state = useState(false);
  const [open, setOpen] = state;

  const trigger = (
    <button
      type="button"
      className="ml-1 inline-flex items-center justify-center rounded-full p-1 hover:bg-white/10"
      aria-label="Edit client"
    >
      <PencilLineIcon className="size-5 text-white/90" />
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={(val) => setOpen(val)}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      {open && (
        <EditClientModalBody
          key={client.id}
          client={client as any}
          onClose={() => setOpen(false)}
        />
      )}
    </Dialog>
  );
}
