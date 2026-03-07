import { reviewService } from "@/service/reviews/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useCreateReview = (companyId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reviewService.createReview,

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
