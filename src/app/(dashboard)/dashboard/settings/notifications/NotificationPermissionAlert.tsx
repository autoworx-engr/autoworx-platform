"use client";

import { Dialog } from "@/components/Dialog";
import { Button } from "@/components/ui/button";
import { useGetCurrentUser } from "@/utils/useGetCurrentUser";
import { useEffect, useState, useTransition } from "react";
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
            <svg
              viewBox="-1.28 -1.28 18.56 18.56"
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              className="h-7 w-7 text-primary"
              stroke="currentColor"
              strokeWidth="0.41600000000000004"
            >
              <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
              <g
                id="SVGRepo_tracerCarrier"
                strokeLinecap="round"
                strokeLinejoin="round"
              ></g>
              <g id="SVGRepo_iconCarrier">
                {" "}
                <path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2zM8 1.918l-.797.161A4.002 4.002 0 0 0 4 6c0 .628-.134 2.197-.459 3.742-.16.767-.376 1.566-.663 2.258h10.244c-.287-.692-.502-1.49-.663-2.258C12.134 8.197 12 6.628 12 6a4.002 4.002 0 0 0-3.203-3.92L8 1.917zM14.22 12c.223.447.481.801.78 1H1c.299-.199.557-.553.78-1C2.68 10.2 3 6.88 3 6c0-2.42 1.72-4.44 4.005-4.901a1 1 0 1 1 1.99 0A5.002 5.002 0 0 1 13 6c0 .88.32 4.2 1.22 6z"></path>{" "}
              </g>
            </svg>
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
              className="border border-gray-200 bg-primary text-white hover:bg-gray-50 hover:text-gray-800 disabled:bg-gray-400"
            >
              {buttonText}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
