import { useMutation } from "@tanstack/react-query";
import { errorToast } from "@/lib/toast";

export const useRemoveLeadMutation = () => {
  return useMutation({
    mutationFn: async (leadId: number) => {
      const res = await fetch(`/api/pipeline/sales/leads/${leadId}/remove`, {
        method: "PUT",
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onError: (error: Error) => {
      errorToast("Failed to remove lead from pipeline.");
      console.error(error);
    },
  });
};

export const useUpdateLeadColumnMutation = () => {
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
    onError: (error: Error) => {
      console.error("Failed to move job across columns:", error);
    },
  });
};

export const useAssignLeadSalesUserMutation = () => {
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
    onError: (error: Error) => {
      console.error("Failed to assign sales user:", error);
    },
  });
};

export const useAddLeadTagMutation = () => {
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
    onError: (error: Error) => {
      console.error("Failed to add logic tag:", error);
    },
  });
};

export const useRemoveLeadTagMutation = () => {
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
    onError: (error: Error) => {
      console.error("Failed to unequip logic tag:", error);
    },
  });
};
