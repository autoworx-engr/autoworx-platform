import { Star } from "lucide-react";

export default function NoReviewsFound() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-6 text-gray-500">
      <Star size={28} className="mb-2 text-gray-300" />

      <p className="font-medium text-gray-600">No reviews yet</p>

      <p className="text-sm text-gray-400">
        Be the first to share your experience.
      </p>
    </div>
  );
}
