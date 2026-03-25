import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { useCompanyQuery } from "@/hooks/useCompanyQuery";
import toast from "react-hot-toast";

const fetchOverallFaqs = async (companyId: number) => {
  const response = await fetch(`/api/ai-train/faq?companyId=${companyId}`);
  if (!response.ok) {
    throw new Error("Failed to fetch overall FAQs");
  }
  const data = await response.json();
  return data.data || [];
};

export function useOverallFaqs() {
  const { data: company } = useCompanyQuery();
  const companyId = company?.id;
  return useQuery({
    queryKey: queryKeys.overallFaqs({ companyId }),
    queryFn: () => fetchOverallFaqs(companyId!),
    enabled: !!companyId,
  });
}

export function useSaveOverallFaqs() {
  const queryClient = useQueryClient();
  const { data: company } = useCompanyQuery();
  const companyId = company?.id;
  return useMutation({
    mutationFn: async (faqs: any[]) => {
      const response = await fetch("/api/ai-train/faq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, faqs }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to save overall FAQs");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.overallFaqs({ companyId }),
      });
      toast.success("FAQs saved successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save overall FAQs");
    },
  });
}
