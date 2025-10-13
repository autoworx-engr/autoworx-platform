"use client";

import { Dialog, DialogTrigger } from "@/components/Dialog";
import { useFormErrorStore } from "@/stores/form-error";
import { Client, Source, Tag } from "@prisma/client";
import { Settings, SquarePen } from "lucide-react";
import { useState } from "react";
import EditClientModalBody from "./EditClientModalBody";

export default function EditCustomer({
  client,
  settingIcon = false,
}: {
  client: Client & {
    tag: Tag | null;
    source: Source | null;
  };
  settingIcon?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { clearError } = useFormErrorStore();

  const handleClose = () => {
    clearError(); // ✅ Reset form errors when closing
    // setProfilePic(null); // ✅ Reset profile picture
    setOpen(false);
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(isOpen) => {
          if (!isOpen) handleClose();
          setOpen(isOpen);
        }}
      >
        <DialogTrigger asChild>
          <button
            className={`${settingIcon ? "text-gray-600" : ""} text-[#6571FF]"`}
          >
            {settingIcon ? (
              <Settings className="w-4 h-4 text-[#6571FF]" />
            ) : (
              <SquarePen className="w-5 h-5 text-[#6571FF]" />
            )}
          </button>
        </DialogTrigger>
        {open && (
          <EditClientModalBody client={client} onClose={() => setOpen(false)} />
        )}
      </Dialog>
    </>
  );
}
