export const reviewService = {
  getReviews: async (companyId: number) => {
    const res = await fetch(`/api/reviews?companyId=${companyId}`);

    if (!res.ok) throw new Error("Failed to fetch reviews");

    return await res.json();
  },

  createReview: async (data: any) => {
    const res = await fetch(`/api/reviews`, {
      method: "POST",
      body: JSON.stringify(data),
    });

    if (!res.ok) throw new Error("Failed to create review");

    return await res.json();
  },

  updateReview: async ({ id, data }: any) => {
    const res = await fetch(`/api/reviews/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });

    if (!res.ok) throw new Error("Failed to update review");

    return await res.json();
  },

  deleteReview: async (id: number) => {
    const res = await fetch(`/api/reviews/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) throw new Error("Failed to delete review");

    return await res.json();
  },
};
