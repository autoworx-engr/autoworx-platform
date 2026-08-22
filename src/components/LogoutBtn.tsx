"use client";

import { cn } from "@/lib/cn";
import { isOneSignalReady } from "@/lib/notification/initOneSignal";
import { setOneSignalLoggingOut } from "@/lib/notification/logoutState";
import { errorToast } from "@/lib/toast";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import OneSignal from "react-onesignal";

type TProps = {
  className?: string;
};

function unsubscribePushInBackground() {
  setOneSignalLoggingOut(true);

  void (async () => {
    try {
      if (typeof window !== "undefined" && isOneSignalReady()) {
        await OneSignal.logout();
        await OneSignal.login("unsubscribe");
      }
    } catch (err) {
      console.error("Background OneSignal unsubscribe failed:", err);
    }
  })();
}

export default function LogoutBtn({ className, ...props }: TProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleLogout = async () => {
    try {
      // Kick off push cleanup but DON'T await it — logout must not wait for it.
      unsubscribePushInBackground();

      await signOut({ redirect: false });

      window.location.replace("/login");
    } catch (err: any) {
      errorToast("Logout failed");
    }
  };

  return (
    <button
      {...props}
      onClick={() => startTransition(handleLogout)}
      className={cn(
        className
          ? className
          : "bg-background text-[1.7rem] font-bold text-primary disabled:text-gray-500",
      )}
      disabled={pending}
    >
      {pending ? (
        <div className="size-6 animate-spin rounded-full border-4 border-gray-300 border-t-primary"></div>
      ) : (
        <svg
          viewBox="-2.2 -2.2 24.40 24.40"
          xmlns="http://www.w3.org/2000/svg"
          fill="currentColor"
          stroke="currentColor"
          className="h-5 w-5 sm:h-7 sm:w-7 text-white sm:text-primary"
          strokeWidth="0.80"
        >
          <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
          <g
            id="SVGRepo_tracerCarrier"
            strokeLinecap="round"
            strokeLinejoin="round"
          ></g>
          <g id="SVGRepo_iconCarrier">
            {" "}
            <path
              fill="currentColor"
              d="M10.2392344,0 C13.3845587,0 16.2966635,1.39466883 18.2279685,3.74426305 C18.4595621,4.02601608 18.4134356,4.43777922 18.124942,4.66396176 C17.8364485,4.89014431 17.4148346,4.84509553 17.183241,4.5633425 C15.5035716,2.51988396 12.9739849,1.30841121 10.2392344,1.30841121 C5.32416443,1.30841121 1.33971292,5.19976806 1.33971292,10 C1.33971292,14.8002319 5.32416443,18.6915888 10.2392344,18.6915888 C13.0144533,18.6915888 15.5774656,17.443711 17.2546848,15.3485857 C17.4825482,15.0639465 17.9035339,15.0136047 18.1949827,15.2361442 C18.4864315,15.4586837 18.5379776,15.8698333 18.3101142,16.1544725 C16.3816305,18.5634688 13.4311435,20 10.2392344,20 C4.58426141,20 8.8817842e-14,15.5228475 8.8817842e-14,10 C8.8817842e-14,4.4771525 4.58426141,0 10.2392344,0 Z M17.0978642,7.15999289 L19.804493,9.86662172 C20.0660882,10.1282169 20.071043,10.5473918 19.8155599,10.802875 L17.17217,13.4462648 C16.9166868,13.701748 16.497512,13.6967932 16.2359168,13.435198 C15.9743215,13.1736028 15.9693667,12.7544279 16.2248499,12.4989447 L17.7715361,10.9515085 L7.46239261,10.9518011 C7.0924411,10.9518011 6.79253615,10.6589032 6.79253615,10.2975954 C6.79253615,9.93628766 7.0924411,9.64338984 7.46239261,9.64338984 L17.7305361,9.64250854 L16.1726778,8.08517933 C15.9110825,7.82358411 15.9061278,7.40440925 16.1616109,7.14892607 C16.4170941,6.89344289 16.836269,6.89839767 17.0978642,7.15999289 Z"
            ></path>{" "}
          </g>
        </svg>
      )}
    </button>
  );
}
