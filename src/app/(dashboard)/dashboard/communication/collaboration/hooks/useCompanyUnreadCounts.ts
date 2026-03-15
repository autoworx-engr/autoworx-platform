"use client";

import { useEffect, useState } from "react";
import { getCompanyUnreadCounts } from "@/actions/communication/collaboration/getCompanyUnreadCounts";
import { pusher } from "@/lib/pusher/client";

export function useCompanyUnreadCounts(
  currentCompanyId: number,
  senderCompanyId: number,
) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!currentCompanyId || !senderCompanyId) return;

    // Initial fetch
    const load = async () => {
      const data = await getCompanyUnreadCounts(
        currentCompanyId,
        senderCompanyId,
      );
      setCount(data.count);
    };

    load();

    const channel = pusher.subscribe(`company-track-${currentCompanyId}`);

    // Listen for chat-track events
    const handleChatTrack = (chatTrack: any) => {
      // যদি sender match করে
      if (
        chatTrack.senderCompanyId === senderCompanyId &&
        chatTrack.receiverCompanyId === currentCompanyId
      ) {
        setCount((prev) => prev + 1);
      }
    };

    channel.bind("chat-track", handleChatTrack);

    return () => {
      channel.unbind("chat-track", handleChatTrack);
      pusher.unsubscribe(`company-track-${currentCompanyId}`);
    };
  }, [currentCompanyId, senderCompanyId]);

  return count;
}
