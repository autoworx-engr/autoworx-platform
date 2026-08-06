export const isSalesAgentEnabled = (permissions: any) => {
  const salesAgentPermission = permissions?.data?.find(
    (item: any) => item.permission_name === "sales-agent",
  );

  return salesAgentPermission?.enabled === true;
};

// `canAccessEstimate` lived here but only looked at the user-permission column,
// so it stayed true when the company's `estimateInvoices` feature was switched
// off. Use `useCanAccessRoute("/dashboard/estimate")` instead — it runs both
// checks, the same pair the route guard uses.
