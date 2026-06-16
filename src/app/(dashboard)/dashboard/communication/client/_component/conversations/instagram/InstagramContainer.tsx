"use client";

import { useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { pusher } from "@/lib/pusher/client";
import { useGetCurrentUser } from "@/utils/useGetCurrentUser";
import { useClientCommunicationStore } from "@/stores/client-store";
import { instagramQueryKey } from "../../../_utils/queryKey";
import { readClientInstagram } from "@/actions/communication/client/chat-track";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { errorToast } from "@/lib/toast";
import InstagramBox from "./InstagramBox";
import SendInstagram from "./SendInstagram";

type TProps = { clientId: number; windowClosed?: boolean };

export default function InstagramContainer({ clientId, windowClosed }: TProps) {
  const queryClient = useQueryClient();
  const user = useGetCurrentUser();
  const setClientConversationTrack = useClientCommunicationStore(
    (state) => state.setClientConversationTrack,
  );

  // Pusher: live new-message injection
  useEffect(() => {
    if (!user?.companyId) return;
    const channel = pusher.subscribe(`instagram-${user.companyId}-${clientId}`);

    channel.bind("instagram", (data: any) => {
      if (!data) return;
      queryClient.setQueryData(
        instagramQueryKey.allByClientId(clientId),
        (old: any) => {
          if (!old?.pages?.length) return old;
          const exists = old.pages[0].data.some((m: any) => m.id === data.id);
          if (exists) return old;
          const pages = old.pages.map((page: any, i: number) =>
            i === 0 ? { ...page, data: [data, ...page.data] } : page,
          );
          return { ...old, pages };
        },
      );
    });

    return () => {
      channel.unbind("instagram");
      pusher.unsubscribe(`instagram-${user.companyId}-${clientId}`);
    };
  }, [user?.companyId, clientId, queryClient]);

  // Mark messages as read when tab is opened
  const markRead = useCallback(async () => {
    try {
      const updated = await readClientInstagram(clientId);
      if (updated) setClientConversationTrack(updated as any);
    } catch (err) {
      const formatted = errorHandler(err);
      errorToast(formatted.message);
    }
  }, [clientId, setClientConversationTrack]);

  useEffect(() => {
    markRead();
  }, [markRead]);

  return (
    <div className="flex h-full flex-col gap-0">
      <div className="flex-1 overflow-hidden">
        <InstagramBox key={clientId} clientId={clientId} />
      </div>
      <div className="flex-shrink-0">
        {windowClosed ? (
          <div className="flex items-center justify-center rounded-b-md bg-zinc-100 px-4 py-3 dark:bg-zinc-800/60">
            <p className="text-center text-xs text-zinc-500">
              The 24-hour messaging window has closed. You can reply once the
              client sends another message.
            </p>
          </div>
        ) : (
          <SendInstagram clientId={clientId} />
        )}
      </div>
    </div>
  );
}
