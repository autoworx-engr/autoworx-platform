import { PermissionsResult } from "@/lib/getPermissions";

export const isSalesAgentEnabled = (permissions: any) => {
  const salesAgentPermission = permissions?.data?.find(
    (item: any) => item.permission_name === "sales-agent",
  );

  return salesAgentPermission?.enabled === true;
};

export const canAccessEstimate = (
  permissions: PermissionsResult | null | undefined,
) => {
  if (!permissions || permissions.role === "Admin") {
    return true;
  }

  const companyPermission = permissions.companyPermissions as Record<
    string,
    boolean
  > | null;
  const userPermission = permissions.userPermissions as Record<
    string,
    boolean
  > | null;

  const hasCompanyPermission = Boolean(companyPermission?.estimatesInvoices);

  if (!hasCompanyPermission) {
    return false;
  }

  if (!userPermission) {
    return true;
  }

  return Boolean(userPermission.estimatesInvoices);
};
