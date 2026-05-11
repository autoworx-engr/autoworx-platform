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
  };

  const handleSetupDevice = async () => {
    if (phoneNumber) {
      await globalSetupDevice(phoneNumber, provider);
    }
  };

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
        {/* Setup Device Button */}
        <button
          className={`group relative overflow-hidden w-full rounded-xl px-4 py-3.5 text-base font-semibold text-white shadow-lg transition-all duration-300 ${
            isDeviceReady
              ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/20 cursor-default"
              : "bg-gradient-to-br from-[#6571FF] to-[#5563E8] shadow-[#6571FF]/20 hover:shadow-xl hover:shadow-[#6571FF]/30 hover:-translate-y-0.5 active:scale-95"
          }`}
          onClick={handleSetupDevice}
          disabled={isDeviceReady || !canUseVoice}
        >
          {!isDeviceReady && (
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
          )}
          <div className="relative flex items-center justify-center gap-2">
            {isDeviceReady ? (
              <>
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Device Ready
              </>
            ) : (
              "Setup Device"
            )}
          </div>
        </button>

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
      <CallStatus callStatus={callStatus} callDuration={callDuration} />
    </>
  );
}
