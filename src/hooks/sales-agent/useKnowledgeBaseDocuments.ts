import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { useCompanyQuery } from "@/hooks/useCompanyQuery";
import toast from "react-hot-toast";

interface KBDocument {
  id: string;
  title: string;
  category: string;
  content: string;
  file_name: string | null;
  file_url: string | null;
  file_type: string | null;
  status: string;
  created_at: string;
}

interface KnowledgeBaseDocumentsResponse {
  success: boolean;
  message: string;
  data: KBDocument[];
}

const fetchKnowledgeBaseDocuments = async (
  companyId: number,
): Promise<KnowledgeBaseDocumentsResponse> => {
  const response = await fetch(
    `/api/ai-train/knowledge-base/documents?companyId=${companyId}`,
  );
  if (!response.ok) {
    throw new Error("Failed to fetch knowledge base documents");
  }
  return response.json();
};

export function useKnowledgeBaseDocuments() {
  const { data: company } = useCompanyQuery();
  const companyId = company?.id;

  return useQuery({
    queryKey: queryKeys.knowledgeBaseDocuments({ companyId }),
    queryFn: () => fetchKnowledgeBaseDocuments(companyId!),
    enabled: !!companyId,
  });
}

export function useCreateKnowledgeBaseDocument() {
  const queryClient = useQueryClient();
  const { data: company } = useCompanyQuery();
  const companyId = company?.id;

  return useMutation({
    mutationFn: async (data: {
      title: string;
      category: string;
      content: string;
      fileName?: string;
      fileType?: string;
      fileUrl?: string;
    }) => {
      const response = await fetch("/api/ai-train/knowledge-base/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          category: data.category,
          content: data.content,
          status: "indexed",
          companyId,
          fileName: data.fileName,
          fileType: data.fileType,
          fileUrl: data.fileUrl,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create document");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.knowledgeBaseDocuments({ companyId }),
      });
      toast.success("Document added to knowledge base successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add document");
    },
  });
}

export function useDeleteKnowledgeBaseDocument() {
  const queryClient = useQueryClient();
  const { data: company } = useCompanyQuery();
  const companyId = company?.id;

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(
        `/api/ai-train/knowledge-base/documents/${id}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete document");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.knowledgeBaseDocuments({ companyId }),
      });
      toast.success("Document deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete document");
    },
  });
}
