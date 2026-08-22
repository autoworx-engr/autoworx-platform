"use client";

import { Dialog, DialogTrigger } from "@/components/Dialog";
import { User } from "@prisma/client";
import { PencilLineIcon, Settings } from "lucide-react";
import { useState } from "react";
import EditClientModalBody from "./EditEmployeeModalBody";

export default function EditEmployee({
  employee,
  settingIcon = false,
}: {
  employee: User;
  settingIcon?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) setOpen(false);
        setOpen(isOpen);
      }}
    >
      <DialogTrigger asChild>
        <div className="mt-1 flex justify-end">
          <button
            className={`${settingIcon ? "text-gray-600" : ""} text-primary"`}
          >
            {settingIcon ? (
              <Settings className="w-4 h-4 text-primary" />
            ) : (
              <PencilLineIcon className="w-5 h-5 text-primary" />
            )}
          </button>
        </div>
      </DialogTrigger>
      {open && (
        <EditClientModalBody
          employee={employee}
          onClose={() => {
            setOpen(false);
          }}
        />
      )}
    </Dialog>
  );
}
