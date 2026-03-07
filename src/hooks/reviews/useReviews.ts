import { reviewService } from "@/service/reviews/api";
import { useQuery } from "@tanstack/react-query";

export const useReviews = (companyId: number) => {
  return useQuery({
    queryKey: ["reviews", companyId],
    queryFn: () => reviewService.getReviews(companyId),
    enabled: !!companyId,
  });
};
