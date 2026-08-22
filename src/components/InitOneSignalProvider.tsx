import { initOneSignal } from "@/lib/notification/initOneSignal";
import {
  isOneSignalLoggingOut,
  setOneSignalLoggingOut,
} from "@/lib/notification/logoutState";
import { errorToast, successToast } from "@/lib/toast";
import detectBrowser from "@/utils/detectBrowser";
import { useGetCurrentUser } from "@/utils/useGetCurrentUser";
import { useEffect } from "react";
import OneSignal from "react-onesignal";
import { useMediaQuery } from "react-responsive";

export default function InitOneSignalProvider() {
  const sessionUser = useGetCurrentUser();
  const isMax640 = useMediaQuery({ query: "(max-width: 640px)" });
  useEffect(() => {
    const init = async () => {
      console.log("Notification init");
      setOneSignalLoggingOut(false);
      await initOneSignal(Number(sessionUser?.id), isMax640); // Initialize OneSignal for push notifications
    };
    if (sessionUser?.id) {
      init(); // Call the initialization function
    }
  }, [isMax640, sessionUser?.id]);

  useEffect(() => {
    const externalId = `user-${sessionUser?.id}`;
    OneSignal.User.PushSubscription.addEventListener(
      "change",
      async (event) => {
        console.log("Push subscription changed:", event);
        console.log("User is not subscribed to push notifications");
        if (isOneSignalLoggingOut()) return;
        if (event.current.optedIn && sessionUser?.id) {
          await OneSignal.login(externalId);
          OneSignal.User.addTag("browser", detectBrowser());
          successToast("Notification Subscribed");
        } else {
          await OneSignal.logout();
          await OneSignal.login("unsubscribe");
          OneSignal.User.addTag("subscription_status", "inactive");
          errorToast("Notification unsubscribed");
        }
        console.log("logged in");
        console.log("external_id", OneSignal.User.externalId);
        console.log("onesignalId", OneSignal.User.onesignalId);
      },
    );

    OneSignal.Notifications.addEventListener(
      "permissionChange",
      async (permission) => {
        console.log("permission changes", permission);
        // window.location.reload(); // Reload the page when permission changes
      },
    );
  }, [sessionUser?.id]);
  return null;
}
