import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { useCompanyQuery } from "@/hooks/useCompanyQuery";
import toast from "react-hot-toast";

const fetchCompanyKnowledge = async (companyId: number) => {
  const response = await fetch(
    `/api/ai-train/company-knowledge?companyId=${companyId}`,
  );
  if (!response.ok) {
    throw new Error("Failed to fetch company knowledge");
  }
  const data = await response.json();
  return data.data || null;
};

export function useCompanyKnowledge() {
  const { data: company } = useCompanyQuery();
  const companyId = company?.id;
  return useQuery({
    queryKey: queryKeys.companyKnowledge({ companyId }),
    queryFn: () => fetchCompanyKnowledge(companyId!),
    enabled: !!companyId,
  });
}

export function useSaveCompanyKnowledge() {
  const queryClient = useQueryClient();
  const { data: company } = useCompanyQuery();
  const companyId = company?.id;
  return useMutation({
    mutationFn: async (payload: any) => {
      // Always use POST for upsert
      const response = await fetch("/api/ai-train/company-knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, ...payload }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to save company knowledge");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.companyKnowledge({ companyId }),
      });
      toast.success("Company knowledge saved successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save company knowledge");
    },
  });
}
