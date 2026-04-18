"use client";

import { pusher } from "@/lib/pusher/client";
import { useClientCommunicationStore } from "@/stores/client-store";
import { useGetCurrentUser } from "@/utils/useGetCurrentUser";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { readMetaMessages } from "../../../_actions/readMetaMessages";
import { metaQueryKey } from "../../../_utils/queryKey";
import MetaBox from "./MetaBox";
import SendMeta from "./SendMeta";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { errorToast } from "@/lib/toast";

type TProps = {
  clientId: number;
  defaultPlatform?: "INSTAGRAM" | "FACEBOOK";
};

/**
 * Client component that orchestrates the Meta (Instagram + Facebook) conversation view.
 *
 * Responsibilities:
 * - Subscribes to two Pusher channels for real-time message delivery:
 *     • `meta-{companyId}-{clientId}` / event `"meta"` — primary channel for new messages;
 *       prepends received messages directly to the TanStack Query cache
 *     • `message-{clientId}` / event `"client"` — fallback channel; invalidates the query
 *       to trigger a refetch (mirrors the SMS container pattern)
 * - Calls `readMetaMessages` on mount to clear the unread badge
 * - Passes `activePlatform` state down to `SendMeta` so the user can switch
 *   between sending via Instagram or Facebook without changing the URL
 *
 * Note: both Instagram DMs and Facebook Messenger messages are displayed in the
 * same unified feed regardless of `activePlatform`. The platform only controls
 * which channel outgoing messages are sent on.
 *
 * @param clientId - Client to display the conversation for
 * @param defaultPlatform - Which send platform to default to ("INSTAGRAM" | "FACEBOOK")
 */
export default function MetaContainer({
  clientId,
  defaultPlatform = "INSTAGRAM",
}: TProps) {
  const queryClient = useQueryClient();
  const user = useGetCurrentUser();
  const [activePlatform, setActivePlatform] = useState<
    "INSTAGRAM" | "FACEBOOK"
  >(defaultPlatform);

  const setClientConversationTrack = useClientCommunicationStore(
    (state) => state.setClientConversationTrack,
  );

  // Pusher: primary channel — meta-{companyId}-{clientId} / "meta"
  // Mirrors SmsContainer's sms-{companyId}-{clientId} / "sms" subscription exactly
  useEffect(() => {
    if (!user?.companyId) return;

    const channelName = `meta-${user.companyId}-${clientId}`;
    const channel = pusher.subscribe(channelName);

    const handler = (data: any) => {
      if (!data) return;
      queryClient.setQueryData(
        metaQueryKey.allByClientId(clientId),
        (oldData: any) => {
          if (!oldData || oldData.pages.length === 0) return oldData;
          const [first, ...rest] = oldData.pages;
          const exists = first.data.some((m: any) => m.id === data.id);
          if (exists) return oldData;
          return {
            ...oldData,
            pages: [{ ...first, data: [data, ...first.data] }, ...rest],
          };
        },
      );
    };

    channel.bind("meta", handler);
    return () => {
      channel.unbind("meta", handler);
      pusher.unsubscribe(channelName);
    };
  }, [user?.companyId, clientId, queryClient]);

  // Pusher: fallback message-{clientId} / "client" — mirrors SmsContainer
  useEffect(() => {
    if (!clientId) return;
    const channel = pusher.subscribe(`message-${clientId}`);
    const handler = () => {
      queryClient.invalidateQueries({
        queryKey: metaQueryKey.allByClientId(clientId),
      });
    };
    channel.bind("client", handler);
    return () => {
      channel.unbind("client", handler);
      pusher.unsubscribe(`message-${clientId}`);
    };
  }, [clientId, queryClient]);

  // Mark Meta messages as read on mount — mirrors SmsContainer's updateSmsUnReadMessages
  const markAsRead = useCallback(async () => {
    try {
      const updated = await readMetaMessages(clientId);
      setClientConversationTrack(updated);
    } catch (err) {
      errorToast(errorHandler(err).message);
    }
  }, [clientId, setClientConversationTrack]);

  useEffect(() => {
    markAsRead();
  }, [markAsRead]);

  return (
    <div className="flex h-full flex-col gap-0">
      <div className="flex-1 overflow-hidden">
        <MetaBox key={clientId} clientId={clientId} />
      </div>
      <div className="flex-shrink-0">
        <SendMeta
          clientId={clientId}
          platform={activePlatform}
          onPlatformChange={setActivePlatform}
        />
      </div>
    </div>
  );
}
