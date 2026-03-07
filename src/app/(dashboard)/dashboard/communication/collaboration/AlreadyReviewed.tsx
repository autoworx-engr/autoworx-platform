import { Star } from "lucide-react";

type TAlreadyReviewed = {
  rate: number;
  message: string;
  date?: string;
};

export default function AlreadyReviewed({
  rate,
  message,
  date,
}: TAlreadyReviewed) {
  return (
    <div className="border rounded-md p-4 bg-gray-50 space-y-2">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={16}
            className={
              star <= rate ? "fill-yellow-500 text-yellow-500" : "text-gray-300"
            }
          />
        ))}
        {date && <span className="text-xs text-gray-400 ml-2">{date}</span>}
      </div>

      <p className="text-sm text-gray-700">{message}</p>

      <p className="text-xs text-gray-400">
        You have already submitted this review.
      </p>
    </div>
  );
}
