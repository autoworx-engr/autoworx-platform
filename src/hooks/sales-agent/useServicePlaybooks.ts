import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { useCompanyQuery } from "@/hooks/useCompanyQuery";
import toast from "react-hot-toast";

interface PlaybookParams {
  search?: string;
  categoryId?: number;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

interface PlaybookResponse {
  success: boolean;
  message: string;
  data: any[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const fetchPlaybooks = async (
  companyId: number,
  params: PlaybookParams = {},
): Promise<PlaybookResponse> => {
  const searchParams = new URLSearchParams({
    companyId: companyId.toString(),
    ...(params.search && { search: params.search }),
    ...(params.categoryId && { categoryId: params.categoryId.toString() }),
    ...(params.isActive !== undefined && {
      isActive: params.isActive.toString(),
    }),
    ...(params.page && { page: params.page.toString() }),
    ...(params.limit && { limit: params.limit.toString() }),
  });

  const response = await fetch(
    `/api/ai-train/service-playbooks?${searchParams.toString()}`,
  );
  if (!response.ok) {
    throw new Error("Failed to fetch playbooks");
  }
  return response.json();
};

export function useServicePlaybooks(params: PlaybookParams = {}) {
  const { data: company } = useCompanyQuery();
  const companyId = company?.id;

  return useQuery({
    queryKey: queryKeys.servicePlaybooks({
      companyId,
      ...params,
    }),
    queryFn: () => fetchPlaybooks(companyId!, params),
    enabled: !!companyId,
  });
}

export function useCreatePlaybook() {
  const queryClient = useQueryClient();
  const { data: company } = useCompanyQuery();
  const companyId = company?.id;

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/ai-train/service-playbooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          companyId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create playbook");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.servicePlaybooks({ companyId }),
      });
      toast.success("Playbook created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create playbook");
    },
  });
}
export function useClonePlaybooks() {
  const queryClient = useQueryClient();
  const { data: company } = useCompanyQuery();
  const companyId = company?.id;

  return useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/ai-train/clone-playbooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceCompanyId:
            Number(process.env.NEXT_PUBLIC_SOURCE_COMPANY_ID) ?? 4,
          targetCompanyId: companyId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to clone playbook");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.servicePlaybooks({ companyId }),
      });
      toast.success("Playbook cloned successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to clone playbook");
    },
  });
}

export function useUpdatePlaybook() {
  const queryClient = useQueryClient();
  const { data: company } = useCompanyQuery();
  const companyId = company?.id;

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await fetch(`/api/ai-train/service-playbooks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update playbook");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.servicePlaybooks({ companyId }),
      });
      toast.success("Playbook updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update playbook");
    },
  });
}

export function useDeletePlaybook() {
  const queryClient = useQueryClient();
  const { data: company } = useCompanyQuery();
  const companyId = company?.id;

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/ai-train/service-playbooks/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete playbook");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.servicePlaybooks({ companyId }),
      });
      toast.success("Playbook deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete playbook");
    },
  });
}

export function useTogglePlaybook() {
  const queryClient = useQueryClient();
  const { data: company } = useCompanyQuery();
  const companyId = company?.id;

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const response = await fetch(`/api/ai-train/service-playbooks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to toggle playbook");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.servicePlaybooks({ companyId }),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to toggle playbook");
    },
  });
}
