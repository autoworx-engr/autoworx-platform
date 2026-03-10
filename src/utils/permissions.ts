export const isSalesAgentEnabled = (permissions: any) => {
  const salesAgentPermission = permissions?.data?.find(
    (item: any) => item.permission_name === "sales-agent",
  );

  return salesAgentPermission?.enabled === true;
};
