"use client";
import { pusher } from "@/lib/pusher/client";
import { errorToast } from "@/lib/toast";
import { useClientCommunicationStore } from "@/stores/client-store";
import { useGetCurrentUser } from "@/utils/useGetCurrentUser";
import { Client, ClientConversationTrack } from "@prisma/client";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { FaSms } from "react-icons/fa";
import { IoCall } from "react-icons/io5";
import { MdAlternateEmail } from "react-icons/md";
import { PremiumModal } from "../phone/PremiumCallModal";
import { useGetCompanyPermissions } from "@/hooks/feature-permissions/useGetCompanyPersmissions";
import { useCompanyFeaturePermissionStore } from "@/stores/companyFeaturePermissionStore";
import { companyPermissionModule } from "@/constants/company-permission";
import { cn } from "@/lib/cn";

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
  // const [client, setClient] = useState<TClient | undefined>(initialClient);
  const user = useGetCurrentUser();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { companyFeaturePermission } = useCompanyFeaturePermissionStore();

  const isCallingAccess = companyFeaturePermission.find(
    (permission) =>
      permission.permission_name === companyPermissionModule.CALLING_ACCESS
  );

  const handleTabChange = (tab: string) => {
    if (tab === "PHONE" && !isCallingAccess?.enabled) {
      setShowPremiumModal(true);
      return;
    }

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
    (state) => state.clientConversationTrack
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
  }, []);

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
          selected === "EMAIL" ? "bg-white/30" : "bg-transparent"
        )}
      >
        {/* unread badge */}
        {clientConversationTrack && !clientConversationTrack?.emailIsRead && (
          <span className="absolute -top-1 -right-1 z-10">
            <span className="absolute -inset-0.5 animate-ping rounded-full bg-rose-400/70" />
            <span className="relative flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold leading-none text-white ring-2 ring-white/80">
              1
            </span>
          </span>
        )}
        <MdAlternateEmail className="text-[20px] text-white" />
      </button>

      {/* SMS */}
      <button
        onClick={() => handleTabChange("SMS")}
        role="tab"
        aria-selected={selected === "SMS"}
        aria-controls="panel-sms"
        title="SMS"
        className={cn(
          "relative rounded-full p-3 transition-all",
          "hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/70",
          selected === "SMS" ? "bg-white/30" : "bg-transparent"
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
        <FaSms className="text-[20px] text-white" />
      </button>

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
          selected === "PHONE" ? "bg-white/30" : "bg-transparent"
        )}
      >
        <IoCall className="text-[20px] text-white" />
      </button>

      <PremiumModal
        open={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        featureName="calling feature"
      />
    </div>
  );
}
