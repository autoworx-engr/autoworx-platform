import detectBrowser from "@/utils/detectBrowser";
import { env } from "next-runtime-env";
import { IOneSignalOneSignal } from "react-onesignal";
import { errorToast, successToast } from "../toast";
import { isIosPwa } from "@/utils/isIosPwa";

function isWebPushSupported() {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

// Check if the app is running as an iOS PWA

export const initOneSignal = async (userId: number, isMobile?: boolean) => {
  try {
    if (typeof window !== "undefined") {
      if (!isWebPushSupported()) {
        console.log("Notifications not supported (iOS PWA detected)");
        errorToast(
          "Notifications not supported in this browser. Please check your browser settings.",
        );
      }
      console.log("isWebPushSupported", isWebPushSupported());

      if (isIosPwa()) {
        successToast("iOS PWA detected");
      }

      const getRegistration = await navigator.serviceWorker.getRegistration();
      const isActiveServiceWorker =
        getRegistration?.active?.state === "activated";
      if (!isActiveServiceWorker) {
        errorToast(
          "Service worker not active. Please check your browser settings.",
        );
        console.log(
          "Service worker not active. Please check your browser settings.",
        );
      }

      window.OneSignalDeferred.push(async (OneSignal: IOneSignalOneSignal) => {
        if (!OneSignal) {
          errorToast(
            "OneSignal SDK not loaded. Please check your browser settings.",
          );
          console.log(
            "OneSignal SDK not loaded. Please check your browser settings.",
          );
        }
        await OneSignal.init({
          appId: env("NEXT_PUBLIC_ONESIGNAL_APP_ID") as string,
          autoResubscribe: true,
          autoRegister: true,
          safari_web_id: env("NEXT_PUBLIC_ONESIGNAL_SAFARI_WEB_ID"),
          persistNotification: true,
          allowLocalhostAsSecureOrigin: true,
          requiresUserPrivacyConsent: false,
          notifyButton: {
            enable: true,
            prenotify: true,
            showCredit: false,
            displayPredicate: () => {
              // if (isMobile && OneSignal.User.PushSubscription.optedIn) {
              //   return false;
              // }
              return true;
            },
            size: isMobile ? "small" : "medium",
            offset: {
              bottom: "20px",
              right: "65px",
              left: "auto",
            },
            text: {
              "tip.state.unsubscribed": "Subscribe to notifications",
              "tip.state.subscribed": "You are subscribed to notifications",
              "tip.state.blocked": "You have blocked notifications",
              "message.prenotify": "Click to subscribe to notifications",
              "message.action.subscribed": "Thanks for subscribing!",
              "message.action.resubscribed":
                "You are subscribed to notifications",
              "message.action.unsubscribed":
                "You won't receive notifications again",
              "message.action.subscribing": "Subscribing to notifications...",
              "dialog.main.title": "Manage Site Notifications",
              "dialog.main.button.subscribe": "SUBSCRIBE",
              "dialog.main.button.unsubscribe": "UNSUBSCRIBE",
              "dialog.blocked.title": "Notifications Blocked",
              "dialog.blocked.message":
                "Please unblock notifications in your browser settings.",
            },
          },
        });
        const externalUserId = `user-${userId}`; // Get this from your auth system
        await OneSignal.login(externalUserId);
        OneSignal.User.addTag("browser", detectBrowser());
        console.log("opted In", OneSignal.User.PushSubscription.optedIn);
        OneSignal.Debug.setLogLevel("debug");
        const externalIdFromOnesignal = OneSignal.User.externalId;
        console.log({ externalIdFromOnesignal });
      });
    }

    // Tag device with browser type (optional but useful for filtering)
    // await OneSignal.User.addTag("browser", browser);
    // }
  } catch (error) {
    console.error("OneSignal init failed:", error);
  }
};
