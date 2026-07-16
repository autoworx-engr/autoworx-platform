"use client";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/Dialog";
import { LeaveRequest, User } from "@prisma/client";
import { useState } from "react";
import { EmployeeLeaveRequest } from "./EmployeeLeaveRequest";
import { ExternalLink } from "lucide-react";

type TEmployeeLeaveRequestsModalProps = {
  pendingLeaveRequests: (LeaveRequest & { user: User })[];
};

export default function EmployeeLeaveRequestsModal({
  pendingLeaveRequests = [],
}: TEmployeeLeaveRequestsModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className="text-xs text-primary">
          <ExternalLink />
        </button>
      </DialogTrigger>

      <DialogContent className="max-h-full max-w-xl grid-rows-[auto,1fr,auto]">
        <DialogHeader>
          <DialogTitle>Employee Leave Requests</DialogTitle>
        </DialogHeader>

        <div className="mb-8 flex items-center justify-between"></div>
        <div className="custom-scrollbar flex flex-1 flex-col space-y-4">
          {pendingLeaveRequests.map((leaveRequest, idx) => (
            <EmployeeLeaveRequest key={idx} leaveRequest={leaveRequest} />
          ))}
          {pendingLeaveRequests.length === 0 && (
            <div className="flex flex-1 items-center justify-center self-center text-center">
              <span>No Employee Leave Requests</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <DialogClose className="rounded-lg border-2 border-slate-400 p-2">
            Close
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
