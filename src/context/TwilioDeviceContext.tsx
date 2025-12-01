"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { Call, Device } from "@twilio/voice-sdk";

interface TwilioDeviceContextType {
  device: Device | null;
  incomingCall: Call | null;
  isDeviceReady: boolean;
  setupDevice: (twilioPhoneNumber: string) => Promise<void>;
  acceptIncomingCall: () => void;
  rejectIncomingCall: () => void;
  currentConnection: Call | null;
  callStatus: string;
  callDuration: number;
  endCall: () => void;
}

const TwilioDeviceContext = createContext<TwilioDeviceContextType | undefined>(
  undefined
);

export function useTwilioDevice() {
  const context = useContext(TwilioDeviceContext);
  if (!context) {
    throw new Error("useTwilioDevice must be used within TwilioDeviceProvider");
  }
  return context;
}

export function TwilioDeviceProvider({ children }: { children: ReactNode }) {
  const [device, setDevice] = useState<Device | null>(null);
  const [incomingCall, setIncomingCall] = useState<Call | null>(null);
  const [currentConnection, setCurrentConnection] = useState<Call | null>(null);
  const [isDeviceReady, setIsDeviceReady] = useState(false);
  const [callStatus, setCallStatus] = useState("");
  const [callDuration, setCallDuration] = useState(0);
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);

  const setupDevice = useCallback(async (twilioPhoneNumber: string) => {
    try {
      console.log(
        "🔧 [Global] Setting up Twilio device with identity:",
        twilioPhoneNumber
      );

      const response = await fetch("/api/twilio/token", {
        method: "POST",
        body: JSON.stringify({ identity: twilioPhoneNumber }),
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();
      console.log("🔑 [Global] Token received");

      if (!data.token) {
        throw new Error("No token received from server");
      }

      const { token } = data;
      const twilioDevice = new Device(token);

      twilioDevice.on("ready", () => {
        console.log(
          "✅ [Global] Twilio Device is ready and listening for calls"
        );
        console.log("📱 [Global] Device identity:", twilioPhoneNumber);
        setIsDeviceReady(true);
        setCallStatus("Device is ready");
      });

      twilioDevice.on("registered", () => {
        console.log("✅ [Global] Device registered and ready to receive calls");
        setIsDeviceReady(true);
      });

      twilioDevice.on("unregistered", () => {
        console.log("⚠️ [Global] Device unregistered");
        setIsDeviceReady(false);
      });

      twilioDevice.on("error", (error) => {
        console.error("❌ [Global] Twilio Device Error:", error);
        setCallStatus(`Error: ${error.message}`);
      });

      // Listen for incoming calls
      twilioDevice.on("incoming", (call: Call) => {
        console.log("📞 [Global] Incoming call detected!");
        console.log("📞 [Global] Call from:", call.parameters.From);
        console.log("📞 [Global] Call to:", call.parameters.To);
        console.log("📞 [Global] Call parameters:", call.parameters);
        setIncomingCall(call);
        setCallStatus("Incoming call...");
      });

      // Register the device
      await twilioDevice.register();
      console.log("📱 [Global] Device registered successfully");

      setDevice(twilioDevice);
    } catch (error) {
      console.error("❌ [Global] Error setting up Twilio Device:", error);
      setCallStatus(
        `Setup failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }, []);

  const acceptIncomingCall = useCallback(async () => {
    if (!incomingCall) return;

    try {
      console.log("📞 [Global] Accepting incoming call...");

      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("🎤 [Global] Microphone permission granted");

      // Setup call event listeners BEFORE accepting
      incomingCall.on("accept", () => {
        console.log("✅ [Global] Call connected");
        setCallStatus("Call connected");
        setCallDuration(0);

        // Clear any existing timer
        if (timer) {
          clearInterval(timer);
        }

        const interval = setInterval(() => {
          setCallDuration((prev) => prev + 1);
        }, 1000);
        setTimer(interval);
      });

      incomingCall.on("disconnect", () => {
        console.log("📞 [Global] Call ended");
        setCallStatus("Call ended");
        setCurrentConnection(null);
        if (timer) {
          clearInterval(timer);
          setTimer(null);
        }
      });

      incomingCall.on("cancel", () => {
        console.log("⚠️ [Global] Call canceled");
        setCallStatus("Call canceled");
        setCurrentConnection(null);
        setIncomingCall(null);
        if (timer) {
          clearInterval(timer);
          setTimer(null);
        }
      });

      incomingCall.on("error", (error) => {
        console.error("❌ [Global] Incoming Call Error:", error);
        setCallStatus("Call error occurred");
        setCurrentConnection(null);
        if (timer) {
          clearInterval(timer);
          setTimer(null);
        }
      });

      // Now accept the call
      incomingCall.accept();
      console.log("✅ [Global] Call accepted, waiting for connection...");
      setCurrentConnection(incomingCall);
      setIncomingCall(null);
    } catch (error) {
      console.error("❌ [Global] Error accepting call:", error);
      setCallStatus(
        `Failed to accept call: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      setIncomingCall(null);
    }
  }, [incomingCall, timer]);

  const rejectIncomingCall = useCallback(() => {
    if (incomingCall) {
      console.log("❌ [Global] Call rejected");
      incomingCall.reject();
      setIncomingCall(null);
      setCallStatus("Call rejected");
    }
  }, [incomingCall]);

  const endCall = useCallback(() => {
    if (currentConnection) {
      console.log("📞 [Global] Ending call");
      currentConnection.disconnect();
      setCallStatus("Call ended");
      setCurrentConnection(null);
      if (timer) clearInterval(timer);
    }
  }, [currentConnection, timer]);

  // Cleanup on unmount ONLY (no dependencies to avoid premature cleanup)
  useEffect(() => {
    return () => {
      if (device) {
        console.log("🧹 [Global] Cleaning up device on unmount");
        device.destroy();
      }
      if (timer) {
        clearInterval(timer);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run on mount/unmount

  const value: TwilioDeviceContextType = {
    device,
    incomingCall,
    isDeviceReady,
    setupDevice,
    acceptIncomingCall,
    rejectIncomingCall,
    currentConnection,
    callStatus,
    callDuration,
    endCall,
  };

  return (
    <TwilioDeviceContext.Provider value={value}>
      {children}
    </TwilioDeviceContext.Provider>
  );
}
