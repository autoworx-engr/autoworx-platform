import { allCompanies } from "@/service/company/api";
import { useQuery } from "@tanstack/react-query";

export const useGetAllCompanies = () => {
  return useQuery({
    queryKey: ["companies"],
    queryFn: async () => await allCompanies(),
  });
};
