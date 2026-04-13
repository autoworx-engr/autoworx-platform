import { reviewService } from "@/service/reviews/api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

export const useReviews = (companyId: number, currentCompanyId: number) => {
  return useQuery({
    queryKey: ["reviews", companyId],
    queryFn: () => reviewService.getReviews(companyId, currentCompanyId),
    enabled: !!companyId,
    placeholderData: keepPreviousData,
  });
};
