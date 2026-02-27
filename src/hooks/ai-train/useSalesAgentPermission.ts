import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

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
      console.log("data", data);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["company-sales-agent", variables.companyId],
      });
      queryClient.invalidateQueries({
        queryKey: ["clients", variables.companyId],
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["company-sales-agent"] });
    },
  });
};
