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

type TProps = { clientId: number; messages: any[] };

export default function SmsContainer({
  clientId,
  messages: initialMessages,
}: TProps) {
  const [messages, setMessages] = useState(initialMessages);
  const user = useGetCurrentUser();

  const setClientConversationTrack = useClientCommunicationStore(
    (state) => state.setClientConversationTrack,
  );

  // subscribe to pusher channel for realtime updates
  useEffect(() => {
    pusher
      .subscribe(`sms-${user?.companyId}-${clientId}`)
      .bind(
        "sms",
        (data: ClientSMS & { attachments?: ClientSmsAttachments[] }) => {
          if (!data) return;
          setMessages((prevMessages) => [...prevMessages, data]);
        },
      );
    return () => {
      pusher.unbind("mail").unsubscribe(`mail-${user?.companyId}-${clientId}`);
    };
  }, []);

  // update client unread messages
  const updateSmsUnReadMessages = useCallback(async () => {
    try {
      const readClientSms = await readClientSMS(clientId);
      setClientConversationTrack(readClientSms);
    } catch (err) {
      const formattedError = errorHandler(err);
      errorToast(formattedError.message);
    }
  }, [clientId]);

  useEffect(() => {
    updateSmsUnReadMessages();
  }, []);

  return (
    <>
      <SmsBox messages={messages} clientId={clientId} />
      <SendSms clientId={clientId} setMessages={setMessages} />
    </>
  );
}
