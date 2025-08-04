import React from "react";
import { EmployeeLeaveRequest } from "./EmployeeLeaveRequest";
import getUser from "@/lib/getUser";
import { db } from "@/lib/db";
import { cn } from "@/lib/cn";
import EmployeeLeaveRequestsModal from "./EmployeeLeaveRequestsModal";

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

  //   let filteredLeaveRequests = [];

  // if current user is Manager, then he should not be shown leave requests of other Managers
  // only Admin can approve Manager's leave requests
  // TODO: This code is unused
  //   if (user.employeeType === "Manager") {
  //     for (const leaveRequest of pendingLeaveRequests) {
  //       if (leaveRequest.user.employeeType !== "Manager") {
  //         filteredLeaveRequests.push(leaveRequest);
  //       }
  //     }
  //   } else {
  //     filteredLeaveRequests = pendingLeaveRequests;
  //   }
  return (
    <div className={cn("h-full flex-1 overflow-y-auto shadow-md", className)}>
      {" "}
      <div className={`flex h-full flex-col rounded-md p-6 shadow-lg`}>
        <div className="mb-4 flex items-center justify-between">
          <span className="text-xl font-bold">Reputation Management</span>
          <EmployeeLeaveRequestsModal
            pendingLeaveRequests={pendingLeaveRequests}
          />
        </div>
        <div className="custom-scrollbar flex flex-1 flex-col space-y-4">
          {pendingLeaveRequests.map((leaveRequest, idx) => (
            <EmployeeLeaveRequest key={idx} leaveRequest={leaveRequest} />
          ))}
          {pendingLeaveRequests.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center py-2 text-center">
              <div className="relative">
                <span className="animate-gradient-x bg-gradient-to-r from-blue-600 to-teal-500 bg-clip-text text-xl font-semibold text-transparent">
                  Something Great is Coming...
                </span>
                <span className="absolute -bottom-1 left-0 h-0.5 w-full animate-pulse bg-gradient-to-r from-blue-600 to-teal-500"></span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
