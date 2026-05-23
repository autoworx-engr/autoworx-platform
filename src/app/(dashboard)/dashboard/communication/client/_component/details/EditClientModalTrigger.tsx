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
      className="inline-flex items-center justify-center rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-white/10 dark:hover:text-zinc-200"
      aria-label="Edit client"
    >
      <Edit className="size-4" />
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
