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
import { pusher } from "@/lib/pusher/client";
import { useSession } from "next-auth/react";

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
  isMuted: boolean;
  toggleMute: () => void;
}

const VoiceDeviceContext = createContext<VoiceDeviceContextType | undefined>(
  undefined,
);

export function useVoiceDevice() {
  const context = useContext(VoiceDeviceContext);
  if (!context) {
    throw new Error("useVoiceDevice must be used within VoiceDeviceProvider");
  }
  return context;
}

export function VoiceDeviceProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const companyId = session?.user?.companyId ?? null;
  const [device, setDevice] = useState<Device | any | null>(null);
  const [incomingCall, setIncomingCall] = useState<Call | any | null>(null);
  const [currentConnection, setCurrentConnection] = useState<Call | any | null>(
    null,
  );
  const [isDeviceReady, setIsDeviceReady] = useState(false);
  const [callStatus, setCallStatus] = useState("");
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);
  const [provider, setProvider] = useState<VoiceProvider>("TWILIO");
  const [infobipPhoneNumber, setInfobipPhoneNumber] = useState<string | null>(
    null,
  );
  const [infobipCallsConfigId, setInfobipCallsConfigId] = useState<
    string | null
  >(null);
  const [currentCallSid, setCurrentCallSid] = useState<string | null>(null);
  const [deviceId] = useState<string>(() => {
    // Generate a unique ID for this device instance
    return `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  });
  const [wakeLock, setWakeLock] = useState<any>(null);

  // Subscribe to Pusher events for call state changes
  useEffect(() => {
    if (!companyId) {
      console.log("⏳ [Pusher] Waiting for company ID before subscribing...");
      return;
    }

    const channelName = `company-${companyId}`;
    console.log("📡 [Pusher] Subscribing to channel:", channelName);
    const channel = pusher.subscribe(channelName);

    // Listen for call accepted event
    channel.bind(
      "call-accepted",
      (data: { callSid: string; deviceId?: string }) => {
        console.log("📡 [Pusher] Call accepted event received:", data);
        // Only dismiss if this is NOT the device that accepted the call
        if (data.deviceId && data.deviceId === deviceId) {
          console.log("🔕 This device accepted the call, keeping modal open");
          return;
        }
        // If this is the current incoming call, dismiss it
        if (incomingCall && getCallSid(incomingCall) === data.callSid) {
          console.log("🔕 Dismissing incoming call popup (accepted elsewhere)");
          setIncomingCall(null);
          setCallStatus("Call accepted on another device");
        }
      },
    );

    // Listen for call rejected event
    channel.bind("call-rejected", (data: { callSid: string }) => {
      console.log("📡 [Pusher] Call rejected on another device:", data.callSid);
      // If this is the current incoming call, dismiss it
      if (incomingCall && getCallSid(incomingCall) === data.callSid) {
        console.log("🔕 Dismissing incoming call popup (rejected elsewhere)");
        setIncomingCall(null);
        setCallStatus("Call rejected on another device");
      }
    });

    // Listen for call ended event
    channel.bind(
      "call-ended",
      (data: { callSid: string; deviceId?: string }) => {
        console.log("📡 [Pusher] Call ended event received:", data);
        // Only end if this is NOT the device that ended the call
        if (data.deviceId && data.deviceId === deviceId) {
          console.log("🔕 This device ended the call, already handled locally");
          return;
        }
        // If we have an active connection with this callSid, end it
        const activeCallSid = currentConnection
          ? getCallSid(currentConnection)
          : incomingCall
            ? getCallSid(incomingCall)
            : null;

        if (activeCallSid === data.callSid) {
          console.log("🔕 Ending call on this device (ended elsewhere)");
          // End the connection
          if (currentConnection) {
            if (provider === "TWILIO") {
              currentConnection.disconnect();
            } else if (provider === "INFOBIP") {
              currentConnection.hangup();
            }
          }
          // Clean up state
          setCurrentConnection(null);
          setIncomingCall(null);
          setCurrentCallSid(null);
          setCallStatus("Call ended on another device");
          if (timer) {
            clearInterval(timer);
            setTimer(null);
          }
        }
      },
    );

    return () => {
      console.log("📡 [Pusher] Unsubscribing from channel:", channelName);
      channel.unbind("call-accepted");
      channel.unbind("call-rejected");
      channel.unbind("call-ended");
      pusher.unsubscribe(channelName);
    };
  }, [companyId, incomingCall, currentConnection, provider, timer, deviceId]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [timer]);

  // Helper function to get CallSid from either Twilio or Infobip call
  const getCallSid = (call: Call | any): string | null => {
    if (!call) {
      console.log("🔍 [getCallSid] Call object is null/undefined");
      return null;
    }

    // CRITICAL: For Twilio incoming calls, use ParentCallSid (the database record's CallSid)
    // The CallSid in parameters is the child call (browser leg), not the parent (webhook leg)
    if (call.parameters?.ParentCallSid) {
      console.log(
        "🔍 [getCallSid] Found ParentCallSid (database record):",
        call.parameters.ParentCallSid,
      );
      return call.parameters.ParentCallSid;
    }

    // Check if ParentCallSid is in the Params string (Twilio custom parameters)
    if (call.parameters?.Params) {
      try {
        const params = new URLSearchParams(call.parameters.Params);
        const parentCallSid = params.get("ParentCallSid");
        if (parentCallSid) {
          console.log(
            "🔍 [getCallSid] Found ParentCallSid in Params string (database record):",
            parentCallSid,
          );
          return parentCallSid;
        }
      } catch (error) {
        console.warn("⚠️ [getCallSid] Failed to parse Params string:", error);
      }
    }

    // Fallback to regular CallSid (for outgoing calls or if ParentCallSid not set)
    if (call.parameters?.CallSid) {
      console.log(
        "🔍 [getCallSid] Found Twilio CallSid:",
        call.parameters.CallSid,
      );
      return call.parameters.CallSid;
    }

    // Infobip call might have id()
    if (typeof call.id === "function") {
      const id = call.id();
      console.log("🔍 [getCallSid] Found Infobip id (function):", id);
      return id;
    }
    // Fallback to call.id if it's a property
    const id = call.id || null;
    console.log("🔍 [getCallSid] Found id property:", id);
    return id;
  };

  // Request wake lock to keep screen on during call
  const requestWakeLock = async () => {
    try {
      if ("wakeLock" in navigator) {
        const lock = await (navigator as any).wakeLock.request("screen");
        setWakeLock(lock);
        console.log("🔒 [WakeLock] Screen wake lock acquired");

        lock.addEventListener("release", () => {
          console.log("🔓 [WakeLock] Screen wake lock released");
        });
      } else {
        console.log("⚠️ [WakeLock] Wake Lock API not supported");
      }
    } catch (err) {
      console.error("❌ [WakeLock] Failed to acquire wake lock:", err);
    }
  };

  // Release wake lock
  const releaseWakeLock = async () => {
    if (wakeLock) {
      try {
        await wakeLock.release();
        setWakeLock(null);
        console.log("🔓 [WakeLock] Screen wake lock manually released");
      } catch (err) {
        console.error("❌ [WakeLock] Failed to release wake lock:", err);
      }
    }
  };

  // Handle visibility change to keep microphone active
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (currentConnection) {
        if (document.hidden) {
          console.log(
            "👁️ [Visibility] Page hidden, maintaining audio connection",
          );
        } else {
          console.log("👁️ [Visibility] Page visible, ensuring audio is active");

          // Re-enable audio tracks if they were disabled
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              audio: true,
            });
            stream.getAudioTracks().forEach((track) => {
              track.enabled = true;
              console.log(
                "🎤 [Audio] Audio track re-enabled after visibility change",
              );
            });
          } catch (err) {
            console.error("❌ [Audio] Failed to re-enable audio:", err);
          }

          // Re-request wake lock if it was released
          if (!wakeLock && "wakeLock" in navigator) {
            await requestWakeLock();
          }
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [currentConnection, wakeLock]);

  // Setup device for either Twilio or Infobip
  const setupDevice = useCallback(
    async (phoneNumber: string, voiceProvider: VoiceProvider) => {
      try {
        console.log(
          `🔧 [Global] Setting up ${voiceProvider} device with identity:`,
          phoneNumber,
        );

        setProvider(voiceProvider);

        if (voiceProvider === "TWILIO") {
          phoneNumber &&
            companyId &&
            (await setupTwilioDevice(phoneNumber, companyId));
        } else if (voiceProvider === "INFOBIP") {
          await setupInfobipDevice(phoneNumber);
        }
      } catch (error) {
        console.error(
          `❌ [Global] Error setting up ${voiceProvider} Device:`,
          error,
        );
        setCallStatus(
          `Setup failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session, companyId],
  );

  // Setup Twilio Device
  const setupTwilioDevice = async (
    twilioPhoneNumber: string,
    companyId: number,
  ) => {
    if (!companyId) throw new Error("No companyId received from server");

    const response = await fetch("/api/twilio/token", {
      method: "POST",
      body: JSON.stringify({ identity: twilioPhoneNumber, companyId }),
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

      // CRITICAL: Parse ParentCallSid from Params string (Twilio custom parameters)
      let parentCallSid = call.parameters?.ParentCallSid;
      if (!parentCallSid && call.parameters?.Params) {
        try {
          const params = new URLSearchParams(call.parameters.Params);
          parentCallSid = params.get("ParentCallSid") || "";
        } catch (error) {
          console.warn("⚠️ [Twilio] Failed to parse Params string:", error);
        }
      }

      // Use ParentCallSid (database record) instead of CallSid (browser leg)
      const callSid = parentCallSid || call.parameters?.CallSid || null;
      console.log("📞 [Twilio] ParentCallSid (database):", parentCallSid);
      console.log(
        "📞 [Twilio] CallSid (browser leg):",
        call.parameters?.CallSid,
      );
      console.log("📞 [Twilio] Using CallSid:", callSid);
      console.log("📞 [Twilio] Full call parameters:", call.parameters);
      setCurrentCallSid(callSid);
      setIncomingCall(call);
      setCallStatus("Incoming call...");

      // Listen for call being canceled (caller hung up before answer)
      call.on("cancel", () => {
        console.log("⚠️ [Twilio] Incoming call was canceled by caller");
        setIncomingCall(null);
        setCurrentCallSid(null);
        setCallStatus("Call was canceled");
      });

      // Listen for call being rejected remotely
      call.on("reject", () => {
        console.log("❌ [Twilio] Incoming call was rejected");
        setIncomingCall(null);
        setCurrentCallSid(null);
        setCallStatus("Call was rejected");
      });

      // Listen for call disconnect
      call.on("disconnect", () => {
        console.log("📞 [Twilio] Incoming call disconnected");
        setIncomingCall(null);
        setCurrentCallSid(null);
        setCallStatus("Call disconnected");
      });

      // Listen for call errors
      call.on("error", (error) => {
        console.error("❌ [Twilio] Incoming call error:", error);
        setIncomingCall(null);
        setCurrentCallSid(null);
        setCallStatus("Call error");
      });
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

      console.log("🔑 [Infobip] Token received:", {
        hasToken: !!data.token,
        applicationId: data.applicationId,
        callsConfigurationId: data.callsConfigurationId,
      });
      try {
        if (data?.token && typeof data.token === "string") {
          console.log(
            "🔑 [Infobip] Raw token (first 200 chars):",
            data.token.slice(0, 200),
          );
          const parts = data.token.split(".");
          if (parts.length === 3) {
            const payload = atob(
              parts[1].replace(/-/g, "+").replace(/_/g, "/"),
            );
            console.log("🔑 [Infobip] Decoded token payload:", payload);
          }
        }
      } catch (err) {
        console.warn("Unable to decode token in client", err);
      }
      console.log("🔑 [Infobip] Initializing WebRTC...");

      // Store the calls configuration ID for making calls
      if (data.callsConfigurationId) {
        setInfobipCallsConfigId(data.callsConfigurationId);
        console.log(
          "✅ [Infobip] Calls Configuration ID stored:",
          data.callsConfigurationId,
        );
      } else {
        console.warn(
          "⚠️ [Infobip] No Calls Configuration ID received - calls may fail",
        );
      }

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
            incomingCallEvent.source().identity,
          );

          const callSid = incomingCallEvent.id ? incomingCallEvent.id() : null;
          setCurrentCallSid(callSid);
          setIncomingCall(incomingCallEvent);
          setCallStatus("Incoming call...");

          // Listen for call being canceled/hung up by caller
          incomingCallEvent.on(CallsApiEvent.HANGUP, () => {
            console.log("⚠️ [Infobip] Incoming call was hung up by caller");
            setIncomingCall(null);
            setCurrentCallSid(null);
            setCallStatus("Call was canceled");
          });

          // Listen for call errors
          incomingCallEvent.on(CallsApiEvent.ERROR, (error: any) => {
            console.error("❌ [Infobip] Incoming call error:", error);
            setIncomingCall(null);
            setCurrentCallSid(null);
            setCallStatus("Call error");
          });
        },
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
              "Infobip phone number not set. Please setup device first.",
            );
          }

          // Import PhoneCallOptions
          const { PhoneCallOptions } = await import("infobip-rtc");

          // Create call options with from number
          // Note: callsConfigurationId must be configured in Infobip portal and linked to the Application ID
          const callOptions = PhoneCallOptions.builder()
            .setFrom(infobipPhoneNumber)
            .setAudio(true)
            .build();

          console.log("📋 [Infobip] Call options:", {
            from: infobipPhoneNumber,
            to: to,
            note: "Calls Configuration must be linked to Application ID in Infobip portal",
          });

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

            // Request wake lock to keep screen on and microphone active
            requestWakeLock();
          });

          infobipCall.on(CallsApiEvent.HANGUP, () => {
            console.log("📞 [Infobip] Call ended");
            setCallStatus("Call ended");
            setCurrentConnection(null);
            if (timer) {
              clearInterval(timer);
              setTimer(null);
            }
            // Release wake lock when call ends
            releaseWakeLock();
          });

          infobipCall.on(CallsApiEvent.ERROR, (error: any) => {
            console.error("❌ [Infobip] Call error:", error);
            setCallStatus("Call error occurred");
            setCurrentConnection(null);
            if (timer) {
              clearInterval(timer);
              setTimer(null);
            }
            // Release wake lock on error
            releaseWakeLock();
          });

          setCurrentConnection(infobipCall);
          setCallStatus("Calling...");
        }
      } catch (error) {
        console.error("Error making call:", error);
        setCallStatus("Failed to make call");
      }
    },
    [device, isDeviceReady, provider, companyId, timer],
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

      // Request wake lock to keep screen on and microphone active
      requestWakeLock();
    });

    connection.on("disconnect", () => {
      console.log("📞 [Call] Ended");
      setCallStatus("Call ended");
      setCurrentConnection(null);
      setIncomingCall(null);
      setCurrentCallSid(null);
      if (timer) {
        clearInterval(timer);
        setTimer(null);
      }
      // Release wake lock when call ends
      releaseWakeLock();
    });

    connection.on("cancel", () => {
      console.log("⚠️ [Call] Canceled");
      setCallStatus("Call canceled");
      setCurrentConnection(null);
      setIncomingCall(null);
      setCurrentCallSid(null);
      if (timer) {
        clearInterval(timer);
        setTimer(null);
      }
      // Release wake lock when call is canceled
      releaseWakeLock();
    });

    connection.on("error", (error) => {
      console.error("❌ [Call] Error:", error);
      setCallStatus("Call error occurred");
      setCurrentConnection(null);
      setIncomingCall(null);
      setCurrentCallSid(null);
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
    if (!incomingCall) {
      console.warn("⚠️ [Global] No incoming call to accept");
      return;
    }

    // Prevent double-accept
    if (currentConnection) {
      console.warn("⚠️ [Global] Call already connected");
      return;
    }

    try {
      console.log("📞 [Global] Accepting incoming call...");

      // Get the call SID before accepting
      const callSid = getCallSid(incomingCall);

      // Broadcast that this call was accepted (so other devices dismiss the popup)
      if (callSid && companyId) {
        try {
          console.log(
            "📡 [API] Sending acceptance to /api/twilio/call-state with:",
            {
              callSid,
              action: "accepted",
              companyId,
              deviceId,
            },
          );
          const response = await fetch("/api/twilio/call-state", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              callSid,
              action: "accepted",
              companyId,
              deviceId, // Include deviceId so this device knows to keep modal open
            }),
          });
          const result = await response.json();
          console.log("📡 [API] Call acceptance response:", result);
          if (!response.ok) {
            console.error("⚠️ [API] Call acceptance failed:", result);
          }
        } catch (error) {
          console.error("❌ [API] Failed to broadcast call acceptance:", error);
          // Continue with accepting the call even if broadcast fails
        }
      } else {
        console.warn(
          "⚠️ [Global] Missing callSid or companyId, cannot update database:",
          {
            callSid,
            companyId,
          },
        );
      }

      if (provider === "TWILIO") {
        console.log("📞 [Twilio] Processing call acceptance...");
        console.log("📞 [Twilio] Call state:", incomingCall.status());

        // Setup listeners before accepting
        setupConnectionListeners(incomingCall);

        // Request microphone permission first
        try {
          console.log("🎤 [Audio] Requesting microphone permission...");
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });
          console.log(
            "🎤 [Audio] Microphone permission granted, tracks:",
            stream.getAudioTracks().length,
          );
        } catch (audioError) {
          console.warn("⚠️ [Audio] Microphone permission issue:", audioError);
          // Twilio SDK will request permission when accepting
        }

        // Set connection before accepting
        setCurrentConnection(incomingCall);

        // Accept the call
        console.log("📞 [Twilio] Calling incomingCall.accept()...");
        incomingCall.accept();
        console.log("✅ [Twilio] Accept method called");

        // Keep incomingCall set so the modal stays visible with timer
        // setIncomingCall(null);
        // setCurrentCallSid(null);
      } else if (provider === "INFOBIP") {
        // Accept Infobip WebRTC call
        console.log("📞 [Infobip] Accepting incoming call...");

        // Request microphone permission first
        try {
          await navigator.mediaDevices.getUserMedia({ audio: true });
          console.log("🎤 [Audio] Microphone permission granted");
        } catch (audioError) {
          console.warn("⚠️ [Audio] Microphone permission issue:", audioError);
          // Continue anyway - Infobip SDK will request permission
        }

        // Setup Infobip call event listeners BEFORE accepting
        incomingCall.on("established", () => {
          console.log("✅ [Infobip] Incoming call established");
          setCallStatus("Call connected");
          setCallDuration(0);

          if (timer) clearInterval(timer);

          const interval = setInterval(() => {
            setCallDuration((prev) => prev + 1);
          }, 1000);
          setTimer(interval);

          // Request wake lock to keep screen on and microphone active
          requestWakeLock();
        });

        incomingCall.on("hangup", () => {
          console.log("📞 [Infobip] Incoming call ended");
          setCallStatus("Call ended");
          setCurrentConnection(null);
          setIncomingCall(null);
          setCurrentCallSid(null);
          if (timer) {
            clearInterval(timer);
            setTimer(null);
          }
          // Release wake lock when call ends
          releaseWakeLock();
        });

        incomingCall.on("error", (error: any) => {
          console.error("❌ [Infobip] Incoming call error:", error);
          setCallStatus("Call error occurred");
          setCurrentConnection(null);
          setIncomingCall(null);
          setCurrentCallSid(null);
          if (timer) {
            clearInterval(timer);
            setTimer(null);
          }
          // Release wake lock on error
          releaseWakeLock();
        });

        setCurrentConnection(incomingCall);

        // Accept the call after listeners are set up
        incomingCall.accept();
        console.log("✅ [Infobip] Call accepted");
        // Keep incomingCall set so the modal stays visible with timer
        // setIncomingCall(null);
        // setCurrentCallSid(null);
      }
    } catch (error) {
      console.error("❌ [Global] Error accepting call:", error);
      setCallStatus(
        `Failed to accept call: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      // Clean up on error
      setCurrentConnection(null);
      setIncomingCall(null);
      setCurrentCallSid(null);
    }
  }, [incomingCall, provider, timer, companyId]);

  // Reject incoming call
  const rejectIncomingCall = useCallback(async () => {
    if (incomingCall) {
      console.log("❌ [Global] Call rejected");

      // Get the call SID before rejecting (use stored currentCallSid as fallback)
      let callSid = getCallSid(incomingCall);
      if (!callSid && currentCallSid) {
        console.log(
          "📞 [Global] Using stored currentCallSid as fallback:",
          currentCallSid,
        );
        callSid = currentCallSid;
      }
      console.log("📞 [Global] Rejecting call with SID:", callSid);

      // Broadcast that this call was rejected (so other devices dismiss the popup)
      if (callSid && companyId) {
        try {
          console.log(
            "📡 [API] Sending rejection to /api/twilio/call-state with:",
            {
              callSid,
              action: "rejected",
              companyId,
            },
          );
          const response = await fetch("/api/twilio/call-state", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              callSid,
              action: "rejected",
              companyId,
            }),
          });
          const result = await response.json();
          console.log("📡 [API] Call rejection response:", result);
          if (!response.ok) {
            console.error("⚠️ [API] Call rejection failed:", result);
          }
        } catch (error) {
          console.error("❌ [API] Failed to broadcast call rejection:", error);
          // Continue with rejecting the call even if broadcast fails
        }
      } else {
        console.warn(
          "⚠️ [Global] Missing callSid or companyId, cannot update database:",
          {
            callSid,
            companyId,
          },
        );
      }

      if (provider === "TWILIO") {
        incomingCall.reject();
      } else if (provider === "INFOBIP") {
        incomingCall.decline();
      }

      setIncomingCall(null);
      setCurrentCallSid(null);
      setCallStatus("Call rejected");
    } else {
      console.warn("⚠️ [Global] No incoming call to reject");
    }
  }, [incomingCall, provider, companyId, currentCallSid]);

  // End call
  const endCall = useCallback(async () => {
    if (currentConnection) {
      console.log("📞 [Global] Ending call");

      // Get the call SID before ending
      const callSid = getCallSid(currentConnection) || currentCallSid;

      // Broadcast that this call was ended (so other devices end it too)
      if (callSid && companyId) {
        try {
          console.log(
            "📡 [API] Sending end call to /api/twilio/call-state with:",
            {
              callSid,
              action: "ended",
              companyId,
              deviceId,
            },
          );
          const response = await fetch("/api/twilio/call-state", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              callSid,
              action: "ended",
              companyId,
              deviceId, // Include deviceId so this device knows it initiated the end
            }),
          });
          const result = await response.json();
          console.log("📡 [API] Call end response:", result);
          if (!response.ok) {
            console.error("⚠️ [API] Call end failed:", result);
          }
        } catch (error) {
          console.error("❌ [API] Failed to broadcast call end:", error);
          // Continue with ending the call even if broadcast fails
        }
      } else {
        console.warn(
          "⚠️ [Global] Missing callSid or companyId, cannot update database:",
          {
            callSid,
            companyId,
          },
        );
      }

      if (provider === "TWILIO") {
        currentConnection.disconnect();
      } else if (provider === "INFOBIP") {
        currentConnection.hangup();
      }

      setCallStatus("Call ended");
      setCurrentConnection(null);
      setIncomingCall(null);
      setCurrentCallSid(null);
      if (timer) {
        clearInterval(timer);
        setTimer(null);
      }
      // Release wake lock when call is manually ended
      releaseWakeLock();
    }
  }, [currentConnection, provider, timer, companyId, deviceId, currentCallSid]);

  // Toggle mute on the active call. Both Twilio's Call and Infobip's RTC call
  // expose a .mute(bool) method, so the same call works for either provider.
  const toggleMute = useCallback(() => {
    if (!currentConnection) return;
    const next = !isMuted;
    try {
      currentConnection.mute(next);
      setIsMuted(next);
    } catch (error) {
      console.error("❌ [Call] Failed to toggle mute:", error);
    }
  }, [currentConnection, isMuted]);

  useEffect(() => {
    if (!currentConnection) setIsMuted(false);
  }, [currentConnection]);

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
        isMuted,
        toggleMute,
      }}
    >
      {children}
    </VoiceDeviceContext.Provider>
  );
}
