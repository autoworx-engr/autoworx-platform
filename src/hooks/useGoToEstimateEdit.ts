"use client";

import { useEstimateCreateStore } from "@/stores/estimate-create";
import { useRouter } from "next/navigation";

export function useGoToEstimateEdit() {
  const router = useRouter();

  return function goToEstimateEdit(
    invoiceId: string,
    clientId?: number | null,
  ) {
    useEstimateCreateStore.setState({ template: null, templateSnapshot: null });

    const query = clientId ? `?clientId=${clientId}` : "";
    router.replace(`/dashboard/estimate/edit/${invoiceId}${query}`);
  };
}
