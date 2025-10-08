"use client";
import { Call } from "@twilio/voice-sdk";
import { useEffect, useState } from "react";

type TProps = {
  incomingCall: Call | null;
  onAccept: () => void;
  onReject: () => void;
};

export default function IncomingCallAlert({
  incomingCall,
  onAccept,
  onReject,
}: TProps) {
  const [callerNumber, setCallerNumber] = useState<string>("");

  useEffect(() => {
    if (incomingCall) {
      // Get the caller's number from call parameters
      const params = incomingCall.parameters;
      const from = params.From || "Unknown Number";
      setCallerNumber(from);
    }
  }, [incomingCall]);

  if (!incomingCall) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <div className="mb-4 flex items-center justify-center">
            <div className="h-20 w-20 animate-pulse rounded-full bg-green-500 flex items-center justify-center">
              <svg
                className="h-10 w-10 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
            </div>
          </div>
          <h2 className="mb-2 text-2xl font-bold text-gray-800">
            Incoming Call
          </h2>
          <p className="text-lg text-gray-600">{callerNumber}</p>
        </div>

        <div className="flex gap-4">
          <button
            onClick={onReject}
            className="flex-1 rounded-lg bg-red-600 px-6 py-4 text-lg font-semibold text-white shadow-lg transition hover:bg-red-700 active:scale-95"
          >
            <div className="flex items-center justify-center gap-2">
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              Decline
            </div>
          </button>
          <button
            onClick={onAccept}
            className="flex-1 rounded-lg bg-green-600 px-6 py-4 text-lg font-semibold text-white shadow-lg transition hover:bg-green-700 active:scale-95"
          >
            <div className="flex items-center justify-center gap-2">
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Accept
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
