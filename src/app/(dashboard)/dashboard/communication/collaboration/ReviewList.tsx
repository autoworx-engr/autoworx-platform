"use client";

import { Trash2, Pencil } from "lucide-react";
import { Popconfirm, Spin } from "antd";
import { Rating } from "@mui/material";
import { useState } from "react";
import ReviewSkeleton from "./ReviewSkeleton";
import NoReviewsFound from "./NoReviewsFound";

export type TReview = {
  id: number;
  sendCompanyId: number;
  user?: { firstName: string; lastName: string } | null;
  rate: number;
  message: string;
  createdAt: Date | string;
};

type TProps = {
  reviews: TReview[];
  currentCompanyId: number;
  isLoading: boolean;
  deleteIsPending: boolean;
  updatePending: boolean;
  onDelete: (id: number) => void;
  onUpdate: (id: number, rate: number | null, message: string) => void;
};

export default function ReviewList({
  reviews,
  currentCompanyId,
  isLoading,
  deleteIsPending,
  updatePending,
  onDelete,
  onUpdate,
}: TProps) {
  const [editingReview, setEditingReview] = useState<TReview | null>(null);
  const [editRating, setEditRating] = useState<number | null>(5);

  if (isLoading) return <ReviewSkeleton />;
  if (reviews.length === 0) return <NoReviewsFound />;

  return (
    <div className="space-y-3 text-sm text-gray-600">
      {reviews.map((review) => {
        const isOwnReview = review.sendCompanyId === currentCompanyId;

        return (
          <div key={review.id} className="border-b pb-3 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                {isOwnReview ? (
                  <p className="font-medium">You</p>
                ) : (
                  <p className="font-medium">
                    {review?.user?.firstName + " " + review?.user?.lastName}
                  </p>
                )}
              </div>

              {isOwnReview && editingReview?.id !== review.id && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingReview(review);
                      setEditRating(review.rate);
                    }}
                    className="flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100"
                  >
                    <Pencil size={14} />
                    Edit
                  </button>

                  <Popconfirm
                    title="Delete the review"
                    description="Are you sure to delete this review?"
                    okText="Yes"
                    cancelText="No"
                    placement="bottomLeft"
                    overlayStyle={{ maxWidth: 220 }}
                    onConfirm={() => onDelete(review.id)}
                  >
                    <button
                      className="flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-red-300 text-red-500 hover:bg-red-50"
                      disabled={deleteIsPending}
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </Popconfirm>
                </div>
              )}
            </div>

            {editingReview?.id === review.id ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const message = new FormData(e.currentTarget).get(
                    "message",
                  ) as string;
                  onUpdate(review.id, editRating, message);
                  setEditingReview(null);
                }}
                className="space-y-2"
              >
                <Rating
                  name="size-small"
                  defaultValue={editRating ?? 0}
                  size="small"
                  precision={0.5}
                  onChange={(_e, v) => setEditRating(v)}
                />
                <textarea
                  name="message"
                  defaultValue={review.message}
                  className="w-full border rounded-md p-2 text-sm"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={updatePending}
                    className="bg-[#006D77] text-white px-3 py-1 rounded text-xs"
                  >
                    {updatePending ? <Spin /> : "Update"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingReview(null)}
                    className="text-gray-500 text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <Rating
                  key={review?.rate}
                  name="half-rating-read"
                  value={review?.rate}
                  precision={0.5}
                  size="small"
                  readOnly
                />
                <p className="text-gray-700">{review.message}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
