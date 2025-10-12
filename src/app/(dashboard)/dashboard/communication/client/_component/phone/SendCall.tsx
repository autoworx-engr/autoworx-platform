"use client";
import updateFirstContactTimeClient from "@/actions/communication/client/updateFirstContactTimeClient";
import { Client } from "@prisma/client";
import { Call } from "@twilio/voice-sdk";
import { useEffect, useState } from "react";
import CallStatus from "./CallStatus";
import { useRouter } from "next/navigation";
import { useVoiceDevice } from "@/context/VoiceDeviceContext";

type TProps = {
  client?: Client | null;
  phoneNumber?: string | null;
  provider?: "TWILIO" | "INFOBIP";
};

export default function SendCall({
  client,
  phoneNumber,
  provider = "TWILIO",
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

  // Determine which connection is active (global incoming or local outgoing)
  const currentConnection = globalConnection || localConnection;
  const callStatus = globalConnection ? globalCallStatus : localCallStatus;
  const callDuration = globalConnection
    ? globalCallDuration
    : localCallDuration;

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timer) clearInterval(timer);
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

      // Use unified makeCall function that handles both providers
      if (activeProvider === "TWILIO") {
        // Twilio-specific call logic (existing)
        await navigator.mediaDevices.getUserMedia({ audio: true });
        const options = { params: { To: client?.mobile } };
        const connection = await device.connect(options);

        if (connection) {
          connection.on("accept", async () => {
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
            setTimeout(() => {
              router.refresh();
            }, 3000);
          });

          connection.on("cancel", () => {
            setLocalCallStatus("Call canceled");
            setLocalConnection(null);
            if (timer) clearInterval(timer);
          });

          connection.on("error", (error: any) => {
            console.error("Connection Error:", error);
            setLocalCallStatus("Call error occurred");
          });

          setLocalConnection(connection);
        }
      } else if (activeProvider === "INFOBIP") {
        // Use the global makeCall for Infobip
        await globalMakeCall(client.mobile, client.id);
        setLocalCallStatus("Calling...");
      }
    } catch (error) {
      console.error("Error making call:", error);
      setLocalCallStatus("Failed to make call");
    }
  };

  const endCall = () => {
    if (globalConnection) {
      // End global incoming call
      globalEndCall();
      setTimeout(() => {
        router.refresh();
      }, 3000);
    } else if (localConnection) {
      // End local outgoing call
      localConnection.disconnect();
      setLocalCallStatus("Call ended");
      setLocalConnection(null);
      if (timer) clearInterval(timer);
      setTimeout(() => {
        router.refresh();
      }, 3000);
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
      <div className="mt-auto flex w-full gap-4">
        <button
          className={`w-full rounded-lg px-4 py-3 text-lg font-semibold text-white shadow transition ${
            isDeviceReady ? "bg-green-600" : "bg-purple-700 hover:bg-purple-800"
          }`}
          onClick={handleSetupDevice}
          disabled={isDeviceReady}
        >
          {isDeviceReady ? "Device Ready ✓" : "Setup Device"}
        </button>
        <button
          className={`w-full rounded-lg px-4 py-3 text-lg font-semibold text-white shadow transition ${
            isDeviceReady && !currentConnection
              ? "bg-green-600 hover:bg-green-700"
              : "cursor-not-allowed bg-gray-400"
          }`}
          onClick={makeCall}
          disabled={!isDeviceReady || !!currentConnection}
        >
          Make Call
        </button>
        <button
          className={`w-full rounded-lg px-4 py-3 text-lg font-semibold text-white shadow transition ${
            currentConnection
              ? "bg-red-600 hover:bg-red-700"
              : "cursor-not-allowed bg-gray-400"
          }`}
          onClick={endCall}
          disabled={!currentConnection}
        >
          End Call
        </button>
      </div>
      <CallStatus callStatus={callStatus} callDuration={callDuration} />
    </>
  );
}
