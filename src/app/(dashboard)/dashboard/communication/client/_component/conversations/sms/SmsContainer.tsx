"use client";

import React, { useCallback, useEffect, useState } from "react";
import SmsBox from "./SmsBox";
import SendSms from "./SendSms";
import { ClientSMS, ClientSmsAttachments } from "@prisma/client";
import { useGetCurrentUser } from "@/utils/useGetCurrentUser";
import { pusher } from "@/lib/pusher/client";
import { readClientSMS } from "@/actions/communication/client/chat-track";
import { errorToast } from "@/lib/toast";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { useClientCommunicationStore } from "@/stores/client-store";
import { useQueryClient } from "@tanstack/react-query";
import { smsQueryKey } from "../../../_utils/queryKey";

type TProps = { clientId: number; canUseSms?: boolean };

export default function SmsContainer({ clientId, canUseSms = true }: TProps) {
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState();
  const user = useGetCurrentUser();

  const setClientConversationTrack = useClientCommunicationStore(
    (state) => state.setClientConversationTrack,
  );

  // subscribe to pusher channel for realtime updates (instant cache prepend)
  useEffect(() => {
    if (!user?.companyId) return;

    const channelName = `sms-${user.companyId}-${clientId}`;
    const channel = pusher.subscribe(channelName);

    const handler = (
      data: ClientSMS & {
        user?: {
          firstName: string;
          lastName: string | null;
        } | null;
      } & { attachments?: ClientSmsAttachments[] },
    ) => {
      if (!data) return;

      queryClient?.setQueryData(
        smsQueryKey.allSmsByClientId(clientId),
        (oldData: any) => {
          if (!oldData) return oldData;
          if (oldData.pages.length === 0) return oldData;
          const initialPage = oldData.pages[0];

          // avoid duplicates (e.g. if both channels fire)
          const exists = initialPage.data.some((m: any) => m.id === data.id);
          if (exists) return oldData;

          const updatedLastPageMessages = [data, ...initialPage.data];
          const updatedPages = oldData.pages.map(
            (
              page: {
                data: ClientSMS[];
                total: number;
                nextPage: number;
                hasMore: boolean;
              },
              index: number,
            ) => {
              if (index === 0) {
                return {
                  ...page,
                  data: updatedLastPageMessages,
                };
              }
              return page;
            },
          );
          return {
            ...oldData,
            pages: updatedPages,
          };
        },
      );
    };

    channel.bind("sms", handler);

    return () => {
      channel.unbind("sms", handler);
      pusher.unsubscribe(channelName);
    };
  }, [user?.companyId, clientId, queryClient]);

  // Fallback: also listen to `message-{clientId}` channel (the one that
  // updates the sidebar). This channel doesn't depend on companyId, so it
  // works even while the session is still loading. When it fires we simply
  // invalidate the query so the message box refetches.
  useEffect(() => {
    if (!clientId) return;

    const channelName = `message-${clientId}`;
    const channel = pusher.subscribe(channelName);

    const handler = () => {
      queryClient.invalidateQueries({
        queryKey: smsQueryKey.allSmsByClientId(clientId),
      });
    };

    channel.bind("client", handler);

    return () => {
      channel.unbind("client", handler);
      pusher.unsubscribe(channelName);
    };
  }, [clientId, queryClient]);

  // update client unread messages
  const updateSmsUnReadMessages = useCallback(async () => {
    try {
      const readClientSms = await readClientSMS(clientId);
      setClientConversationTrack(readClientSms);
    } catch (err) {
      const formattedError = errorHandler(err);
      errorToast(formattedError.message);
    }
  }, [clientId, setClientConversationTrack]);

  useEffect(() => {
    updateSmsUnReadMessages();
  }, [updateSmsUnReadMessages]);

  return (
    <div className="flex h-full flex-col gap-0">
      <div className="flex-1 overflow-hidden">
        <SmsBox key={clientId} clientId={clientId} />
      </div>
      {/* Input area - always stays at bottom */}
      <div className="flex-shrink-0">
        <SendSms
          clientId={clientId}
          companyId={user?.companyId!}
          canUseSms={canUseSms}
        />
      </div>
    </div>
  );
}
