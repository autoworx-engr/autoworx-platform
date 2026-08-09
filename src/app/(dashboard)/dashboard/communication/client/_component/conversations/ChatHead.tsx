"use client";
import { pusher } from "@/lib/pusher/client";
import { useClientCommunicationStore } from "@/stores/client-store";
import { useGetCurrentUser } from "@/utils/useGetCurrentUser";
import { Client, ClientConversationTrack } from "@prisma/client";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PremiumModal } from "../phone/PremiumCallModal";
import { useCompanyFeaturePermissionStore } from "@/stores/companyFeaturePermissionStore";
import { companyPermissionModule } from "@/constants/company-permission";
import { cn } from "@/lib/cn";
import { AtSign, Phone } from "lucide-react";

function MessengerIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M12 2C6.477 2 2 6.145 2 11.243c0 2.906 1.318 5.51 3.396 7.28V23l4.128-2.267c1.104.305 2.274.473 3.476.473 5.523 0 10-4.145 10-9.243S17.523 2 12 2zm1.008 12.445-2.55-2.72-4.977 2.72 5.474-5.806 2.613 2.72 4.914-2.72-5.474 5.806z" />
    </svg>
  );
}

type TClient =
  | (Client & {
      conversationsTrack?: ClientConversationTrack | null;
    })
  | null;

type TProps = {
  selectedConversation?: string;
  client?: TClient;
  companyId: number;
};

export default function ChatHead({
  client: initialClient,
  selectedConversation = "SMS",
  companyId,
}: TProps) {
  const [selected, setSelected] = useState<string>(selectedConversation);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  useEffect(() => {
    setSelected(selectedConversation);
  }, [selectedConversation]);
  // const [client, setClient] = useState<TClient | undefined>(initialClient);
  const user = useGetCurrentUser();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { companyFeaturePermission } = useCompanyFeaturePermissionStore();

  const isCallingAccess = companyFeaturePermission.find(
    (permission) =>
      permission.permission_name === companyPermissionModule.CALLING_ACCESS,
  );

  const isMessengerAccess = companyFeaturePermission.find(
    (permission) =>
      permission.permission_name === companyPermissionModule?.MESSENGER,
  );

  const isInstagramAccess = companyFeaturePermission.find(
    (permission) =>
      permission.permission_name === companyPermissionModule?.INSTAGRAM,
  );

  const handleTabChange = (tab: string) => {
    // if (tab === "PHONE" && !isCallingAccess?.enabled) {
    //   setShowPremiumModal(true);
    //   return;
    // }

    setSelected(tab);
    if (searchParams) {
      const updatedParams = new URLSearchParams(searchParams);
      updatedParams.set("open", tab); // Update the tabState query parameter
      if (tab === "SMS" && updatedParams.has("open")) {
        updatedParams.delete("open");
      }
      router.replace(`${pathname}?${updatedParams.toString()}`); // Update the URL without affecting other
    }
  };

  const clientConversationTrack = useClientCommunicationStore(
    (state) => state.clientConversationTrack,
  );

  // useEffect(() => {
  //   useClientCommunicationStore.setState({
  //     clientConversationTrack: initialClient?.conversationsTrack,
  //   });
  // }, []);

  // subscribe to pusher channel for realtime updates
  useEffect(() => {
    pusher
      .subscribe(`client-notify-${user?.companyId}-${initialClient?.id}`)
      .bind("client-notify", (data: ClientConversationTrack) => {
        if (!data) return;
        useClientCommunicationStore.setState({
          clientConversationTrack:
            data.clientId === initialClient?.id
              ? { ...data }
              : clientConversationTrack,
        });
      });
    return () => {
      pusher
        .unbind("client-notify")
        .unsubscribe(`client-notify-${user?.companyId}-${initialClient?.id}`);
    };
  }, [user?.companyId, initialClient?.id, clientConversationTrack]);

  return (
    <div
      className="flex items-center"
      role="tablist"
      aria-label="Conversation channels"
    >
      {/* EMAIL */}
      <button
        onClick={() => handleTabChange("EMAIL")}
        role="tab"
        aria-selected={selected === "EMAIL"}
        aria-controls="panel-email"
        title="Email"
        className={cn(
          "relative rounded-full p-3 transition-all",
          "hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/70",
          selected === "EMAIL" ? "bg-white/30" : "bg-transparent",
        )}
      >
        {/* unread badge */}
        {clientConversationTrack && !clientConversationTrack?.emailIsRead && (
          <span className="absolute -top-1 -right-1 z-10">
            <span className="absolute -inset-0.5 animate-ping rounded-full bg-rose-400/70" />
            {/* A count of 0 means the thread was marked unread by hand rather
                than by an incoming message, so show a bare dot. */}
            {clientConversationTrack.emailIsUnReadCount > 0 ? (
              <span className="relative flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold leading-none text-white ring-2 ring-white/80">
                {clientConversationTrack.emailIsUnReadCount > 9
                  ? "9+"
                  : clientConversationTrack.emailIsUnReadCount}
              </span>
            ) : (
              <span className="relative flex h-3 w-3 rounded-full bg-rose-500 ring-2 ring-white/80" />
            )}
          </span>
        )}
        <AtSign className="w-5 h-5 text-white" />
      </button>

      {/* SMS */}
      <button
        onClick={() => handleTabChange("SMS")}
        role="tab"
        aria-selected={selected === "SMS"}
        aria-controls="panel-sms"
        title="SMS"
        className={cn(
          "relative rounded-full transition-all",
          "hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/70",
          selected === "SMS" ? "bg-white/30" : "bg-transparent",
        )}
      >
        {clientConversationTrack && !clientConversationTrack?.smsIsRead && (
          <span className="absolute -top-1 -right-1 z-10">
            <span className="absolute -inset-0.5 animate-ping rounded-full bg-rose-400/70" />
            {/* A count of 0 means the thread was marked unread by hand rather
                than by an incoming message, so show a bare dot. */}
            {clientConversationTrack.smsUnReadCount > 0 ? (
              <span className="relative flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold leading-none text-white ring-2 ring-white/80">
                {clientConversationTrack.smsUnReadCount > 9
                  ? "9+"
                  : clientConversationTrack.smsUnReadCount}
              </span>
            ) : (
              <span className="relative flex h-3 w-3 rounded-full bg-rose-500 ring-2 ring-white/80" />
            )}
          </span>
        )}
        <svg
          fill="#ffffff"
          height="35px"
          width="35px"
          version="1.1"
          id="Icon"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="-5.28 -5.28 34.56 34.56"
          enableBackground="new 0 0 24 24"
          stroke="#ffffff"
          strokeWidth="0.36"
        >
          <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
          <g
            id="SVGRepo_tracerCarrier"
            strokeLinecap="round"
            strokeLinejoin="round"
            stroke="#CCCCCC"
            strokeWidth="0.144"
          ></g>
          <g id="SVGRepo_iconCarrier">
            {" "}
            <path d="M12,1C5.37,1,0,5.58,0,10.55c0,2.92,1.86,5.95,4.72,7.59L3,23l5.85-3.32C9.86,19.88,10.91,20,12,20c6.63,0,12-4.48,12-9.45 C24,5.58,18.63,1,12,1z M6.55,13.8c-0.53,0.47-1.24,0.7-2.14,0.7c-0.52,0-0.97-0.06-1.36-0.17c-0.39-0.11-0.75-0.26-1.09-0.43v-1.84 h0.16c0.34,0.33,0.71,0.58,1.12,0.76c0.41,0.18,0.8,0.26,1.19,0.26c0.1,0,0.23-0.01,0.38-0.04c0.16-0.02,0.29-0.06,0.38-0.11 c0.12-0.06,0.22-0.14,0.3-0.25c0.08-0.1,0.12-0.24,0.12-0.42c0-0.19-0.07-0.35-0.2-0.47s-0.29-0.21-0.48-0.26 c-0.23-0.07-0.47-0.13-0.73-0.2c-0.26-0.06-0.51-0.14-0.73-0.23c-0.52-0.21-0.9-0.49-1.12-0.85c-0.23-0.36-0.34-0.8-0.34-1.34 c0-0.72,0.27-1.31,0.8-1.75c0.53-0.45,1.2-0.67,2-0.67c0.4,0,0.8,0.05,1.2,0.14c0.4,0.09,0.75,0.22,1.06,0.38v1.76H6.93 C6.68,8.54,6.37,8.33,6.01,8.16C5.65,7.99,5.28,7.9,4.9,7.9c-0.15,0-0.28,0.01-0.4,0.04C4.38,7.97,4.26,8.01,4.13,8.08 c-0.11,0.06-0.2,0.14-0.27,0.25C3.78,8.44,3.74,8.56,3.74,8.69c0,0.2,0.06,0.35,0.18,0.47c0.12,0.12,0.36,0.22,0.71,0.31 c0.23,0.06,0.44,0.12,0.66,0.17C5.49,9.7,5.72,9.78,5.96,9.87c0.47,0.19,0.82,0.45,1.04,0.78c0.23,0.33,0.34,0.76,0.34,1.29 C7.34,12.72,7.08,13.33,6.55,13.8z M15.33,14.36h-1.68V9.24l-1.23,3.3h-1.16l-1.23-3.3v5.12H8.44V6.64h1.95l1.5,3.81l1.49-3.81h1.95 V14.36z M21.18,13.8c-0.53,0.47-1.24,0.7-2.14,0.7c-0.52,0-0.97-0.06-1.36-0.17c-0.39-0.11-0.75-0.26-1.09-0.43v-1.84h0.16 c0.34,0.33,0.71,0.58,1.12,0.76c0.41,0.18,0.8,0.26,1.19,0.26c0.1,0,0.23-0.01,0.38-0.04c0.16-0.02,0.29-0.06,0.38-0.11 c0.12-0.06,0.22-0.14,0.3-0.25c0.08-0.1,0.12-0.24,0.12-0.42c0-0.19-0.07-0.35-0.2-0.47s-0.29-0.21-0.48-0.26 c-0.23-0.07-0.47-0.13-0.73-0.2c-0.26-0.06-0.51-0.14-0.73-0.23c-0.52-0.21-0.9-0.49-1.12-0.85c-0.23-0.36-0.34-0.8-0.34-1.34 c0-0.72,0.27-1.31,0.8-1.75c0.53-0.45,1.2-0.67,2-0.67c0.4,0,0.8,0.05,1.2,0.14c0.4,0.09,0.75,0.22,1.06,0.38v1.76h-0.15 c-0.25-0.25-0.56-0.45-0.92-0.62C20.27,7.99,19.9,7.9,19.52,7.9c-0.15,0-0.28,0.01-0.4,0.04C19,7.97,18.88,8.01,18.75,8.08 c-0.11,0.06-0.2,0.14-0.27,0.25c-0.08,0.11-0.12,0.23-0.12,0.37c0,0.2,0.06,0.35,0.18,0.47c0.12,0.12,0.36,0.22,0.71,0.31 c0.23,0.06,0.44,0.12,0.66,0.17c0.21,0.06,0.43,0.13,0.67,0.23c0.47,0.19,0.82,0.45,1.04,0.78c0.23,0.33,0.34,0.76,0.34,1.29 C21.97,12.72,21.7,13.33,21.18,13.8z"></path>{" "}
          </g>
        </svg>
      </button>

      {/* MESSENGER */}
      {isMessengerAccess?.enabled && (
        <button
          onClick={() => handleTabChange("MESSENGER")}
          role="tab"
          aria-selected={selected === "MESSENGER"}
          aria-controls="panel-messenger"
          title="Messenger"
          className={cn(
            "relative rounded-full p-3 transition-all",
            "hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/70",
            selected === "MESSENGER" ? "bg-white/30" : "bg-transparent",
          )}
        >
          {clientConversationTrack &&
            !clientConversationTrack?.messengerIsRead && (
              <span className="absolute -top-1 -right-1 z-10">
                <span className="absolute -inset-0.5 animate-ping rounded-full bg-rose-400/70" />
                <span className="relative flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold leading-none text-white ring-2 ring-white/80">
                  {clientConversationTrack.messengerUnReadCount ?? 1}
                </span>
              </span>
            )}
          <MessengerIcon className="w-5 h-5 text-white" />
        </button>
      )}

      {/* INSTAGRAM */}
      {isInstagramAccess?.enabled && (
        <button
          onClick={() => handleTabChange("INSTAGRAM")}
          role="tab"
          aria-selected={selected === "INSTAGRAM"}
          aria-controls="panel-instagram"
          title="Instagram DM"
          className={cn(
            "relative rounded-full p-3 transition-all",
            "hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/70",
            selected === "INSTAGRAM" ? "bg-white/30" : "bg-transparent",
          )}
        >
          {clientConversationTrack &&
            !(clientConversationTrack as any)?.instagramIsRead && (
              <span className="absolute -top-1 -right-1 z-10">
                <span className="absolute -inset-0.5 animate-ping rounded-full bg-rose-400/70" />
                <span className="relative flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold leading-none text-white ring-2 ring-white/80">
                  {(clientConversationTrack as any).instagramUnReadCount ?? 1}
                </span>
              </span>
            )}
          <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
          </svg>
        </button>
      )}

      {/* PHONE */}
      {isCallingAccess?.enabled && (
        <button
          onClick={() => handleTabChange("PHONE")}
          role="tab"
          aria-selected={selected === "PHONE"}
          aria-controls="panel-phone"
          title="Phone"
          className={cn(
            "relative rounded-full p-3 transition-all",
            "hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/70",
            selected === "PHONE" ? "bg-white/30" : "bg-transparent",
          )}
        >
          <Phone className="w-5 h-5 fill-current text-white" />
        </button>
      )}
    </div>
  );
}
