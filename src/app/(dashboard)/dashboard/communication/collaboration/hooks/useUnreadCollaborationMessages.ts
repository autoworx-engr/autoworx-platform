"use client";
import { useEffect, useState } from "react";
import { pusher } from "@/lib/pusher/client";
import getUnreadCollaborationMessageCount from "@/actions/communication/collaboration/getUnreadMessageCount";

export function useUnreadCollaborationMessages(userId: number) {
  const [unreadCounts, setUnreadCounts] = useState<
    { count: number; lastMessage: string; createdAt: Date; senderId: number }[]
  >([]);

  // Initial load
  useEffect(() => {
    const loadUnreadCounts = async () => {
      const counts = await getUnreadCollaborationMessageCount(userId);
      setUnreadCounts(counts);
    };

    if (userId) {
      loadUnreadCounts();
    }
  }, [userId]);

  // Real-time updates
  useEffect(() => {
    if (!userId) return;

    const channel = pusher.subscribe(`track-${userId}`);

    const refreshUnreadCounts = async () => {
      const counts = await getUnreadCollaborationMessageCount(userId);
      setUnreadCounts(counts);
    };

    // Listen for new messages
    channel.bind("chat-track", refreshUnreadCounts);

    // Listen for messages being marked as read
    channel.bind("chat-track-read", refreshUnreadCounts);

    return () => {
      channel.unbind("chat-track");
      channel.unbind("chat-track-read");
      pusher.unsubscribe(`track-${userId}`);
    };
  }, [userId]);

  return unreadCounts;
}
