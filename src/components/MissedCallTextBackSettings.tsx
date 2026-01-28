"use client";

import { updateMissedCallTextBackEnabled } from "@/actions/settings/updateMissedCallTextBackEnabled";
import { errorToast, successToast } from "@/lib/toast";
import { useEffect, useState } from "react";

interface MissedCallTextBackSettingsProps {
  initialEnabled?: boolean | null;
}

export default function MissedCallTextBackSettings({
  initialEnabled,
}: MissedCallTextBackSettingsProps) {
  const [isEnabled, setIsEnabled] = useState(!!initialEnabled);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsEnabled(!!initialEnabled);
  }, [initialEnabled]);

  const handleToggle = async () => {
    try {
      setIsLoading(true);
      const result = await updateMissedCallTextBackEnabled(!isEnabled);

      if (result.type === "success") {
        setIsEnabled(!isEnabled);
        successToast(
          !isEnabled
            ? "Missed call text-back enabled"
            : "Missed call text-back disabled",
        );
      } else {
        errorToast("Failed to update missed call text-back setting");
      }
    } catch (error) {
      console.error("Error toggling missed call text-back:", error);
      errorToast("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Missed Call Text Back
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Automatically send an SMS to clients when a call is missed
          </p>
        </div>

        <button
          onClick={handleToggle}
          disabled={isLoading}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
            isEnabled ? "bg-blue-600" : "bg-gray-200"
          }`}
          role="switch"
          aria-checked={isEnabled}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isEnabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
    </div>
  );
}
