import { CheckCircle, Clock, Star } from "lucide-react";
import type { GbpReviewRow } from "../types";

interface Props {
  review: GbpReviewRow;
  onReply: (review: GbpReviewRow) => void;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={13}
          className={
            s <= rating
              ? "fill-yellow-400 text-yellow-400"
              : "text-gray-300 dark:text-gray-600"
          }
        />
      ))}
    </div>
  );
}

export default function ReviewCard({ review, onReply }: Props) {
  const date = new Date(review.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-900/5 transition-shadow hover:shadow-md dark:bg-slate-800 dark:ring-white/10">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-gray-900 dark:text-white">
              {review.authorName}
            </span>
            {review.replyText ? (
              <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                <CheckCircle size={10} /> Replied
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                <Clock size={10} /> Awaiting Reply
              </span>
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-2">
            <StarRating rating={review.rating} />
            <span className="text-xs text-gray-400">{date}</span>
            <span className="text-xs text-gray-400">
              · {review.location.name}
            </span>
          </div>

          {review.comment && (
            <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              {review.comment}
            </p>
          )}

          {review.replyText && (
            <div className="mt-3 rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
              <p className="mb-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
                Your Reply
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {review.replyText}
              </p>
            </div>
          )}
        </div>

        <button
          onClick={() => onReply(review)}
          className="shrink-0 rounded-md bg-[#6571FF] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#5560ee] transition-colors"
        >
          {review.replyText ? "Edit Reply" : "Reply"}
        </button>
      </div>
    </div>
  );
}
