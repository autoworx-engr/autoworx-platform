"use client";

import { getEntitlements } from "@/actions/platform-billing/entitlements";
import { useServerGet } from "@/hooks/useServerGet";
import ClientSalesAgentToggle from "./ClientSalesAgentToggle";

type Props = {
  companyId: number;
  clientId: number;
  initialValue: boolean;
  companyIsSalesAgent?: boolean;
};

export default function ClientPermissionWrapper({
  companyId,
  clientId,
  initialValue,
  companyIsSalesAgent = true,
}: Props) {
  const { data: entitlementsRes, loading } = useServerGet(
    getEntitlements,
    companyId,
  );

  if (loading) return null;

  const planEnabled =
    entitlementsRes?.success === true &&
    Boolean(entitlementsRes.data?.awxSalesAgent);

  return (
    <ClientSalesAgentToggle
      clientId={clientId}
      initialValue={initialValue}
      isRestricted={!planEnabled || !companyIsSalesAgent}
    />
  );
}
