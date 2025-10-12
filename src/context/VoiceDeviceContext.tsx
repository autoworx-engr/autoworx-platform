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
import { InfobipRTCEvent, CallsApiEvent } from "infobip-rtc";

type VoiceProvider = "TWILIO" | "INFOBIP";

interface VoiceDeviceContextType {
  device: Device | any | null;
  incomingCall: Call | any | null;
  isDeviceReady: boolean;
  setupDevice: (phoneNumber: string, provider: VoiceProvider) => Promise<void>;
  acceptIncomingCall: () => void;
  rejectIncomingCall: () => void;
  currentConnection: Call | any | null;
  callStatus: string;
  callDuration: number;
  endCall: () => void;
  provider: VoiceProvider;
  makeCall: (to: string, clientId: number) => Promise<void>;
}

const VoiceDeviceContext = createContext<VoiceDeviceContextType | undefined>(
  undefined
);

export function useVoiceDevice() {
  const context = useContext(VoiceDeviceContext);
  if (!context) {
    throw new Error("useVoiceDevice must be used within VoiceDeviceProvider");
  }
  return context;
}

export function VoiceDeviceProvider({ children }: { children: ReactNode }) {
  const [device, setDevice] = useState<Device | any | null>(null);
  const [incomingCall, setIncomingCall] = useState<Call | any | null>(null);
  const [currentConnection, setCurrentConnection] = useState<Call | any | null>(
    null
  );
  const [isDeviceReady, setIsDeviceReady] = useState(false);
  const [callStatus, setCallStatus] = useState("");
  const [callDuration, setCallDuration] = useState(0);
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);
  const [provider, setProvider] = useState<VoiceProvider>("TWILIO");
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [infobipPhoneNumber, setInfobipPhoneNumber] = useState<string | null>(
    null
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [timer]);

  // Setup device for either Twilio or Infobip
  const setupDevice = useCallback(
    async (phoneNumber: string, voiceProvider: VoiceProvider) => {
      try {
        console.log(
          `🔧 [Global] Setting up ${voiceProvider} device with identity:`,
          phoneNumber
        );

        setProvider(voiceProvider);

        if (voiceProvider === "TWILIO") {
          await setupTwilioDevice(phoneNumber);
        } else if (voiceProvider === "INFOBIP") {
          await setupInfobipDevice(phoneNumber);
        }
      } catch (error) {
        console.error(
          `❌ [Global] Error setting up ${voiceProvider} Device:`,
          error
        );
        setCallStatus(
          `Setup failed: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    },
    []
  );

  // Setup Twilio Device
  const setupTwilioDevice = async (twilioPhoneNumber: string) => {
    const response = await fetch("/api/twilio/token", {
      method: "POST",
      body: JSON.stringify({ identity: twilioPhoneNumber }),
      headers: { "Content-Type": "application/json" },
    });

    const data = await response.json();

    if (!data.token) {
      throw new Error("No token received from server");
    }

    const { token } = data;
    const twilioDevice = new Device(token);

    twilioDevice.on("ready", () => {
      console.log("✅ [Twilio] Device is ready and listening for calls");
      setIsDeviceReady(true);
      setCallStatus("Device is ready");
    });

    twilioDevice.on("registered", () => {
      console.log("✅ [Twilio] Device registered");
      setIsDeviceReady(true);
    });

    twilioDevice.on("unregistered", () => {
      console.log("⚠️ [Twilio] Device unregistered");
      setIsDeviceReady(false);
    });

    twilioDevice.on("error", (error) => {
      console.error("❌ [Twilio] Device Error:", error);
      setCallStatus(`Error: ${error.message}`);
    });

    twilioDevice.on("incoming", (call: Call) => {
      console.log("📞 [Twilio] Incoming call detected!");
      setIncomingCall(call);
      setCallStatus("Incoming call...");
    });

    await twilioDevice.register();
    setDevice(twilioDevice);
  };

  // Setup Infobip Device using WebRTC SDK
  const setupInfobipDevice = async (phoneNumber: string) => {
    try {
      // Store the Infobip phone number for use in calls
      setInfobipPhoneNumber(phoneNumber);

      // Get WebRTC token from backend
      const response = await fetch("/api/infobip/voice/token", {
        method: "POST",
        body: JSON.stringify({ identity: phoneNumber, companyId }),
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (!data.token) {
        throw new Error("No token received from Infobip server");
      }

      console.log("🔑 [Infobip] Token received, initializing WebRTC...");

      // Dynamic import of Infobip RTC client
      const createInfobipRTC = (await import("@/lib/infobip-rtc")).default;
      const infobipRtcFactory = createInfobipRTC({ debug: true });

      if (!infobipRtcFactory) {
        throw new Error("Failed to load Infobip RTC SDK");
      }

      // Create RTC client instance with token
      const infobipRTC = infobipRtcFactory(data.token, { debug: true });

      if (!infobipRTC) {
        throw new Error("Failed to create Infobip RTC client");
      }

      console.log("✅ [Infobip] WebRTC client created with token");

      // Connect to Infobip RTC
      infobipRTC.connect();

      // Handle connection events
      infobipRTC.on(InfobipRTCEvent.CONNECTED, () => {
        console.log("✅ [Infobip] WebRTC connected and ready");
        setIsDeviceReady(true);
        setCallStatus("Device is ready");
      });

      infobipRTC.on(InfobipRTCEvent.DISCONNECTED, () => {
        console.log("⚠️ [Infobip] WebRTC disconnected");
        setIsDeviceReady(false);
        setCallStatus("Disconnected");
      });

      // Listen for incoming WebRTC calls
      infobipRTC.on(
        InfobipRTCEvent.INCOMING_WEBRTC_CALL,
        (incomingCallEvent: any) => {
          console.log("📞 [Infobip] Incoming WebRTC call detected!");
          console.log(
            "📞 [Infobip] From:",
            incomingCallEvent.source().identity
          );

          setIncomingCall(incomingCallEvent);
          setCallStatus("Incoming call...");
        }
      );

      // Note: No generic "error" event - errors are handled per call

      setDevice(infobipRTC);
    } catch (error) {
      console.error("❌ [Infobip] Setup failed:", error);
      throw error;
    }
  };

  // Make outgoing call
  const makeCall = useCallback(
    async (to: string, clientId: number) => {
      if (!device || !isDeviceReady) {
        console.warn("Device not ready");
        setCallStatus("Device not ready");
        return;
      }

      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });

        if (provider === "TWILIO") {
          const options = { params: { To: to } };
          const connection = await device.connect(options);

          setupConnectionListeners(connection);
          setCurrentConnection(connection);
        } else if (provider === "INFOBIP") {
          // Make call via Infobip WebRTC to phone number
          console.log(`📞 [Infobip] Initiating call to ${to}...`);
          console.log(`📞 [Infobip] From number: ${infobipPhoneNumber}`);

          if (!infobipPhoneNumber) {
            throw new Error(
              "Infobip phone number not set. Please setup device first."
            );
          }

          // Import PhoneCallOptions
          const { PhoneCallOptions } = await import("infobip-rtc");

          // Create call options with from number
          const callOptions = PhoneCallOptions.builder()
            .setFrom(infobipPhoneNumber)
            .setAudio(true)
            .build();

          // Use callPhone for calling regular phone numbers
          const infobipCall = device.callPhone(to, callOptions);
          console.log("🚀 ~ VoiceDeviceProvider ~ infobipCall:", infobipCall);

          if (!infobipCall) {
            throw new Error("Failed to initiate call");
          }

          // Setup Infobip call event listeners using CallsApiEvent
          infobipCall.on(CallsApiEvent.RINGING, () => {
            console.log("📞 [Infobip] Call ringing...");
            setCallStatus("Ringing...");
          });

          infobipCall.on(CallsApiEvent.ESTABLISHED, () => {
            console.log("✅ [Infobip] Call established");
            setCallStatus("Call connected");
            setCallDuration(0);

            if (timer) clearInterval(timer);

            const interval = setInterval(() => {
              setCallDuration((prev) => prev + 1);
            }, 1000);
            setTimer(interval);
          });

          infobipCall.on(CallsApiEvent.HANGUP, () => {
            console.log("📞 [Infobip] Call ended");
            setCallStatus("Call ended");
            setCurrentConnection(null);
            if (timer) {
              clearInterval(timer);
              setTimer(null);
            }
          });

          infobipCall.on(CallsApiEvent.ERROR, (error: any) => {
            console.error("❌ [Infobip] Call error:", error);
            setCallStatus("Call error occurred");
            setCurrentConnection(null);
            if (timer) {
              clearInterval(timer);
              setTimer(null);
            }
          });

          setCurrentConnection(infobipCall);
          setCallStatus("Calling...");
        }
      } catch (error) {
        console.error("Error making call:", error);
        setCallStatus("Failed to make call");
      }
    },
    [device, isDeviceReady, provider, companyId, timer]
  );

  // Setup connection listeners (for Twilio)
  const setupConnectionListeners = (connection: Call) => {
    connection.on("accept", () => {
      console.log("✅ [Call] Connected");
      setCallStatus("Call connected");
      setCallDuration(0);

      if (timer) clearInterval(timer);

      const interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
      setTimer(interval);
    });

    connection.on("disconnect", () => {
      console.log("📞 [Call] Ended");
      setCallStatus("Call ended");
      setCurrentConnection(null);
      if (timer) {
        clearInterval(timer);
        setTimer(null);
      }
    });

    connection.on("cancel", () => {
      console.log("⚠️ [Call] Canceled");
      setCallStatus("Call canceled");
      setCurrentConnection(null);
      if (timer) {
        clearInterval(timer);
        setTimer(null);
      }
    });

    connection.on("error", (error) => {
      console.error("❌ [Call] Error:", error);
      setCallStatus("Call error occurred");
      setCurrentConnection(null);
      if (timer) {
        clearInterval(timer);
        setTimer(null);
      }
    });
  };

  // Poll Infobip call status
  const setupInfobipCallPolling = (callId: string) => {
    // Start call duration timer
    setCallDuration(0);
    const interval = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    setTimer(interval);

    // In a real implementation, you'd poll the Infobip API or use webhooks
    // For now, we'll simulate it
    console.log("🔔 [Infobip] Polling call status for:", callId);
  };

  // Accept incoming call
  const acceptIncomingCall = useCallback(async () => {
    if (!incomingCall) return;

    try {
      console.log("📞 [Global] Accepting incoming call...");
      await navigator.mediaDevices.getUserMedia({ audio: true });

      if (provider === "TWILIO") {
        setupConnectionListeners(incomingCall);
        incomingCall.accept();
        setCurrentConnection(incomingCall);
        setIncomingCall(null);
      } else if (provider === "INFOBIP") {
        // Accept Infobip WebRTC call
        console.log("📞 [Infobip] Accepting incoming call...");
        incomingCall.accept();

        // Setup Infobip call event listeners
        incomingCall.on("established", () => {
          console.log("✅ [Infobip] Incoming call established");
          setCallStatus("Call connected");
          setCallDuration(0);

          if (timer) clearInterval(timer);

          const interval = setInterval(() => {
            setCallDuration((prev) => prev + 1);
          }, 1000);
          setTimer(interval);
        });

        incomingCall.on("hangup", () => {
          console.log("📞 [Infobip] Incoming call ended");
          setCallStatus("Call ended");
          setCurrentConnection(null);
          if (timer) {
            clearInterval(timer);
            setTimer(null);
          }
        });

        incomingCall.on("error", (error: any) => {
          console.error("❌ [Infobip] Incoming call error:", error);
          setCallStatus("Call error occurred");
          setCurrentConnection(null);
          if (timer) {
            clearInterval(timer);
            setTimer(null);
          }
        });

        setCurrentConnection(incomingCall);
        setIncomingCall(null);
      }
    } catch (error) {
      console.error("❌ [Global] Error accepting call:", error);
      setCallStatus(
        `Failed to accept call: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      setIncomingCall(null);
    }
  }, [incomingCall, provider, timer]);

  // Reject incoming call
  const rejectIncomingCall = useCallback(() => {
    if (incomingCall) {
      console.log("❌ [Global] Call rejected");

      if (provider === "TWILIO") {
        incomingCall.reject();
      } else if (provider === "INFOBIP") {
        incomingCall.decline();
      }

      setIncomingCall(null);
      setCallStatus("Call rejected");
    }
  }, [incomingCall, provider]);

  // End call
  const endCall = useCallback(() => {
    if (currentConnection) {
      console.log("📞 [Global] Ending call");

      if (provider === "TWILIO") {
        currentConnection.disconnect();
      } else if (provider === "INFOBIP") {
        currentConnection.hangup();
      }

      setCallStatus("Call ended");
      setCurrentConnection(null);
      if (timer) {
        clearInterval(timer);
        setTimer(null);
      }
    }
  }, [currentConnection, provider, timer]);

  return (
    <VoiceDeviceContext.Provider
      value={{
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
        provider,
        makeCall,
      }}
    >
      {children}
    </VoiceDeviceContext.Provider>
  );
}
