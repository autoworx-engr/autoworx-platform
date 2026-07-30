"use client";
import updateFirstContactTimeClient from "@/actions/communication/client/updateFirstContactTimeClient";
import UpgradePlanBanner from "@/components/UpgradePlanBanner";
import { useVoiceDevice } from "@/context/VoiceDeviceContext";
import { Client } from "@prisma/client";
import { Call } from "@twilio/voice-sdk";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import CallStatus from "./CallStatus";

type TProps = {
  client?: Client | null;
  phoneNumber?: string | null;
  provider?: "TWILIO" | "INFOBIP";
  canUseVoice?: boolean;
};

export default function SendCall({
  client,
  phoneNumber,
  provider = "TWILIO",
  canUseVoice = true,
}: TProps) {
  const router = useRouter();
  const {
    device,
    setupDevice: globalSetupDevice,
    isDeviceReady,
    currentConnection: globalConnection,
    callStatus: globalCallStatus,
    callDuration: globalCallDuration,
    endCall: globalEndCall,
    makeCall: globalMakeCall,
    provider: activeProvider,
  } = useVoiceDevice();

  const [localConnection, setLocalConnection] = useState<Call | null>(null);
  const [localCallStatus, setLocalCallStatus] = useState("");
  const [localCallDuration, setLocalCallDuration] = useState(0);
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const micStreamRef = useRef<MediaStream | null>(null);

  // Determine which connection is active (global incoming or local outgoing)
  const currentConnection = globalConnection || localConnection;
  const callStatus = globalConnection ? globalCallStatus : localCallStatus;
  const callDuration = globalConnection
    ? globalCallDuration
    : localCallDuration;

  const stopMicStream = () => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
  };

  // Cleanup timer + mic stream on unmount
  useEffect(() => {
    return () => {
      if (timer) clearInterval(timer);
      stopMicStream();
    };
  }, [timer]);

  const makeCall = async () => {
    if (!device || !isDeviceReady) {
      console.warn("Device not ready. Please wait for device to initialize.");
      setLocalCallStatus("Device not ready");
      return;
    }
    if (!client?.mobile) return;

    try {
      setLocalCallStatus("Connecting…");
      setLocalCallDuration(0);

      // Update first contact time
      await updateFirstContactTimeClient(client?.id);

      if (activeProvider === "TWILIO") {
        micStreamRef.current = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        const connection = await device.connect({
          params: { To: client.mobile },
        });

        if (connection) {
          connection.on("accept", () => {
            setLocalCallStatus("Call connected");
            setLocalCallDuration(0);
            const interval = setInterval(() => {
              setLocalCallDuration((prev) => prev + 1);
            }, 1000);
            setTimer(interval);
          });

          connection.on("disconnect", () => {
            setLocalCallStatus("Call ended");
            setLocalConnection(null);
            if (timer) clearInterval(timer);
            stopMicStream();
            // Twilio processes recordings async, give the webhook ~6s then
            // refresh once. The 5-stage polling that lived here previously
            // hit the server five times per call for no extra gain.
            setTimeout(() => router.refresh(), 6000);
          });

          connection.on("cancel", () => {
            setLocalCallStatus("Call canceled");
            setLocalConnection(null);
            if (timer) clearInterval(timer);
            stopMicStream();
          });

          connection.on("error", (error: unknown) => {
            console.error("Connection Error:", error);
            setLocalCallStatus("Call error occurred");
            stopMicStream();
          });

          setLocalConnection(connection);
        } else {
          stopMicStream();
        }
      } else if (activeProvider === "INFOBIP") {
        await globalMakeCall(client.mobile, client.id);
        setLocalCallStatus("Calling...");
      }
    } catch (error) {
      console.error("Error making call:", error);
      setLocalCallStatus("Failed to make call");
      stopMicStream();
    }
  };

  const endCall = () => {
    if (globalConnection) {
      globalEndCall();
      setTimeout(() => router.refresh(), 3000);
    } else if (localConnection) {
      localConnection.disconnect();
      setLocalCallStatus("Call ended");
      setLocalConnection(null);
      if (timer) clearInterval(timer);
      stopMicStream();
      setTimeout(() => router.refresh(), 3000);
    }
    setIsMuted(false);
  };

  // Mute/unmute the active call. currentConnection covers both the local
  // outgoing call and a global incoming one; both expose Twilio's .mute(bool).
  const toggleMute = () => {
    if (!currentConnection) return;
    const next = !isMuted;
    try {
      currentConnection.mute(next);
      setIsMuted(next);
    } catch (error) {
      console.error("Failed to toggle mute:", error);
    }
  };

  // Reset mute when the active call goes away (each call starts un-muted).
  useEffect(() => {
    if (!currentConnection) setIsMuted(false);
  }, [currentConnection]);

  useEffect(() => {
    if (phoneNumber && !isDeviceReady && canUseVoice) {
      globalSetupDevice(phoneNumber, provider);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phoneNumber, isDeviceReady, canUseVoice]);

  if (!client) return null;

  return (
    <>
      {!canUseVoice && (
        <div className="mb-3">
          <UpgradePlanBanner
            title="Voice calling is not included in your plan"
            description="Upgrade to make and receive calls directly from the platform."
            ctaLabel="Upgrade Plan"
          />
        </div>
      )}
      <div className="mt-auto flex w-full gap-3">
        {/* Make Call Button */}
        <button
          className={`group relative overflow-hidden w-full rounded-xl px-4 py-3.5 text-base font-semibold text-white shadow-lg transition-all duration-300 ${
            isDeviceReady && !currentConnection && canUseVoice
              ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/30 hover:-translate-y-0.5 active:scale-95"
              : "bg-slate-300 text-slate-500 cursor-not-allowed shadow-none"
          }`}
          onClick={makeCall}
          disabled={!isDeviceReady || !!currentConnection || !canUseVoice}
        >
          {isDeviceReady && !currentConnection && canUseVoice && (
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
          )}
          <div className="relative flex items-center justify-center gap-2">
            <svg
              className="h-5 w-5"
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
            Make Call
          </div>
        </button>

        {/* Mute Button — only while a call is active */}
        {currentConnection && (
          <button
            type="button"
            aria-pressed={isMuted}
            aria-label={isMuted ? "Unmute call" : "Mute call"}
            className={`group relative overflow-hidden w-full rounded-xl px-4 py-3.5 text-base font-semibold shadow-lg transition-all duration-300 hover:-translate-y-0.5 active:scale-95 ${
              isMuted
                ? "bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-amber-500/20"
                : "bg-slate-100 text-slate-700 shadow-slate-200 hover:bg-slate-200"
            }`}
            onClick={toggleMute}
          >
            <div className="relative flex items-center justify-center gap-2">
              {isMuted ? (
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 9l4 4m0-4l-4 4"
                  />
                </svg>
              ) : (
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11a7 7 0 01-14 0m7 7v3m-4 0h8M12 3a3 3 0 00-3 3v5a3 3 0 006 0V6a3 3 0 00-3-3z"
                  />
                </svg>
              )}
              {isMuted ? "Unmute" : "Mute"}
            </div>
          </button>
        )}

        {/* End Call Button */}
        <button
          className={`group relative overflow-hidden w-full rounded-xl px-4 py-3.5 text-base font-semibold text-white shadow-lg transition-all duration-300 ${
            currentConnection
              ? "bg-gradient-to-br from-red-500 to-rose-600 shadow-red-500/20 hover:shadow-xl hover:shadow-red-500/30 hover:-translate-y-0.5 active:scale-95"
              : "bg-slate-300 text-slate-500 cursor-not-allowed shadow-none"
          }`}
          onClick={endCall}
          disabled={!currentConnection}
        >
          <div className="relative flex items-center justify-center gap-2">
            <svg
              className={`h-5 w-5 transition-transform duration-300 ${currentConnection ? "group-hover:rotate-90" : ""}`}
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
      </div>
      {canUseVoice && (
        <CallStatus
          callStatus={callStatus}
          callDuration={callDuration}
          isDeviceReady={isDeviceReady}
          hasActiveCall={!!currentConnection}
        />
      )}
    </>
  );
}
