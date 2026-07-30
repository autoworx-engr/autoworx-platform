"use client";

import { useEffect, useState } from "react";
import { getCompanyUnreadCounts } from "@/actions/communication/collaboration/getCompanyUnreadCounts";
import { pusher } from "@/lib/pusher/client";

type ChatEvent = {
  senderCompanyId: number;
  receiverCompanyId: number;
};

export function useCompanyUnreadCounts(
  currentCompanyId: number,
  senderCompanyId: number,
) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!currentCompanyId || !senderCompanyId) return;

    const load = async () => {
      const data = await getCompanyUnreadCounts(
        currentCompanyId,
        senderCompanyId,
      );
      setCount(data.count);
    };

    load();

    const channel = pusher.subscribe(`company-track-${currentCompanyId}`);

    const handleChatTrack = (event: ChatEvent) => {
      if (
        event.senderCompanyId === senderCompanyId &&
        event.receiverCompanyId === currentCompanyId
      ) {
        setCount((prev) => prev + 1);
      }
    };

    const handleChatRead = (event: ChatEvent) => {
      if (
        event.senderCompanyId === senderCompanyId &&
        event.receiverCompanyId === currentCompanyId
      ) {
        setCount(0);
      }
    };

    channel.bind("chat-track", handleChatTrack);
    channel.bind("chat-read", handleChatRead);

    return () => {
      channel.unbind("chat-track", handleChatTrack);
      channel.unbind("chat-read", handleChatRead);
      pusher.unsubscribe(`company-track-${currentCompanyId}`);
    };
  }, [currentCompanyId, senderCompanyId]);

  return count;
}
