"use client";

import Image from "next/image";
import { MapPin, Users, Briefcase, Star } from "lucide-react";
import { cn } from "@/lib/cn";
import { useState } from "react";
import { useCompanyDetails } from "@/hooks/communication/collaboration/useCompanyDetails ";
import CompanyProfileCardSkeleton from "./CompanyProfileCardSkeleton";
import { useReviews } from "@/hooks/reviews/useReviews";
import { useCreateReview } from "@/hooks/reviews/useCreateReview";
import ReviewSkeleton from "./ReviewSkeleton";
import NoReviewsFound from "./NoReviewsFound";
import toast from "react-hot-toast";
import AlreadyReviewed from "./AlreadyReviewed";

type TProfileCard = {
  companyId: number;
  currentCompanyId: number;
  userId: number;
};

export default function CompanyProfileCard({
  companyId,
  currentCompanyId,
  userId,
}: TProfileCard) {
  const [activeTab, setActiveTab] = useState<"reviews" | "write">("reviews");
  const [ratingInput, setRatingInput] = useState(5);
  const {
    data: details,
    isLoading,
    isFetching,
  } = useCompanyDetails({ companyId, userId, currentCompanyId });

  const { data: reviewData, isLoading: reviewsLoading } = useReviews(companyId);
  const {
    mutate: createReview,
    isPending,
    isSuccess,
  } = useCreateReview(companyId);
  if (isLoading || isFetching) {
    return <CompanyProfileCardSkeleton />;
  }
  const rating = details?.avgRate || 0;

  const handleSubmit = (e: any) => {
    e.preventDefault();

    const form = new FormData(e.target);

    createReview({
      rate: ratingInput,
      message: form.get("message"),
      companyId,
      sendUserId: userId,
      sendCompanyId: currentCompanyId,
    });

    if (isSuccess) {
      toast.success("Write review successfully!");
      setActiveTab("reviews");
    }
  };

  return (
    <div className="w-full max-w-[380px] rounded-xl bg-white shadow-md border p-4 space-y-4 md:h-[83vh] overflow-y-auto">
      {/* Header */}
      <h2 className="text-lg font-semibold">Profile</h2>

      {/* Avatar */}
      <div className="flex flex-col items-center text-center">
        <div className="relative">
          <div className="flex items-center justify-center w-[150px] h-[150px] rounded-full overflow-hidden">
            <Image
              src={details?.image}
              alt={details?.name}
              width={200}
              height={200}
              className="object-cover w-full h-full"
            />
          </div>

          <span className="absolute bottom-2 right-2 w-4 h-4 rounded-full bg-green-500 border-2 border-white" />
        </div>

        <h3 className="mt-3 text-xl font-bold">{details?.name}</h3>

        {details?.address && (
          <div className="flex items-center gap-1 text-gray-500 text-sm mt-1">
            <MapPin size={14} />
            {details?.address}
          </div>
        )}

        <div className="flex items-center gap-1 mt-2 text-sm">
          <div className="flex text-yellow-500">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={16}
                className={
                  star <= Math.round(rating)
                    ? "fill-yellow-500 text-yellow-500"
                    : "text-gray-300"
                }
              />
            ))}
          </div>

          <span className="text-gray-600">
            {rating.toFixed(1)} ({details?.totalReviews})
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-gray-100 p-3 text-center">
          <Users className="mx-auto mb-1 text-gray-500" size={16} />
          <p className="text-xs text-gray-500">Team Size</p>
          <p className="font-semibold capitalize">
            {details?.teamSize?.toLowerCase()}
          </p>
        </div>

        <div className="rounded-lg bg-gray-100 p-3 text-center">
          <Briefcase className="mx-auto mb-1 text-gray-500" size={16} />
          <p className="text-xs text-gray-500">Jobs Done</p>
          <p className="font-semibold">{details?.totalJobsDone}</p>
        </div>
      </div>

      {/* About */}
      <div>
        <h4 className="font-semibold mb-1">About</h4>
        <p className="text-sm text-gray-600">{details?.about}</p>
      </div>

      {/* Specializations */}
      <div>
        <h4 className="font-semibold mb-2">Specializations</h4>
        <div className="flex flex-wrap gap-2">
          {details?.industry?.split(",")?.map((spec: string, i: number) => (
            <span
              key={i}
              className="rounded-full bg-teal-100 text-teal-700 px-3 py-1 text-xs font-medium"
            >
              {spec}
            </span>
          ))}
        </div>
      </div>

      {/* Collaboration Box */}
      <div className="rounded-lg bg-teal-50 border p-3 flex justify-between items-center">
        <div>
          <p className="text-sm font-medium text-teal-700">
            Your Collaboration
          </p>
          <p className="text-xs text-gray-500">Jobs completed together</p>
        </div>
        <p className="font-bold text-teal-700">{details?.totalCollaboration}</p>
      </div>

      {/* Tabs */}
      <div className="bg-gray-100 rounded-lg p-1 flex text-sm">
        <button
          onClick={() => setActiveTab("reviews")}
          className={cn(
            "flex-1 py-2 rounded-md",
            activeTab === "reviews" && "bg-white shadow",
          )}
        >
          Reviews ({details?.totalReviews})
        </button>

        <button
          onClick={() => setActiveTab("write")}
          className={cn(
            "flex-1 py-2 rounded-md",
            activeTab === "write" && "bg-white shadow",
          )}
        >
          Write Review
        </button>
      </div>

      {activeTab === "reviews" ? (
        <div className="space-y-3 text-sm text-gray-600">
          {reviewsLoading && <ReviewSkeleton />}

          {!reviewsLoading && reviewData?.data?.length === 0 && (
            <NoReviewsFound />
          )}

          {reviewData?.data?.map((review: any) => (
            <div key={review.id} className="border-b pb-2">
              <div className="flex items-center justify-between">
                <p className="font-medium">
                  {review?.user?.firstName + " " + review?.user?.lastName}
                </p>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={16}
                      className={
                        star <= Math.round(review?.rate)
                          ? "fill-yellow-500 text-yellow-500"
                          : "text-gray-300"
                      }
                    />
                  ))}
                </div>
              </div>
              <p>{review.message}</p>
            </div>
          ))}
        </div>
      ) : (
        <>
          {details?.alreadyReviewed ? (
            <AlreadyReviewed
              message={details?.userReview?.message}
              rate={details?.userReview?.rate}
              date={details?.userReview?.createdAt}
              currentUserId={userId}
              sendUserId={details?.userReview?.sendUserId}
            />
          ) : (
            <form className="space-y-3" onSubmit={handleSubmit}>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRatingInput(star)}
                  >
                    <Star
                      size={20}
                      className={
                        star <= ratingInput
                          ? "fill-yellow-500 text-yellow-500"
                          : "text-gray-300"
                      }
                    />
                  </button>
                ))}

                <span className="ml-2 text-sm text-gray-500">
                  {ratingInput} / 5
                </span>
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
                Submit Review
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}
