import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { useCompanyQuery } from "@/hooks/useCompanyQuery";
import toast from "react-hot-toast";

const fetchSmsDelay = async (companyId: number) => {
  const response = await fetch(
    `/api/ai-train/sms-delay?companyId=${companyId}`,
  );
  if (!response.ok) {
    throw new Error("Failed to fetch SMS delay");
  }
  return response.json();
};

export function useSmsDelay() {
  const { data: company } = useCompanyQuery();
  const companyId = company?.id;
  return useQuery({
    queryKey: queryKeys.smsDelay({ companyId }),
    queryFn: () => fetchSmsDelay(companyId!),
    enabled: !!companyId,
  });
}

export function useSaveSmsDelay() {
  const queryClient = useQueryClient();
  const { data: company } = useCompanyQuery();
  const companyId = company?.id;
  return useMutation({
    mutationFn: async (payload: {
      smsResponseDelayMin: number;
      smsResponseDelayMax: number;
    }) => {
      const response = await fetch("/api/ai-train/sms-delay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, ...payload }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to save SMS delay");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.smsDelay({ companyId }),
      });
      toast.success("SMS delay saved successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save SMS delay");
    },
  });
}
