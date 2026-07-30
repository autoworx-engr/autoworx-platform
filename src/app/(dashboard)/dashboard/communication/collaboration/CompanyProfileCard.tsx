"use client";

import Image from "next/image";
import { MapPin, Users, Briefcase } from "lucide-react";
import { cn } from "@/lib/cn";
import { useOptimistic, useTransition, useState } from "react";
import { useCompanyDetails } from "@/hooks/communication/collaboration/useCompanyDetails ";
import CompanyProfileCardSkeleton from "./CompanyProfileCardSkeleton";
import { useReviews } from "@/hooks/reviews/useReviews";
import { useCreateReview } from "@/hooks/reviews/useCreateReview";
import { useDeleteReview } from "../../../../../hooks/reviews/useDeleteReview";
import { useUpdateReview } from "@/hooks/reviews/useUpdateReview";
import { Rating } from "@mui/material";
import toast from "react-hot-toast";
import ReviewList, { TReview } from "./ReviewList";
import ReviewForm from "./ReviewForm";

type TCompanyDetails = {
  id: number;
  name: string;
  image?: string | null;
  about?: string | null;
  teamSize?: string | null;
  industry?: string | null;
  address?: string | null;
  avgRate: number;
  totalReviews: number;
  totalCollaboration: number;
  totalJobsDone: number;
};

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

  const { data: details, isLoading } = useCompanyDetails({
    companyId,
    userId,
    currentCompanyId,
  });

  const { data: reviewData, isLoading: reviewsLoading } = useReviews(
    companyId,
    currentCompanyId,
  );
  const { mutateAsync: createReview, isPending } = useCreateReview(companyId);
  const { mutate: deleteReview, isPending: deleteIsPending } =
    useDeleteReview(companyId);
  const { mutate: updateReview, isPending: updatePending } =
    useUpdateReview(companyId);

  const [, startTransition] = useTransition();

  const [optimisticReviews, addOptimisticReview] = useOptimistic(
    (reviewData?.data?.reviews ?? []) as TReview[],
    (state: TReview[], newReview: TReview) => [...state, newReview],
  );

  const [optimisticDetails, updateOptimisticDetails] = useOptimistic(
    details as TCompanyDetails | undefined,
    (state: TCompanyDetails | undefined, update: Partial<TCompanyDetails>) =>
      state ? { ...state, ...update } : state,
  );

  if (isLoading) return <CompanyProfileCardSkeleton />;

  const rating = optimisticDetails?.avgRate ?? 0;

  const handleSubmitReview = (rate: number, message: string) => {
    const total = optimisticDetails?.totalReviews ?? 0;
    const newAvg =
      ((optimisticDetails?.avgRate ?? 0) * total + rate) / (total + 1);

    startTransition(async () => {
      addOptimisticReview({
        id: Date.now(),
        sendCompanyId: currentCompanyId,
        user: { firstName: "You", lastName: "" },
        rate,
        message,
        createdAt: new Date().toISOString(),
      });
      updateOptimisticDetails({
        totalReviews: total + 1,
        avgRate: Number(newAvg.toFixed(1)),
      });
      try {
        await createReview({
          rate,
          message,
          companyId,
          sendUserId: userId,
          sendCompanyId: currentCompanyId,
        });
        toast.success("Review submitted successfully!");
        setActiveTab("reviews");
      } catch {
        toast.error("Failed to submit review");
      }
    });
  };

  const handleDeleteReview = (id: number) => {
    deleteReview(id, { onSuccess: () => toast.success("Review deleted") });
  };

  const handleUpdateReview = (
    id: number,
    rate: number | null,
    message: string,
  ) => {
    updateReview(
      { id, data: { rate, message } },
      { onSuccess: () => toast.success("Review updated") },
    );
  };

  return (
    <div className="w-full max-w-[380px] rounded-xl bg-white shadow-md border p-4 space-y-4 md:h-[83vh] overflow-y-auto">
      <h2 className="text-lg font-semibold">Profile</h2>

      <div className="flex flex-col items-center text-center">
        <div className="flex items-center justify-center w-[150px] h-[150px] rounded-full overflow-hidden">
          <Image
            src={details?.image ?? "/icons/business.png"}
            alt={details?.name ?? "Company"}
            width={200}
            height={200}
            className="object-cover w-full h-full"
          />
        </div>

        <h3 className="mt-3 text-xl font-bold">{details?.name}</h3>

        {details?.address && (
          <div className="flex items-center gap-1 text-gray-500 text-sm mt-1">
            <MapPin size={14} />
            {details.address}
          </div>
        )}

        <div className="flex items-center gap-1 mt-2 text-sm">
          <Rating
            key={rating}
            name="half-rating-read"
            value={rating}
            precision={0.5}
            size="medium"
            readOnly
          />
          <span className="text-gray-600">
            {rating.toFixed(1)} ({optimisticDetails?.totalReviews ?? 0})
          </span>
        </div>
      </div>

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
          <p className="font-semibold">{details?.totalJobsDone ?? 0}</p>
        </div>
      </div>

      {details?.about && (
        <div>
          <h4 className="font-semibold mb-1">About</h4>
          <p className="text-sm text-gray-600">{details.about}</p>
        </div>
      )}

      {(details?.industry?.length ?? 0) > 0 && (
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
      )}

      <div className="rounded-lg bg-teal-50 border p-3 flex justify-between items-center">
        <div>
          <p className="text-sm font-medium text-teal-700">
            Your Collaboration
          </p>
          <p className="text-xs text-gray-500">Jobs completed together</p>
        </div>
        <p className="font-bold text-teal-700">
          {details?.totalCollaboration ?? 0}
        </p>
      </div>

      <div className="bg-gray-100 rounded-lg p-1 flex text-sm">
        <button
          onClick={() => setActiveTab("reviews")}
          className={cn(
            "flex-1 py-2 rounded-md",
            activeTab === "reviews" && "bg-white shadow",
          )}
        >
          Reviews ({optimisticReviews.length})
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
        <ReviewList
          reviews={optimisticReviews}
          currentCompanyId={currentCompanyId}
          isLoading={reviewsLoading}
          deleteIsPending={deleteIsPending}
          updatePending={updatePending}
          onDelete={handleDeleteReview}
          onUpdate={handleUpdateReview}
        />
      ) : (
        <ReviewForm
          isPending={isPending}
          alreadyReviewed={reviewData?.data?.alreadyReviewed ?? false}
          userReview={reviewData?.data?.userReview}
          currentUserId={userId}
          onSubmit={handleSubmitReview}
        />
      )}
    </div>
  );
}
