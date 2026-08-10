import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { useCompanyQuery } from "@/hooks/useCompanyQuery";
import toast from "react-hot-toast";

const fetchAiPersonality = async (companyId: number) => {
  const response = await fetch(
    `/api/ai-train/personality?companyId=${companyId}`,
  );
  if (!response.ok) {
    throw new Error("Failed to fetch AI personality");
  }
  const data = await response.json();
  return data.data || null;
};

export function useAiPersonality() {
  const { data: company } = useCompanyQuery();
  const companyId = company?.id;
  return useQuery({
    queryKey: queryKeys.aiPersonality({ companyId }),
    queryFn: () => fetchAiPersonality(companyId!),
    enabled: !!companyId,
  });
}

export function useSaveAiPersonality() {
  const queryClient = useQueryClient();
  const { data: company } = useCompanyQuery();
  const companyId = company?.id;
  return useMutation({
    mutationFn: async (payload: any) => {
      const response = await fetch("/api/ai-train/personality", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, ...payload }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to save AI personality");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.aiPersonality({ companyId }),
      });
      toast.success("AI personality saved successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save AI personality");
    },
  });
}
