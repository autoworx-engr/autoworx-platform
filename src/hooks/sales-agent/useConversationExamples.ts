import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { useCompanyQuery } from "@/hooks/useCompanyQuery";
import toast from "react-hot-toast";

interface ConversationExample {
  id: string;
  imageUrl: string;
  extracted_text: string | null;
  notes: string | null;
  createdAt: string;
}

interface ConversationExamplesResponse {
  success: boolean;
  message: string;
  data: ConversationExample[];
}

const fetchConversationExamples = async (
  companyId: number,
): Promise<ConversationExamplesResponse> => {
  const response = await fetch(
    `/api/ai-train/conversation-examples?companyId=${companyId}`,
  );
  if (!response.ok) {
    throw new Error("Failed to fetch conversation examples");
  }
  return response.json();
};

export function useConversationExamples() {
  const { data: company } = useCompanyQuery();
  const companyId = company?.id;

  return useQuery({
    queryKey: queryKeys.conversationExamples({ companyId }),
    queryFn: () => fetchConversationExamples(companyId!),
    enabled: !!companyId,
  });
}

export function useCreateConversationExample() {
  const queryClient = useQueryClient();
  const { data: company } = useCompanyQuery();
  const companyId = company?.id;

  return useMutation({
    mutationFn: async (data: {
      imageUrl: string;
      extractedText?: string;
      notes?: string;
    }) => {
      const response = await fetch("/api/ai-train/conversation-examples", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          imageUrl: data.imageUrl,
          extractedText: data.extractedText,
          notes: data.notes,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.message || "Failed to create conversation example",
        );
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversationExamples({ companyId }),
      });
      toast.success("Conversation example uploaded successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to upload conversation example");
    },
  });
}

export function useUpdateConversationExample() {
  const queryClient = useQueryClient();
  const { data: company } = useCompanyQuery();
  const companyId = company?.id;

  return useMutation({
    mutationFn: async (data: { id: string; notes: string }) => {
      const response = await fetch(
        `/api/ai-train/conversation-examples/${data.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            notes: data.notes,
          }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.message || "Failed to update conversation example",
        );
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversationExamples({ companyId }),
      });
      toast.success("Notes updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update notes");
    },
  });
}

export function useDeleteConversationExample() {
  const queryClient = useQueryClient();
  const { data: company } = useCompanyQuery();
  const companyId = company?.id;

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(
        `/api/ai-train/conversation-examples/${id}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.message || "Failed to delete conversation example",
        );
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversationExamples({ companyId }),
      });
      toast.success("Conversation example deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete conversation example");
    },
  });
}
