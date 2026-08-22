import detectBrowser from "@/utils/detectBrowser";
import OneSignal from "react-onesignal";
import { successToast } from "../toast";
import { isIosPwa } from "@/utils/isIosPwa";
import { showOneSignalErrorToast } from "@/components/ui/CustomToast";

// Environment validation
const ONESIGNAL_APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID as string;
const ONESIGNAL_SAFARI_WEB_ID = process.env
  .NEXT_PUBLIC_ONESIGNAL_SAFARI_WEB_ID as string;

if (!ONESIGNAL_APP_ID) {
  console.error("OneSignal App ID is not configured");
}

// Guard against calling OneSignal.init() more than once per session
let isOneSignalInitialized = false;

export const isOneSignalReady = (): boolean => isOneSignalInitialized;

function isWebPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

async function checkServiceWorkerStatus(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    return registration?.active?.state === "activated";
  } catch (error) {
    console.error("Error checking service worker status:", error);
    return false;
  }
}

function getNotificationTexts() {
  return {
    "tip.state.unsubscribed": "Subscribe to notifications",
    "tip.state.subscribed": "You are subscribed to notifications",
    "tip.state.blocked": "You have blocked notifications",
    "message.prenotify": "Click to subscribe to notifications",
    "message.action.subscribed": "Thanks for subscribing!",
    "message.action.resubscribed": "You are subscribed to notifications",
    "message.action.unsubscribed": "You won't receive notifications again",
    "message.action.subscribing": "Subscribing to notifications...",
    "dialog.main.title": "Manage Site Notifications",
    "dialog.main.button.subscribe": "SUBSCRIBE",
    "dialog.main.button.unsubscribe": "UNSUBSCRIBE",
    "dialog.blocked.title": "Notifications Blocked",
    "dialog.blocked.message":
      "Please unblock notifications in your browser settings.",
  };
}

async function initializeOneSignal(
  userId: number,
  isMobile?: boolean,
): Promise<void> {
  // Only call init once — react-onesignal throws if called a second time
  if (!isOneSignalInitialized) {
    await OneSignal.init({
      appId: ONESIGNAL_APP_ID,
      autoResubscribe: true,
      autoRegister: true,
      safari_web_id: ONESIGNAL_SAFARI_WEB_ID,
      persistNotification: true,
      allowLocalhostAsSecureOrigin: process.env.NODE_ENV === "development",
      requiresUserPrivacyConsent: false,
      notifyButton: {
        enable: true,
        prenotify: true,
        showCredit: false,
        displayPredicate: () => true,
        size: isMobile ? "small" : "medium",
        offset: {
          bottom: "20px",
          right: "65px",
          left: "auto",
        },
        text: getNotificationTexts(),
      },
    });
    isOneSignalInitialized = true;
  }

  // Set up user identification
  const externalUserId = `user-${userId}`;
  await OneSignal.login(externalUserId);

  console.log("OneSignal logged in successfully", externalUserId);

  // Add browser tag
  OneSignal.User.addTag("browser", detectBrowser());

  // Set log level based on environment
  OneSignal.Debug.setLogLevel(
    process.env.NODE_ENV === "development" ? "debug" : "error",
  );

  console.log("OneSignal initialized successfully");
  console.log("User opted in:", OneSignal.User.PushSubscription.optedIn);
  console.log("External ID:", OneSignal.User.externalId);
}

export const initOneSignal = async (
  userId: number,
  isMobile?: boolean,
): Promise<void> => {
  try {
    // Early return for server-side rendering
    if (typeof window === "undefined") {
      console.log("OneSignal: Running on server, skipping initialization");
      return;
    }

    // Validate required parameters
    if (!userId || typeof userId !== "number") {
      throw new Error("Valid userId is required for OneSignal initialization");
    }

    if (!ONESIGNAL_APP_ID) {
      throw new Error("OneSignal App ID is not configured");
    }

    // Check for iOS PWA early
    if (isIosPwa()) {
      console.log(
        "iOS PWA detected - notifications may have limited functionality",
      );
      successToast("iOS PWA detected");
    }

    // Check web push support
    if (!isWebPushSupported()) {
      const message =
        "Notifications not supported in this browser. Please check your browser settings.";
      console.warn("OneSignal:", message);
      // errorToast(message);
      return;
    }
    // Check service worker status
    const isServiceWorkerActive = await checkServiceWorkerStatus();
    if (!isServiceWorkerActive) {
      console.warn("OneSignal: Service worker not active");
    }

    // Initialize OneSignal
    await initializeOneSignal(userId, isMobile);

    console.log("OneSignal setup completed successfully");
  } catch (error) {
    console.error("OneSignal initialization error:", error);

    // Show OneSignal error toast with dismiss button (no default cross button)
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    showOneSignalErrorToast(`Notification setup failed: ${errorMessage}`);
    throw error; // Re-throw if you want calling code to handle it
  }
};

// Export utility functions for potential use elsewhere
export { isWebPushSupported, checkServiceWorkerStatus };
