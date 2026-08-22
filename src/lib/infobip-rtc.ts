// Infobip WebRTC SDK Implementation
// Using infobip-rtc package for browser-based calling

import { createInfobipRtc } from "infobip-rtc";
import type { InfobipRTC, PhoneCall, WebrtcCall } from "infobip-rtc";

export interface InfobipRTCOptions {
  debug?: boolean;
}

export interface InfobipCallOptions {
  audio?: boolean;
  video?: boolean;
}

// Re-export types from the actual SDK
export type { InfobipRTC, PhoneCall, WebrtcCall };

// Create Infobip RTC Client
// Note: This returns a factory that needs to be called with a token
export function createInfobipRTC(
  options?: InfobipRTCOptions,
): typeof createInfobipRtc | null {
  // Check if running in browser
  if (typeof window === "undefined") {
    console.warn("⚠️ [Infobip] Cannot create RTC in server environment");
    return null;
  }

  try {
    console.log("✅ [Infobip] Real WebRTC SDK factory ready");

    // Return the factory function from infobip-rtc
    // It will be called with token like: createInfobipRtc(token, options)
    return createInfobipRtc;
  } catch (error) {
    console.error("❌ [Infobip] Failed to load RTC SDK:", error);
    return null;
  }
}

export default createInfobipRTC;
