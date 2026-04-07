import { errorHandler } from "@/error-boundary/globalErrorHandler";
import axios from "axios";

export const reviewService = {
  getReviews: async (companyId: number, currentCompanyId: number) => {
    try {
      const res = await axios.get(
        `/api/reviews?companyId=${companyId}&currentCompanyId=${currentCompanyId}`,
      );

      return res.data;
    } catch (error) {
      const err = errorHandler(error);
      throw err;
    }
  },

  createReview: async (data: any) => {
    try {
      const res = await axios.post(`/api/reviews`, data);

      return res.data;
    } catch (error) {
      const err = errorHandler(error);
      throw err;
    }
  },

  updateReview: async ({ id, data }: any) => {
    try {
      const response = await axios.patch(
        `/api/reviews/${id}`,
        JSON.stringify(data),
      );

      return response.data;
    } catch (error) {
      const err = errorHandler(error);
      throw err;
    }
  },

  deleteReview: async (id: number) => {
    try {
      const res = await axios.delete(`/api/reviews/${id}`);

      return res.data;
    } catch (error) {
      const err = errorHandler(error);
      throw err;
    }
  },
};
