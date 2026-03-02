"use client";

import { useGetCompanyPermissions } from "@/hooks/feature-permissions/useGetCompanyPersmissions";
import ClientSalesAgentToggle from "./ClientSalesAgentToggle";
import { isSalesAgentEnabled } from "@/utils/permissions";

type Props = {
  companyId: number;
  clientId: number;
  initialValue: boolean;
};

export default function ClientPermissionWrapper({
  companyId,
  clientId,
  initialValue,
}: Props) {
  const { data, isLoading } = useGetCompanyPermissions(companyId);

  if (isLoading) return null;

  const enabled = isSalesAgentEnabled(data);

  if (!enabled) return null;

  return (
    <ClientSalesAgentToggle clientId={clientId} initialValue={initialValue} />
  );
}
