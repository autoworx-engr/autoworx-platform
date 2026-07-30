"use client";

import { updateCallForwardingNumber } from "@/actions/settings/updateCallForwardingNumber";
import { errorToast, successToast } from "@/lib/toast";
import { useState, useEffect } from "react";

interface CallForwardingSettingsProps {
  initialNumber?: string | null;
}

export default function CallForwardingSettings({
  initialNumber,
}: CallForwardingSettingsProps) {
  const [isEnabled, setIsEnabled] = useState(!!initialNumber);
  const [forwardingNumber, setForwardingNumber] = useState(initialNumber || "");
  const [isLoading, setIsLoading] = useState(false);

  // Update state when initialNumber changes
  useEffect(() => {
    setIsEnabled(!!initialNumber);
    setForwardingNumber(initialNumber || "");
  }, [initialNumber]);

  const handleToggle = async () => {
    if (isEnabled) {
      // Disabling - clear the forwarding number
      try {
        setIsLoading(true);
        const result = await updateCallForwardingNumber(null);

        if (result.type === "success") {
          setIsEnabled(false);
          setForwardingNumber("");
          successToast("Call forwarding disabled");
        } else {
          errorToast("Failed to disable call forwarding");
        }
      } catch (error) {
        console.error("Error disabling call forwarding:", error);
        errorToast("An error occurred");
      } finally {
        setIsLoading(false);
      }
    } else {
      // Just enable the toggle - user needs to save
      setIsEnabled(true);
    }
  };

  const handleSave = async () => {
    const trimmed = forwardingNumber.trim();
    if (!trimmed) {
      errorToast("Please enter a phone number");
      return;
    }
    if (!/^\+\d{8,15}$/.test(trimmed)) {
      errorToast(
        "Use E.164 format (e.g. +14155551234) — 8–15 digits with a leading +.",
      );
      return;
    }

    try {
      setIsLoading(true);
      const result = await updateCallForwardingNumber(trimmed);

      if (result.type === "success") {
        successToast("Call forwarding number saved successfully");
      } else {
        errorToast("Failed to save forwarding number");
      }
    } catch (error) {
      errorToast("An error occurred while saving");
      console.error("Error saving forwarding number:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Call Forwarding
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Forward incoming calls to a specific phone number
          </p>
        </div>

        {/* Toggle Button */}
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

      {isEnabled && (
        <div className="space-y-4">
          <div>
            <label
              htmlFor="forwarding-number"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Forwarding Number
            </label>
            <input
              id="forwarding-number"
              type="tel"
              value={forwardingNumber}
              onChange={(e) => setForwardingNumber(e.target.value)}
              placeholder="+1234567890"
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50"
            />
            <p className="mt-1 text-xs text-gray-500">
              Enter phone number with country code (e.g., +1234567890)
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isLoading || !forwardingNumber.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              {isLoading ? "Saving..." : "Save Number"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
