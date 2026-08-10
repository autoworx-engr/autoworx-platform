import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Column } from "@prisma/client";
import { successToast, errorToast } from "@/lib/toast";

export interface LocalColumn {
  id: number | null;
  title: string;
  type: string;
  order: number;
  textColor?: string | null;
  bgColor?: string | null;
  isRestricted?: boolean;
}

export const restrictedColumns = [
  "Pending",
  "In Progress",
  "Completed",
  "Delivered",
  "New Leads",
  "Ongoing",
  "Lead Lost",
  "Opportunity",
  "Converted",
  "Follow Up",
];

export const useGetPipelineColumns = (type: string) => {
  return useQuery<Column[]>({
    queryKey: ["pipeline-columns", type],
    queryFn: async () => {
      const response = await fetch(`/api/pipeline/sales/columns?type=${type}`);
      const result = await response.json();
      return result.success ? result.data : [];
    },
  });
};

export const useReorderPipelineColumns = () => {
  return useMutation({
    mutationFn: async (updatedColumns: LocalColumn[]) => {
      const reorderedColumns = updatedColumns
        .filter((column) => column.id !== null)
        .map((column, index) => ({
          id: column.id!,
          order: index,
        }));
      const res = await fetch("/api/pipeline/sales/columns/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: reorderedColumns }),
      });
      if (!res.ok) throw new Error("Failed to reorder");
    },
  });
};

interface SavePipelineParams {
  localColumns: LocalColumn[];
  deletedColumns: LocalColumn[];
}

import { useRouter } from "next/navigation";

export const useSavePipelineColumns = (
  pipelineType: string,
  onClose: () => void,
) => {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async ({
      localColumns,
      deletedColumns,
    }: SavePipelineParams) => {
      // Check for renamed restricted columns
      const renamedRestrictedColumns = localColumns.filter(
        (column) =>
          column.isRestricted &&
          !restrictedColumns.includes(column.title.trim()),
      );

      if (renamedRestrictedColumns.length > 0) {
        throw new Error(
          `The restricted column "${renamedRestrictedColumns[0].title}" cannot be renamed.`,
        );
      }

      // Check if any non-restricted column has a restricted title
      const invalidColumns = localColumns.filter(
        (column) =>
          !column.isRestricted &&
          restrictedColumns.includes(column.title.trim()),
      );

      if (invalidColumns.length > 0) {
        throw new Error(
          `The column "${invalidColumns[0].title}" is a restricted title and cannot be used.`,
        );
      }

      const columnsToSave = localColumns.map(async (column, index) => {
        column.order = index;

        if (restrictedColumns.includes(column.title)) {
          return;
        }

        if (column.id === null) {
          const res = await fetch("/api/pipeline/sales/columns", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: column.title,
              type: pipelineType,
              textColor: column.textColor,
              bgColor: column.bgColor,
            }),
          });
          const data = await res.json();
          if (!data.success) throw new Error(data.error);
          column.id = data.data.id;
        } else {
          const res = await fetch(`/api/pipeline/sales/columns/${column.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: column.title,
              type: pipelineType,
              order: column.order,
              textColor: column.textColor,
              bgColor: column.bgColor,
            }),
          });
          const data = await res.json();
          if (!data.success) throw new Error(data.error);
        }
      });

      const columnsToDelete = deletedColumns.map(async (column) => {
        if (column.id !== null) {
          const res = await fetch(`/api/pipeline/sales/columns/${column.id}`, {
            method: "DELETE",
          });
          const data = await res.json();
          if (!data.success) throw new Error(data.error);
        }
      });

      // Wait for all columns to be saved/updated and deleted
      await Promise.all([...columnsToSave, ...columnsToDelete]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["pipeline-columns", pipelineType],
      });
      router.refresh();
      successToast("Pipeline columns saved successfully.");
      onClose();
    },
    onError: (error: Error) => {
      errorToast(error.message);
    },
  });
};
