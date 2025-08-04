import { useGetCurrentUser } from "@/utils/useGetCurrentUser.ts";

export const useIsAdminOrManager = () => {
  const currentUser = useGetCurrentUser();
  return (
    currentUser?.employeeType === "Admin" ||
    currentUser?.employeeType === "Manager"
  );
};
