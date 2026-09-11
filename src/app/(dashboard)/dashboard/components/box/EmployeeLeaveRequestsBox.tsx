import React from "react";
import { EmployeeLeaveRequest } from "./EmployeeLeaveRequest";
import getUser from "@/lib/getUser";
import { db } from "@/lib/db";
import { cn } from "@/lib/cn";
import EmployeeLeaveRequestsModal from "./EmployeeLeaveRequestsModal";
import BoxTitle from "./BoxTitle";

type LeaveRequestWithUser = {
  className?: string;
};

export default async function EmployeeLeaveRequestsBox({
  className,
}: LeaveRequestWithUser) {
  const user = await getUser();

  let pendingLeaveRequests = await db.leaveRequest.findMany({
    where: {
      companyId: user.companyId,
      status: "Pending",
    },
    include: {
      user: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Note: Unused filtering logic remains commented out for future use if needed.

  return (
    // Outer Container: Apply full Glassmorphism style
    <div
      className={cn(
        `
          flex h-full flex-1 flex-col overflow-hidden rounded-2xl p-4 transition-all duration-300 md:p-6
          bg-white/50 dark:bg-slate-900/50
          backdrop-blur-md
          ring-1 ring-slate-900/5 dark:ring-white/10
          shadow-lg dark:shadow-2xl dark:shadow-blue-900/20
          hover:shadow-xl hover:shadow-blue-500/10 dark:hover:shadow-indigo-500/10
        `,
        className,
      )}
    >
      {/* Title and Modal Button */}
      <div className="mb-4 md:mb-6 flex items-center justify-between flex-shrink-0">
        <BoxTitle title="Employee Leave Requests" />
        <EmployeeLeaveRequestsModal
          pendingLeaveRequests={pendingLeaveRequests}
        />
      </div>

      {/* List Container: Must stretch and handle overflow */}
      <div className="custom-scrollbar flex flex-1 flex-col gap-3 overflow-y-auto pr-2">
        {pendingLeaveRequests.map((leaveRequest) => (
          // Individual component will apply internal styles
          <EmployeeLeaveRequest
            key={leaveRequest.id}
            leaveRequest={leaveRequest}
          />
        ))}

        {/* Empty State Redesign: More visually appealing and premium */}
        {pendingLeaveRequests.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center py-6 px-4 text-center">
            <span
              className="text-4xl mb-2"
              role="img"
              aria-label="party popper"
            >
              🎉
            </span>
            <span className="text-lg font-semibold text-slate-700 dark:text-slate-200">
              No Pending Leave Requests
            </span>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              All clear! You're up to date with employee approvals.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
