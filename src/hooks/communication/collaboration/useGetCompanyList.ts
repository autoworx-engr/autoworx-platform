import { getCompanyList } from "@/service/communication/collaboration/api";
import { useQuery } from "@tanstack/react-query";

export const useGetCompanyList = () => {
  return useQuery({
    queryKey: ["company-list"],
    queryFn: () => getCompanyList(),
  });
};
