"use client";

import { Dialog } from "@/components/Dialog";
import { Button } from "@/components/ui/button";
import { useGetCurrentUser } from "@/utils/useGetCurrentUser";
import { useEffect, useState, useTransition } from "react";
import { FaRegBell } from "react-icons/fa";
import OneSignal from "react-onesignal";
import NotificationPermissionGuide from "./NotificationPermissionGuide";

interface NotificationPermissionProps {
  title?: string;
  description?: string;
  buttonText?: string;
  onAllow?: () => void;
}

export default function NotificationPermissionAlert({
  title = "You need to allow browser settings permission for push notifications",
  description = "Stay updated with important updates and interactions related to our application.",
  buttonText = "Allow push notifications",
}: NotificationPermissionProps) {
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const currentUser = useGetCurrentUser();

  useEffect(() => {
    if ("Notification" in window) {
      const permission = Notification.permission;
      setStatus(permission);
    }
  }, []);

  const handleRequestPermission = async () => {
    try {
      if (typeof window !== "undefined") {
        if (status === "default") {
          const permission = await Notification.requestPermission();
          if (permission === "granted") {
            const externalId = `user-${currentUser?.id}`;
            setStatus("granted");
            OneSignal.login(externalId);
          }
          console.log("Notification permission:", permission);
        } else if (status === "denied") {
          setOpen(true);
        } else {
          setOpen(true);
        }
      }
    } catch (error) {
      console.error("Error requesting notification permission:", error);
    }
  };

  if (status === "granted") {
    return null;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={close}>
        <NotificationPermissionGuide
          onClose={() => {
            setOpen(false);
          }}
        />
      </Dialog>
      <div className="ml-0 mr-5 mt-12 flex max-w-4xl items-center justify-between gap-4 rounded-xl bg-[#ededfc] p-4 dark:bg-[#6b6bce] sm:ml-6 lg:mt-0">
        <div className="flex">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-md bg-[#e1e1fb]">
            <FaRegBell className="h-6 w-6 text-[#6b6bce]" />
          </div>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-10">
          <div>
            <h3 className="text-base font-medium text-gray-800">{title}</h3>
            <p className="text-sm text-gray-600">{description}</p>
          </div>
          <div className="space-x-2">
            <Button
              disabled={pending}
              onClick={() => startTransition(handleRequestPermission)}
              className="border border-gray-200 bg-[#6571FF] text-white hover:bg-gray-50 hover:text-gray-800 disabled:bg-gray-400"
            >
              {buttonText}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
