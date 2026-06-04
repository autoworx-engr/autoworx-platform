"use client";

import { useCallback, useEffect, useState } from "react";
import ReviewCard from "./ReviewCard";
import ReviewFilters, { type FilterState } from "./ReviewFilters";
import ReplyModal from "./ReplyModal";
import type { GbpReviewRow } from "../types";

interface Props {
  locations: { id: number; name: string }[];
}

const DEFAULT_FILTERS: FilterState = {
  rating: "",
  status: "",
  search: "",
  sort: "newest",
  locationId: "",
};

export default function ReviewsList({ locations }: Props) {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [reviews, setReviews] = useState<GbpReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeReview, setActiveReview] = useState<GbpReviewRow | null>(null);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.rating) params.set("rating", filters.rating);
      if (filters.status) params.set("status", filters.status);
      if (filters.search) params.set("search", filters.search);
      if (filters.sort) params.set("sort", filters.sort);
      if (filters.locationId) params.set("locationId", filters.locationId);

      const res = await fetch(`/api/gbp/reviews?${params}`);
      const data = await res.json();
      setReviews(data.data?.reviews ?? []);
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  function handleFilterChange(update: Partial<FilterState>) {
    setFilters((prev) => ({ ...prev, ...update }));
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <ReviewFilters
        locations={locations}
        filters={filters}
        onChange={handleFilterChange}
      />

      {loading ? (
        <div className="flex flex-1 items-center justify-center py-20 text-sm text-gray-400">
          Loading reviews...
        </div>
      ) : reviews.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-20 text-center text-gray-400">
          <p className="text-sm">No reviews found.</p>
          <p className="mt-1 text-xs">Try syncing or adjusting your filters.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              onReply={setActiveReview}
            />
          ))}
        </div>
      )}

      <ReplyModal
        key={activeReview?.id ?? "none"}
        review={activeReview}
        onClose={() => setActiveReview(null)}
        onSaved={fetchReviews}
      />
    </div>
  );
}
