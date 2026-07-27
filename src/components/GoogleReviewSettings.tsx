"use client";

import { updateGoogleReviewLink } from "@/actions/settings/updateGoogleReviewLink";
import { SlimInput } from "@/components/SlimInput";
import { errorToast, successToast } from "@/lib/toast";
import { Star } from "lucide-react";
import { useState } from "react";

interface GoogleReviewSettingsProps {
  initialReviewLink?: string | null;
}

export default function GoogleReviewSettings({
  initialReviewLink,
}: GoogleReviewSettingsProps) {
  const [reviewLink, setReviewLink] = useState(initialReviewLink || "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSave = async () => {
    setError("");
    setIsLoading(true);

    try {
      // Validate URL format if provided
      if (reviewLink && !isValidUrl(reviewLink)) {
        setError("Please enter a valid URL");
        setIsLoading(false);
        return;
      }

      const result = await updateGoogleReviewLink(reviewLink);

      if (result.success) {
        successToast("Google Review link updated successfully");
      } else {
        errorToast(result.error || "Failed to update Google Review link");
        setError(result.error || "Failed to update");
      }
    } catch (err) {
      errorToast("An unexpected error occurred");
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    setError("");
    setIsLoading(true);

    try {
      const result = await updateGoogleReviewLink("");

      if (result.success) {
        setReviewLink("");
        successToast("Google Review link cleared successfully");
      } else {
        errorToast(result.error || "Failed to clear Google Review link");
      }
    } catch (err) {
      errorToast("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm md:p-6">
      <div className="flex items-center gap-2 border-b border-slate-200/70 pb-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 text-slate-500">
          <Star className="h-4.5 w-4.5" />
        </span>
        <div>
          <h4 className="text-lg font-semibold text-slate-600">
            Google Review
          </h4>
          <p className="text-sm text-slate-500">
            Share a link so customers can leave you a review.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <SlimInput
          error={error}
          value={reviewLink}
          onChange={(e) => setReviewLink(e.target.value)}
          name="googleReviewLink"
          label="Google Review Link"
          placeholder="https://google.drive"
          className="focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
        />

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="rounded bg-primary px-4 py-2 text-white hover:bg-primary disabled:opacity-50"
          >
            {isLoading ? "Saving..." : "Save"}
          </button>

          {reviewLink && (
            <button
              onClick={handleReset}
              disabled={isLoading}
              className="rounded border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
