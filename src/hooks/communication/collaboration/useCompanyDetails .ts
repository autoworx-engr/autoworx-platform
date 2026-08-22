import { getCompanyDetails } from "@/service/communication/collaboration/getCompanyDetails";
import { useQuery } from "@tanstack/react-query";

export const useCompanyDetails = ({
  companyId,
  userId,
  currentCompanyId,
}: {
  companyId: number;
  userId: number;
  currentCompanyId?: number;
}) => {
  return useQuery({
    queryKey: ["company-details", companyId, userId],
    queryFn: () =>
      getCompanyDetails({
        companyId,
        userId,
        currentCompanyId,
      }),
    enabled: !!companyId && !!userId,
  });
};
