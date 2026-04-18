"use client";

import { initiateMetaConnect } from "@/actions/meta/connect";
import { pusher } from "@/lib/pusher/client";
import { useClientCommunicationStore } from "@/stores/client-store";
import { useGetCurrentUser } from "@/utils/useGetCurrentUser";
import { Client, ClientConversationTrack } from "@prisma/client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCompanyFeaturePermissionStore } from "@/stores/companyFeaturePermissionStore";
import { cn } from "@/lib/cn";
import { AtSign, Phone } from "lucide-react";
import { useServerGet } from "@/hooks/useServerGet";
import { getMetaCredentials } from "../../_actions/getMetaCredentials";

type TClient =
  | (Client & { conversationsTrack?: ClientConversationTrack | null })
  | null;

type TProps = {
  selectedConversation?: string;
  client?: TClient;
  companyId: number;
};

// Messenger icon SVG — represents both FB and IG messaging
function MessengerIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.19 5.44 3.14 7.17.16.14.26.34.27.55l.05 1.72c.03.54.59.89 1.09.65l1.91-.85c.16-.07.34-.09.51-.05.79.22 1.64.34 2.52.34 5.64 0 10-4.13 10-9.7C22 6.13 17.64 2 12 2zm6 7.46-2.93 4.65c-.47.74-1.47.92-2.17.4l-2.33-1.75c-.21-.16-.5-.16-.71 0L7.35 14.1c-.46.37-1.07-.17-.74-.67l2.93-4.65c.47-.74 1.47-.92 2.17-.4l2.33 1.75c.21.16.5.16.71 0l2.51-1.96c.46-.37 1.07.17.74.67z" />
    </svg>
  );
}

export default function ChatHead({
  client: initialClient,
  selectedConversation = "SMS",
  companyId,
}: TProps) {
  const [selected, setSelected] = useState<string>(selectedConversation);
  const [metaPopoverOpen, setMetaPopoverOpen] = useState(false);
  const metaPopoverRef = useRef<HTMLDivElement>(null);

  const user = useGetCurrentUser();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const { data: metaCredentials, loading: metaLoading } =
    useServerGet(getMetaCredentials);

  const isMetaActive = selected === "INSTAGRAM" || selected === "FACEBOOK";

  const handleTabChange = (tab: string) => {
    setSelected(tab);
    setMetaPopoverOpen(false);
    if (searchParams) {
      const updated = new URLSearchParams(searchParams);
      updated.set("open", tab);
      if (tab === "SMS" && updated.has("open")) updated.delete("open");
      router.replace(`${pathname}?${updated.toString()}`);
    }
  };

  const handleMetaIconClick = () => {
    setMetaPopoverOpen((prev) => !prev);
  };

  // Close popover on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        metaPopoverRef.current &&
        !metaPopoverRef.current.contains(e.target as Node)
      ) {
        setMetaPopoverOpen(false);
      }
    };
    if (metaPopoverOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [metaPopoverOpen]);

  const clientConversationTrack = useClientCommunicationStore(
    (state) => state.clientConversationTrack,
  );

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
        {clientConversationTrack && !clientConversationTrack?.emailIsRead && (
          <span className="absolute -top-1 -right-1 z-10">
            <span className="absolute -inset-0.5 animate-ping rounded-full bg-rose-400/70" />
            <span className="relative flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold leading-none text-white ring-2 ring-white/80">
              1
            </span>
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
            <span className="relative flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold leading-none text-white ring-2 ring-white/80">
              1
            </span>
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
          enable-background="new 0 0 24 24"
          stroke="#ffffff"
          stroke-width="0.36"
        >
          <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
          <g
            id="SVGRepo_tracerCarrier"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke="#CCCCCC"
            stroke-width="0.144"
          ></g>
          <g id="SVGRepo_iconCarrier">
            {" "}
            <path d="M12,1C5.37,1,0,5.58,0,10.55c0,2.92,1.86,5.95,4.72,7.59L3,23l5.85-3.32C9.86,19.88,10.91,20,12,20c6.63,0,12-4.48,12-9.45 C24,5.58,18.63,1,12,1z M6.55,13.8c-0.53,0.47-1.24,0.7-2.14,0.7c-0.52,0-0.97-0.06-1.36-0.17c-0.39-0.11-0.75-0.26-1.09-0.43v-1.84 h0.16c0.34,0.33,0.71,0.58,1.12,0.76c0.41,0.18,0.8,0.26,1.19,0.26c0.1,0,0.23-0.01,0.38-0.04c0.16-0.02,0.29-0.06,0.38-0.11 c0.12-0.06,0.22-0.14,0.3-0.25c0.08-0.1,0.12-0.24,0.12-0.42c0-0.19-0.07-0.35-0.2-0.47s-0.29-0.21-0.48-0.26 c-0.23-0.07-0.47-0.13-0.73-0.2c-0.26-0.06-0.51-0.14-0.73-0.23c-0.52-0.21-0.9-0.49-1.12-0.85c-0.23-0.36-0.34-0.8-0.34-1.34 c0-0.72,0.27-1.31,0.8-1.75c0.53-0.45,1.2-0.67,2-0.67c0.4,0,0.8,0.05,1.2,0.14c0.4,0.09,0.75,0.22,1.06,0.38v1.76H6.93 C6.68,8.54,6.37,8.33,6.01,8.16C5.65,7.99,5.28,7.9,4.9,7.9c-0.15,0-0.28,0.01-0.4,0.04C4.38,7.97,4.26,8.01,4.13,8.08 c-0.11,0.06-0.2,0.14-0.27,0.25C3.78,8.44,3.74,8.56,3.74,8.69c0,0.2,0.06,0.35,0.18,0.47c0.12,0.12,0.36,0.22,0.71,0.31 c0.23,0.06,0.44,0.12,0.66,0.17C5.49,9.7,5.72,9.78,5.96,9.87c0.47,0.19,0.82,0.45,1.04,0.78c0.23,0.33,0.34,0.76,0.34,1.29 C7.34,12.72,7.08,13.33,6.55,13.8z M15.33,14.36h-1.68V9.24l-1.23,3.3h-1.16l-1.23-3.3v5.12H8.44V6.64h1.95l1.5,3.81l1.49-3.81h1.95 V14.36z M21.18,13.8c-0.53,0.47-1.24,0.7-2.14,0.7c-0.52,0-0.97-0.06-1.36-0.17c-0.39-0.11-0.75-0.26-1.09-0.43v-1.84h0.16 c0.34,0.33,0.71,0.58,1.12,0.76c0.41,0.18,0.8,0.26,1.19,0.26c0.1,0,0.23-0.01,0.38-0.04c0.16-0.02,0.29-0.06,0.38-0.11 c0.12-0.06,0.22-0.14,0.3-0.25c0.08-0.1,0.12-0.24,0.12-0.42c0-0.19-0.07-0.35-0.2-0.47s-0.29-0.21-0.48-0.26 c-0.23-0.07-0.47-0.13-0.73-0.2c-0.26-0.06-0.51-0.14-0.73-0.23c-0.52-0.21-0.9-0.49-1.12-0.85c-0.23-0.36-0.34-0.8-0.34-1.34 c0-0.72,0.27-1.31,0.8-1.75c0.53-0.45,1.2-0.67,2-0.67c0.4,0,0.8,0.05,1.2,0.14c0.4,0.09,0.75,0.22,1.06,0.38v1.76h-0.15 c-0.25-0.25-0.56-0.45-0.92-0.62C20.27,7.99,19.9,7.9,19.52,7.9c-0.15,0-0.28,0.01-0.4,0.04C19,7.97,18.88,8.01,18.75,8.08 c-0.11,0.06-0.2,0.14-0.27,0.25c-0.08,0.11-0.12,0.23-0.12,0.37c0,0.2,0.06,0.35,0.18,0.47c0.12,0.12,0.36,0.22,0.71,0.31 c0.23,0.06,0.44,0.12,0.66,0.17c0.21,0.06,0.43,0.13,0.67,0.23c0.47,0.19,0.82,0.45,1.04,0.78c0.23,0.33,0.34,0.76,0.34,1.29 C21.97,12.72,21.7,13.33,21.18,13.8z"></path>{" "}
          </g>
        </svg>
      </button>

      {/* META (Instagram + Facebook) */}
      <div className="relative" ref={metaPopoverRef}>
        <button
          onClick={handleMetaIconClick}
          role="tab"
          aria-selected={isMetaActive}
          aria-controls="panel-meta"
          title="Instagram / Facebook"
          className={cn(
            "relative rounded-full p-3 transition-all",
            "hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/70",
            isMetaActive ? "bg-white/30" : "bg-transparent",
          )}
        >
          {/* Unread badge */}
          {clientConversationTrack && !clientConversationTrack?.metaIsRead && (
            <span className="absolute -top-1 -right-1 z-10">
              <span className="absolute -inset-0.5 animate-ping rounded-full bg-rose-400/70" />
              <span className="relative flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold leading-none text-white ring-2 ring-white/80">
                {clientConversationTrack.metaUnReadCount > 0
                  ? clientConversationTrack.metaUnReadCount
                  : 1}
              </span>
            </span>
          )}
          <MessengerIcon className="w-5 h-5 text-white" />
        </button>

        {/* Popover */}
        {metaPopoverOpen && (
          <div className="absolute right-0 top-full mt-2 z-50 w-56 rounded-xl bg-white shadow-xl ring-1 ring-zinc-200/80 dark:bg-zinc-900 dark:ring-white/10 overflow-hidden">
            {metaLoading ? (
              <div className="p-3 text-center text-xs text-zinc-400">
                Loading…
              </div>
            ) : metaCredentials ? (
              /* Connected — show IG / FB options */
              <>
                <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                  Message via
                </div>
                {metaCredentials.instagramAccountId && (
                  <button
                    onClick={() => handleTabChange("INSTAGRAM")}
                    className={cn(
                      "flex w-full items-center gap-2.5 px-3 py-2.5 text-sm transition",
                      "hover:bg-zinc-50 dark:hover:bg-white/5",
                      selected === "INSTAGRAM" &&
                        "bg-zinc-100 dark:bg-white/10 font-semibold",
                    )}
                  >
                    {/* IG gradient dot */}
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-[#833AB4] to-[#E1306C] text-[9px] font-bold text-white flex-shrink-0">
                      IG
                    </span>
                    <span>
                      Instagram
                      {metaCredentials.instagramUsername && (
                        <span className="ml-1 text-xs text-zinc-400">
                          @{metaCredentials.instagramUsername}
                        </span>
                      )}
                    </span>
                  </button>
                )}
                <button
                  onClick={() => handleTabChange("FACEBOOK")}
                  className={cn(
                    "flex w-full items-center gap-2.5 px-3 py-2.5 text-sm transition",
                    "hover:bg-zinc-50 dark:hover:bg-white/5",
                    selected === "FACEBOOK" &&
                      "bg-zinc-100 dark:bg-white/10 font-semibold",
                  )}
                >
                  {/* FB blue dot */}
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1877F2] text-[9px] font-bold text-white flex-shrink-0">
                    f
                  </span>
                  <span>
                    Facebook
                    {metaCredentials.pageName && (
                      <span className="ml-1 text-xs text-zinc-400">
                        {metaCredentials.pageName}
                      </span>
                    )}
                  </span>
                </button>
              </>
            ) : (
              /* Not connected — connect prompt */
              <div className="p-3">
                <p className="mb-2 text-[12px] text-zinc-600 dark:text-zinc-300 leading-snug">
                  Connect Meta to message clients on Instagram &amp; Facebook.
                </p>
                <div className="flex items-center gap-2">
                  <form action={initiateMetaConnect}>
                    <button
                      type="submit"
                      className="rounded-lg bg-[#1877F2] px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-[#1565D8]"
                    >
                      Connect
                    </button>
                  </form>
                  <button
                    onClick={() => setMetaPopoverOpen(false)}
                    className="rounded-lg px-3 py-1.5 text-[12px] text-zinc-500 transition hover:bg-zinc-100 dark:hover:bg-white/10"
                  >
                    Later
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* PHONE */}
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
    </div>
  );
}
