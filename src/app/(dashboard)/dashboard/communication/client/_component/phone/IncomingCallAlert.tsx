"use client";
import { Call } from "@twilio/voice-sdk";
import { useEffect, useState } from "react";

type TProps = {
  incomingCall: Call | null;
  onAccept: () => void;
  onReject: () => void;
  onEndCall?: () => void; // Optional end call handler for connected calls
  isConnected: boolean;
  callDuration: number;
  isMuted?: boolean;
  onToggleMute?: () => void;
};

export default function IncomingCallAlert({
  incomingCall,
  onAccept,
  onReject,
  onEndCall,
  isConnected,
  callDuration,
  isMuted = false,
  onToggleMute,
}: TProps) {
  const [callerNumber, setCallerNumber] = useState<string>("");
  const [callerName, setCallerName] = useState<string>("");
  const [isLoadingName, setIsLoadingName] = useState<boolean>(false);

  useEffect(() => {
    const fetchCallerInfo = async () => {
      if (!incomingCall) return;

      // Get the caller's number and name from call parameters
      const params = incomingCall.parameters;
      const from = params.From || "Unknown Number";
      const clientName = params.ClientName || "";

      setCallerNumber(from);

      // If we have the client name from Twilio params, use it
      if (clientName) {
        setCallerName(clientName);
      } else if (from && from !== "Unknown Number") {
        // For Infobip or if name not provided, fetch from API
        setIsLoadingName(true);
        try {
          const response = await fetch(
            `/api/client/by-phone?phone=${encodeURIComponent(from)}`,
          );
          if (response.ok) {
            const data = await response.json();
            if (data.client) {
              const name =
                data.client.firstName && data.client.lastName
                  ? `${data.client.firstName} ${data.client.lastName}`.trim()
                  : data.client.firstName || data.client.lastName || "";
              setCallerName(name);
            }
          }
        } catch (error) {
          console.error("Failed to fetch caller info:", error);
        } finally {
          setIsLoadingName(false);
        }
      }
    };

    fetchCallerInfo();
  }, [incomingCall]);

  if (!incomingCall) return null;

  // Format duration as MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-900/80 via-slate-800/80 to-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-md mx-4 relative">
        {/* Gradient glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#00b8b0]/20 to-[#0098da]/20 rounded-3xl blur-2xl"></div>

        {/* Main card with glassmorphism */}
        <div className="relative bg-white/95 backdrop-blur-xl rounded-3xl p-8 shadow-2xl ring-1 ring-slate-900/5 animate-in zoom-in-95 duration-300">
          {/* Decorative gradient bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#00b8b0] via-[#0098da] to-[#00b8b0] rounded-t-3xl"></div>

          <div className="mb-8 text-center">
            {/* Phone icon with gradient background */}
            <div className="mb-6 flex items-center justify-center">
              <div className="relative">
                {/* Pulsing rings for incoming call */}
                {!isConnected && (
                  <>
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 opacity-20 animate-ping"></div>
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 opacity-20 animate-pulse"></div>
                  </>
                )}
                <div
                  className={`relative h-24 w-24 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${
                    isConnected
                      ? "bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-500/30"
                      : "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/30"
                  }`}
                >
                  <svg
                    className="h-12 w-12 text-white drop-shadow-md transition-transform duration-300 hover:scale-110"
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
            </div>

            {/* Status text */}
            <h2 className="mb-3 text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              {isConnected ? "Call Connected" : "Incoming Call"}
            </h2>

            {/* Caller name with subtle background */}
            {isLoadingName ? (
              <div className="mb-2 inline-block px-4 py-1.5 rounded-full bg-slate-100 ring-1 ring-slate-900/5">
                <span className="inline-block h-4 w-24 animate-pulse rounded bg-slate-200" />
              </div>
            ) : (
              callerName && (
                <div className="mb-2 inline-block px-4 py-1.5 rounded-full bg-gradient-to-r from-slate-50 to-slate-100 ring-1 ring-slate-900/5">
                  <p className="text-lg font-semibold text-slate-800">
                    {callerName}
                  </p>
                </div>
              )
            )}

            {/* Phone number */}
            <p className="text-base text-slate-600 font-medium mt-1">
              {callerNumber}
            </p>

            {/* Call duration with gradient */}
            {isConnected && (
              <div className="mt-4 inline-flex items-center px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-50 to-cyan-50 ring-1 ring-blue-900/10">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
                  <p className="text-3xl font-mono font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                    {formatDuration(callDuration)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            {!isConnected ? (
              <>
                {/* Decline button */}
                <button
                  onClick={onReject}
                  className="group flex-1 relative overflow-hidden rounded-xl bg-gradient-to-br from-red-500 to-rose-600 px-6 py-4 text-lg font-semibold text-white shadow-lg shadow-red-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-red-500/40 hover:-translate-y-0.5 active:scale-95"
                >
                  <div className="relative flex items-center justify-center gap-2">
                    <svg
                      className="h-6 w-6 transition-transform duration-300 group-hover:rotate-90"
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

                {/* Accept button */}
                <button
                  onClick={onAccept}
                  className="group flex-1 relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 px-6 py-4 text-lg font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/40 hover:-translate-y-0.5 active:scale-95"
                >
                  {/* Shimmer effect */}
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                  <div className="relative flex items-center justify-center gap-2">
                    <svg
                      className="h-6 w-6 transition-transform duration-300 group-hover:scale-110"
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
              </>
            ) : (
              <>
                {/* Mute / Unmute button */}
                {onToggleMute && (
                  <button
                    type="button"
                    aria-pressed={isMuted}
                    aria-label={isMuted ? "Unmute call" : "Mute call"}
                    onClick={onToggleMute}
                    className={`group flex-1 relative overflow-hidden rounded-xl px-6 py-4 text-lg font-semibold shadow-lg transition-all duration-300 hover:-translate-y-0.5 active:scale-95 ${
                      isMuted
                        ? "bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-amber-500/30"
                        : "bg-slate-100 text-slate-700 shadow-slate-200 hover:bg-slate-200"
                    }`}
                  >
                    <div className="relative flex items-center justify-center gap-2">
                      <svg
                        className="h-6 w-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        {isMuted ? (
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 9l4 4m0-4l-4 4"
                          />
                        ) : (
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 11a7 7 0 01-14 0m7 7v3m-4 0h8M12 3a3 3 0 00-3 3v5a3 3 0 006 0V6a3 3 0 00-3-3z"
                          />
                        )}
                      </svg>
                      {isMuted ? "Unmute" : "Mute"}
                    </div>
                  </button>
                )}

                {/* End Call button */}
                <button
                  onClick={onEndCall ? onEndCall : onReject}
                  className="group flex-1 relative overflow-hidden rounded-xl bg-gradient-to-br from-red-500 to-rose-600 px-6 py-4 text-lg font-semibold text-white shadow-lg shadow-red-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-red-500/40 hover:-translate-y-0.5 active:scale-95"
                >
                  <div className="relative flex items-center justify-center gap-2">
                    <svg
                      className="h-6 w-6 transition-transform duration-300 group-hover:rotate-90"
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
                    End Call
                  </div>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
