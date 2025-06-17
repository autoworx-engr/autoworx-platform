"use client";
import { pusher } from "@/lib/pusher/client";
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

type TClient =
  | (Client & {
      conversationsTrack?: ClientConversationTrack | null;
    })
  | null;

type TProps = {
  selectedConversation?: string;
  client?: TClient;
};

export default function ChatHead({
  client: initialClient,
  selectedConversation = "SMS",
}: TProps) {
  const [selected, setSelected] = useState<string>(selectedConversation);
  // const [client, setClient] = useState<TClient | undefined>(initialClient);
  const user = useGetCurrentUser();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleTabChange = (tab: string) => {
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
  }, []);

  return (
    <div className="flex items-center">
      <button
        onClick={() => {
          handleTabChange("EMAIL");
        }}
        className="relative rounded-full p-3"
        style={{
          backgroundColor:
            selected === "EMAIL" ? "rgba(255, 255, 255, 0.34)" : "",
        }}
      >
        {clientConversationTrack &&
          clientConversationTrack?.emailIsUnReadCount! > 0 && (
            <span className="absolute -top-1 rounded-full bg-red-500 px-1">
              {clientConversationTrack?.emailIsUnReadCount}
            </span>
          )}
        <MdAlternateEmail className="text-xl text-white" />
        {/* <Image src="/icons/Chat.png" alt="chat" width={20} height={20} /> */}
      </button>

      <button
        onClick={() => {
          handleTabChange("SMS");
        }}
        className="relative rounded-full p-3"
        style={{
          backgroundColor:
            selected === "SMS" ? "rgba(255, 255, 255, 0.34)" : "",
        }}
      >
        {clientConversationTrack &&
          clientConversationTrack?.smsUnReadCount! > 0 && (
            <span className="absolute -top-1 rounded-full bg-red-500 px-1">
              {clientConversationTrack?.smsUnReadCount}
            </span>
          )}
        <FaSms className="text-xl text-white" />
        {/* <Image src="/icons/Email.png" alt="chat" width={20} height={20} /> */}
      </button>

      <button
        onClick={() => {
          handleTabChange("PHONE");
        }}
        className="rounded-full p-3"
        style={{
          backgroundColor:
            selected === "PHONE" ? "rgba(255, 255, 255, 0.34)" : "",
        }}
      >
        <IoCall className="text-xl text-white" />
        {/* <Image src="/icons/Phone.png" alt="phone" width={20} height={20} /> */}
      </button>
    </div>
  );
}
