"use client";

import { useSession } from "next-auth/react";

/** Only admins and managers get the calendar panel's "Users" tab. */
export function useIsAdminOrManager() {
  const { data } = useSession();
  return (
    data?.user?.employeeType === "Admin" ||
    data?.user?.employeeType === "Manager"
  );
}
