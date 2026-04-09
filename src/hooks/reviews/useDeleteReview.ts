import { reviewService } from "@/service/reviews/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useDeleteReview = (companyId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reviewService.deleteReview,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["reviews", companyId],
      });
      queryClient.invalidateQueries({
        queryKey: ["company-details", companyId],
      });
    },
  });
};
