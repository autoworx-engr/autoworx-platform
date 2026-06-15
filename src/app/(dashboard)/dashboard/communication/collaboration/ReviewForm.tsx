"use client";

import { Rating } from "@mui/material";
import { useState } from "react";
import { Spin } from "antd";
import AlreadyReviewed from "./AlreadyReviewed";

type TUserReview = {
  message: string;
  rate: number;
  createdAt: Date | string;
  sendUserId: number;
};

type TProps = {
  isPending: boolean;
  alreadyReviewed: boolean;
  userReview?: TUserReview | null;
  currentUserId: number;
  onSubmit: (rate: number, message: string) => void;
};

export default function ReviewForm({
  isPending,
  alreadyReviewed,
  userReview,
  currentUserId,
  onSubmit,
}: TProps) {
  const [ratingInput, setRatingInput] = useState<number | null>(5);

  if (alreadyReviewed && userReview) {
    return (
      <AlreadyReviewed
        message={userReview.message}
        rate={userReview.rate}
        date={
          userReview.createdAt instanceof Date
            ? userReview.createdAt.toISOString()
            : userReview.createdAt
        }
        currentUserId={currentUserId}
        sendUserId={userReview.sendUserId}
      />
    );
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const message = new FormData(e.currentTarget).get("message") as string;
        onSubmit(ratingInput ?? 5, message);
      }}
    >
      <div className="flex items-center gap-1">
        <Rating
          name="size-small"
          defaultValue={ratingInput ?? 0}
          size="small"
          precision={0.5}
          onChange={(_e, v) => setRatingInput(v)}
        />
        <span className="ml-2 text-sm text-gray-500">{ratingInput} / 5</span>
      </div>

      <textarea
        name="message"
        placeholder="Write your review..."
        className="w-full h-20 resize-none border rounded-md p-2 text-sm"
      />

      <button
        type="submit"
        disabled={!!isPending}
        className="w-full bg-[#006D77] text-white py-2 rounded-md text-sm"
      >
        {isPending ? <Spin /> : "Submit Review"}
      </button>
    </form>
  );
}
