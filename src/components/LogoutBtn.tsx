"use client";

import { IoMdLogOut } from "react-icons/io";
import { env } from "next-runtime-env";
import { cn } from "@/lib/cn";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { errorToast } from "@/lib/toast";
import { signOut } from "next-auth/react";
import { IOneSignalOneSignal } from "react-onesignal";

type TProps = {
  className?: string;
};

export default function LogoutBtn({ className, ...props }: TProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Function to detect if the device is mobile
  const isMobileDevice = () => {
    return /Mobi|Android/i.test(navigator.userAgent);
  };

  const handleLogout = async () => {
    try {
      await signOut({
        redirect: false,
      });

      const redirectUrl = env("NEXT_PUBLIC_APP_URL")
        ? env("NEXT_PUBLIC_APP_URL") + "/"
        : "https://autoworx.tech/";

      window.OneSignalDeferred.push(async (OneSignal: IOneSignalOneSignal) => {
        try {
          await OneSignal.logout();
          await OneSignal.login("unsubscribe");
        } catch (err) {
          console.error("Error logging out from OneSignal:", err);
        }
      });

      router.replace(redirectUrl);
      window.location.reload();

      // Check if the device is mobile or desktop
      if (isMobileDevice()) {
        console.log("Logging out from a mobile device");
      } else {
        console.log("Logging out from a desktop device");
      }
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
          : "bg-background text-[1.7rem] font-bold text-[#6571FF] disabled:text-gray-500",
      )}
      disabled={pending}
    >
      {pending ? (
        <div className="size-6 animate-spin rounded-full border-4 border-gray-300 border-t-[#6571FF]"></div>
      ) : (
        <IoMdLogOut className="size-6 lg:size-8" />
      )}
    </button>
  );
}
