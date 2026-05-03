"use client";

import { useCallback, useEffect, useState } from "react";
import SendMail from "./SendMail";
import MaiGunBox from "./MailGunBox";

import { MailgunEmail, MailgunEmailAttachment } from "@prisma/client";
import { useGetCurrentUser } from "@/utils/useGetCurrentUser";
import { pusher } from "@/lib/pusher/client";
import { readClientEmail } from "@/actions/communication/client/chat-track";
import { errorToast } from "@/lib/toast";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { useClientCommunicationStore } from "@/stores/client-store";
import RedirectToSettings from "./RedirectToSettings";

type TProps = {
  clientId: number;
  conversations?: (MailgunEmail & {
    attachments: MailgunEmailAttachment[];
    user?: {
      firstName: string;
      lastName: string | null;
    } | null;
  })[];
  clientEmail: boolean;
};

export default function MailgunMessageBox({
  clientId,
  conversations: initialMessages,
  clientEmail,
}: TProps) {
  const [conversations, setConversations] = useState(initialMessages);
  const setClientConversationTrack = useClientCommunicationStore(
    (state) => state.setClientConversationTrack,
  );

  const user = useGetCurrentUser();

  // pusher subscription
  useEffect(() => {
    pusher
      .subscribe(`mail-${user?.companyId}-${clientId}`)
      .bind(
        "mail",
        (data: MailgunEmail & { attachments: MailgunEmailAttachment[] }) => {
          if (!data) return;
          // update cache
          setConversations((prevMails) => {
            if (!prevMails) return [data];
            return [...prevMails, data];
          });
        },
      );
    return () => {
      return pusher
        .unbind("mail")
        .unsubscribe(`mail-${user?.companyId}-${clientId}`);
    };
  }, [user?.companyId, clientId]);

  // update client unread messages
  const updateEmailUnReadMessages = useCallback(async () => {
    try {
      const readClientConversation = await readClientEmail(clientId);
      console.log({ readClientConversation });
      setClientConversationTrack(readClientConversation);
    } catch (err: any) {
      const formattedError = errorHandler(err);
      errorToast(formattedError.message);
    }
  }, [clientId, setClientConversationTrack]);

  useEffect(() => {
    updateEmailUnReadMessages();
  }, [updateEmailUnReadMessages]);

  return (
    <>
      {clientEmail ? (
        <div className="flex flex-col h-full gap-0">
          <div className="flex-1 overflow-hidden">
            <MaiGunBox conversations={conversations} clientId={clientId} />
          </div>
          {user && (
            <div className="flex-shrink-0">
              <SendMail
                clientId={clientId}
                companyId={user.companyId}
                setConversations={setConversations}
              />
            </div>
          )}
        </div>
      ) : (
        <RedirectToSettings
          message="This Client has no email."
          link={"/dashboard/client/" + clientId}
          linkText="Go to Client"
        />
      )}
    </>
  );
}
