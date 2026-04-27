"use client";

import { Dialog, DialogTrigger } from "@/components/Dialog";
import EditClientModalBody from "@/app/(dashboard)/dashboard/client/EditClientModalBody";
import { Client } from "@prisma/client";
import { useState } from "react";
import { Edit } from "lucide-react";

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
      <Edit className="size-5 text-white/90" />
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
