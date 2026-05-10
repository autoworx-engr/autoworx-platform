"use client";

import { updateGoogleReviewLink } from "@/actions/settings/updateGoogleReviewLink";
import { SlimInput } from "@/components/SlimInput";
import { errorToast, successToast } from "@/lib/toast";
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
    <div className="mt-4">
      <h2 className="my-2 text-xl font-semibold">Google Review</h2>
      <div className="space-y-3 rounded-lg border border-gray-200 p-5">
        <SlimInput
          error={error}
          value={reviewLink}
          onChange={(e) => setReviewLink(e.target.value)}
          name="googleReviewLink"
          label="Google Review Link"
          placeholder="https://google.drive"
          className="focus:border-[#6571FF] focus:outline-none focus:ring-2 focus:ring-[#6571FF]"
        />

        <div className="mt-2 flex gap-2">
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="rounded bg-[#6571FF] px-4 py-2 text-white hover:bg-[#6571FF] disabled:opacity-50"
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
