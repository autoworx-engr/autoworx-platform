import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import toast from "react-hot-toast";

export const useCompanySalesAgent = (companyId: number) => {
  return useQuery({
    queryKey: ["company-sales-agent", companyId],
    queryFn: async () => {
      const { data } = await axios.get(`/api/admin/company/${companyId}`);
      return data;
    },
    enabled: !!companyId,
  });
};

// Fetch all clients
export const useCompanyClients = (companyId: number) => {
  return useQuery({
    queryKey: ["company-clients", companyId],
    queryFn: async () => {
      const { data } = await axios.get(
        `/api/admin/company/${companyId}/clients`,
      );
      return data;
    },
    enabled: !!companyId,
  });
};

export const useToggleCompanySalesAgent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      companyId,
      isSalesAgent,
    }: {
      companyId: number;
      isSalesAgent: boolean;
    }) => {
      const { data } = await axios.patch(
        `/api/admin/company/${companyId}/sales-agent`,
        { isSalesAgent },
      );

      return data;
    },
    onSuccess: (_, variables) => {
      toast.success("Company sales Agent permission updated");
      queryClient.invalidateQueries({
        queryKey: ["company-sales-agent", variables.companyId],
      });
      queryClient.invalidateQueries({
        queryKey: ["company-clients", variables.companyId],
      });
    },
  });
};

export const useToggleClientSalesAgent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      clientId,
      isSalesAgent,
    }: {
      clientId: number;
      isSalesAgent: boolean;
    }) => {
      const { data } = await axios.patch(
        `/api/admin/client/${clientId}/sales-agent`,
        { isSalesAgent },
      );
      return data;
    },
    onSuccess: (_, variables) => {
      toast.success("Client sales Agent permission updated");
      queryClient.invalidateQueries({
        queryKey: ["company-sales-agent"],
      });
      queryClient.invalidateQueries({
        queryKey: ["company-clients"],
      });
    },
  });
};
