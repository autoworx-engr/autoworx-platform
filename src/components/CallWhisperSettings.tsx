"use client";

import { updateCallWhisperEnabled } from "@/actions/settings/updateCallWhisperEnabled";
import { errorToast, successToast } from "@/lib/toast";
import { useState } from "react";

interface CallWhisperSettingsProps {
  initialEnabled?: boolean;
}

export default function CallWhisperSettings({
  initialEnabled = true,
}: CallWhisperSettingsProps) {
  const [isEnabled, setIsEnabled] = useState(initialEnabled);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    const next = !isEnabled;
    try {
      setIsLoading(true);
      const result = await updateCallWhisperEnabled(next);
      if (result.type === "success") {
        setIsEnabled(next);
        successToast(
          next
            ? "Call recording notice enabled"
            : "Call recording notice disabled",
        );
      } else {
        errorToast("Failed to update setting");
      }
    } catch {
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
            Call Recording Notice
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Automatically notify callers that the call may be recorded before
            connecting. Plays on both inbound and outbound calls.
          </p>
        </div>

        {/* Toggle */}
        <button
          onClick={handleToggle}
          disabled={isLoading}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
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

      {isEnabled && (
        <div className="mt-3 space-y-1 rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-700">
          <p>
            <span className="font-medium">Inbound:</span> &quot;Thanks for
            calling [your company]. This call may be recorded for quality and
            training purposes.&quot;
          </p>
          <p>
            <span className="font-medium">Outbound:</span> &quot;This is a call
            from [your company]. This call may be recorded for quality and
            training purposes.&quot;
          </p>
        </div>
      )}
    </div>
  );
}
