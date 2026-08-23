import { useMutation, useQueryClient } from "@tanstack/react-query";
import { errorToast } from "@/lib/toast";
import { salesPipelineKeyStr } from "@/utils/enums/query-key-constant";

function invalidatePipelineQueries(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  queryClient.invalidateQueries({
    queryKey: [salesPipelineKeyStr.salesPipeline],
  });
  queryClient.invalidateQueries({
    queryKey: [salesPipelineKeyStr.salesPipelineCount],
  });
}

export const useRemoveLeadMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (leadId: number) => {
      const res = await fetch(`/api/pipeline/sales/leads/${leadId}/remove`, {
        method: "PUT",
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => invalidatePipelineQueries(queryClient),
    onError: (error: Error) => {
      errorToast("Failed to remove lead from pipeline.");
      console.error(error);
    },
  });
};

export const useUpdateLeadColumnMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      leadId,
      columnId,
    }: {
      leadId: number;
      columnId: number;
    }) => {
      const res = await fetch(`/api/pipeline/sales/leads/${leadId}/column`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columnId }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => invalidatePipelineQueries(queryClient),
    onError: (error: Error) => {
      console.error("Failed to move job across columns:", error);
    },
  });
};

export const useAssignLeadSalesUserMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      leadId,
      salesUserId,
    }: {
      leadId: number;
      salesUserId: number;
    }) => {
      const res = await fetch(`/api/pipeline/sales/leads/${leadId}/assign`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salesUserId }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => invalidatePipelineQueries(queryClient),
    onError: (error: Error) => {
      console.error("Failed to assign sales user:", error);
    },
  });
};

export const useAddLeadTagMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      leadId,
      tagId,
    }: {
      leadId: number;
      tagId: number;
    }) => {
      const res = await fetch(`/api/pipeline/sales/leads/${leadId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagId }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => invalidatePipelineQueries(queryClient),
    onError: (error: Error) => {
      errorToast("Failed to add tag.");
      console.error("Failed to add lead tag:", error);
    },
  });
};

export const useRemoveLeadTagMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      leadId,
      tagId,
    }: {
      leadId: number;
      tagId: number;
    }) => {
      const res = await fetch(
        `/api/pipeline/sales/leads/${leadId}/tags/${tagId}`,
        {
          method: "DELETE",
        },
      );
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => invalidatePipelineQueries(queryClient),
    onError: (error: Error) => {
      errorToast("Failed to remove tag.");
      console.error("Failed to remove lead tag:", error);
    },
  });
};
