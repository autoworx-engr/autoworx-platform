"use client";
import updateFirstContactTimeClient from "@/actions/communication/client/updateFirstContactTimeClient";
import { Client } from "@prisma/client";
import { Call, Device } from "@twilio/voice-sdk";
import { useCallback, useEffect, useState } from "react";
import CallStatus from "./CallStatus";
import { useRouter } from "next/navigation";
import IncomingCallAlert from "./IncomingCallAlert";

type TProps = {
  client?: Client | null;
  phoneNumber?: string | null;
};

export default function SendCall({ client, phoneNumber }: TProps) {
  const [device, setDevice] = useState<Device | null>(null);
  const [currentConnection, setCurrentConnection] = useState<Call | null>(null);
  const [incomingCall, setIncomingCall] = useState<Call | null>(null);
  const [callStatus, setCallStatus] = useState("");
  const [callDuration, setCallDuration] = useState(0); // Duration in seconds
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);
  const router = useRouter();
  const setupDevice = useCallback(async () => {
    try {
      console.log("🔧 Setting up Twilio device with identity:", phoneNumber);

      const response = await fetch("/api/twilio/token", {
        method: "POST",
        body: JSON.stringify({ identity: phoneNumber }),
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();
      console.log("🔑 Token received");

      if (!data.token) {
        throw new Error("No token received from server");
      }

      const { token } = data;

      const twilioDevice = new Device(token);

      twilioDevice.on("ready", () => {
        console.log("✅ Twilio Device is ready and listening for calls");
        console.log("📱 Device identity:", phoneNumber);
        setCallStatus("Device is ready");
      });

      twilioDevice.on("registered", () => {
        console.log("✅ Device registered and ready to receive calls");
      });

      twilioDevice.on("unregistered", () => {
        console.log("⚠️ Device unregistered");
      });

      twilioDevice.on("error", (error) => {
        console.error("❌ Twilio Device Error:", error);
        setCallStatus(`Error: ${error.message}`);
      });

      // Listen for incoming calls
      twilioDevice.on("incoming", (call: Call) => {
        console.log("📞 Incoming call detected!");
        console.log("📞 Call from:", call.parameters.From);
        console.log("📞 Call to:", call.parameters.To);
        console.log("📞 Call parameters:", call.parameters);
        setIncomingCall(call);
        setCallStatus("Incoming call...");
      });

      // Register the device
      await twilioDevice.register();
      console.log("📱 Device registered successfully");

      setDevice(twilioDevice);
    } catch (error) {
      console.error("❌ Error setting up Twilio Device:", error);
      setCallStatus(
        `Setup failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }, [phoneNumber]);

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

  const acceptIncomingCall = async () => {
    if (!incomingCall) return;

    // Request microphone permission
    await navigator.mediaDevices.getUserMedia({ audio: true });

    // Accept the call
    incomingCall.accept();
    setCurrentConnection(incomingCall);
    setIncomingCall(null);

    // Setup call event listeners
    incomingCall.on("accept", () => {
      setCallStatus("Call connected");
      setCallDuration(0);
      const interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
      setTimer(interval);
    });

    incomingCall.on("disconnect", () => {
      setCallStatus("Call ended");
      setCurrentConnection(null);
      if (timer) clearInterval(timer);
      setTimeout(() => {
        router.refresh();
      }, 3000);
    });

    incomingCall.on("cancel", () => {
      setCallStatus("Call canceled");
      setCurrentConnection(null);
      setIncomingCall(null);
      if (timer) clearInterval(timer);
    });

    incomingCall.on("error", (error) => {
      console.error("Incoming Call Error:", error);
      setCallStatus("Call error occurred");
    });
  };

  const rejectIncomingCall = () => {
    if (incomingCall) {
      incomingCall.reject();
      setIncomingCall(null);
      setCallStatus("Call rejected");
    }
  };

  if (!client) return null;

  return (
    <>
      <IncomingCallAlert
        incomingCall={incomingCall}
        onAccept={acceptIncomingCall}
        onReject={rejectIncomingCall}
      />
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
