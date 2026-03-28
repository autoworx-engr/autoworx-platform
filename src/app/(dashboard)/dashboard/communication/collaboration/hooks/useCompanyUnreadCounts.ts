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

    const load = async () => {
      const data = await getCompanyUnreadCounts(
        currentCompanyId,
        senderCompanyId,
      );
      setCount(data.count);
    };

    load();

    const channel = pusher.subscribe(`company-track-${currentCompanyId}`);

    const handleChatTrack = (chatTrack: any) => {
      if (
        chatTrack.senderCompanyId === senderCompanyId &&
        chatTrack.receiverCompanyId === currentCompanyId
      ) {
        setCount((prev) => prev + 1);
      }
    };

    // ✅ NEW: read event
    const handleChatRead = (data: any) => {
      if (
        data.senderCompanyId === senderCompanyId &&
        data.receiverCompanyId === currentCompanyId
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
