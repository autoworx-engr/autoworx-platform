"use client";
import updateFirstContactTimeClient from "@/actions/communication/client/updateFirstContactTimeClient";
import { Client } from "@prisma/client";
import { Call, Device } from "@twilio/voice-sdk";
import { useCallback, useEffect, useState } from "react";
import CallStatus from "./CallStatus";
import { useRouter } from "next/navigation";

type TProps = {
  client?: Client | null;
  phoneNumber?: string | null;
};

export default function SendCall({ client, phoneNumber }: TProps) {
  const [device, setDevice] = useState<Device | null>(null);
  const [currentConnection, setCurrentConnection] = useState<Call | null>(null);
  const [callStatus, setCallStatus] = useState("");
  const [callDuration, setCallDuration] = useState(0); // Duration in seconds
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);
  const router = useRouter();
  const setupDevice = useCallback(async () => {
    try {
      const response = await fetch("/api/twilio/token", {
        method: "POST",
        body: JSON.stringify({ identity: phoneNumber }),
        headers: { "Content-Type": "application/json" },
      });

      const { token } = await response.json();

      const twilioDevice = new Device(token);

      twilioDevice.on("ready", () => {
        setCallStatus("Device is ready");
      });

      twilioDevice.on("error", (error) => {
        console.error("Twilio Device Error:", error);
      });

      setDevice(twilioDevice);
    } catch (error) {
      console.error("Error setting up Twilio Device:", error);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (device) device.destroy();
    };
  }, [device]);

  useEffect(() => {
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [timer]);

  const makeCall = async () => {
    if (!device) return;
    if (!client?.mobile) return;
    // 🔐 Ensure mic permission is requested before connecting
    await navigator.mediaDevices.getUserMedia({ audio: true });
    const options = { params: { To: client?.mobile } }; // Replace with recipient's number
    const connection = await device.connect(options);

    if (connection) {
      connection.on("accept", async () => {
        setCallStatus("Call connected");
        await updateFirstContactTimeClient(client?.id);
        setCallDuration(0); // Reset duration
        const interval = setInterval(() => {
          setCallDuration((prev) => prev + 1);
        }, 1000);
        setTimer(interval);
      });

      connection.on("disconnect", () => {
        setCallStatus("Call ended");
        setCurrentConnection(null);
        if (timer) clearInterval(timer);
      });

      connection.on("cancel", () => {
        setCallStatus("Call canceled");
        setCurrentConnection(null);
        if (timer) clearInterval(timer);
      });
      connection.on("error", (error) => {
        console.error("Connection Error:", error);
        setCallStatus("Call error occurred");
      });

      setCurrentConnection(connection);
    }
  };

  const endCall = () => {
    if (currentConnection) {
      currentConnection.disconnect();
      setCallStatus("Call ended");
      setCurrentConnection(null);
      if (timer) clearInterval(timer);
      setTimeout(() => {
        router.refresh();
      }, 3000);
    }
  };

  if (!client) return null;

  return (
    <>
      <div className="mt-auto flex w-full gap-4">
        <button
          className="w-full rounded-lg bg-purple-700 px-4 py-3 text-lg font-semibold text-white shadow transition hover:bg-purple-800"
          onClick={setupDevice}
        >
          Setup Device
        </button>
        <button
          className={`w-full rounded-lg px-4 py-3 text-lg font-semibold text-white shadow transition ${
            device && !currentConnection
              ? "bg-green-600 hover:bg-green-700"
              : "cursor-not-allowed bg-gray-400"
          }`}
          onClick={makeCall}
          disabled={!device || !!currentConnection}
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
