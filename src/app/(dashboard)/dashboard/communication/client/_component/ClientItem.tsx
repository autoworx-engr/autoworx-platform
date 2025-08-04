"use client";
import { cn } from "@/lib/cn";
import type React from "react";

import type { Client, ClientConversationTrack } from "@prisma/client";
import Image from "next/image";

import { starUnstarClient } from "@/actions/communication/client/starUnstarClient";
import { useDemoClientFilterStore } from "@/stores/clientFilter";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import StarOrUnStarAction from "./StarOrUnStarAction";
import { useClientCommunicationStore } from "@/stores/client-store";
import { MdKeyboardArrowDown } from "react-icons/md";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  readClientSmsAndEmail,
  unreadClientSmsAndEmail,
} from "@/actions/communication/client/chat-track";
import { errorToast } from "@/lib/toast";
import { errorHandler } from "@/error-boundary/globalErrorHandler";

type TClient = Client & {
  conversationsTrack?: ClientConversationTrack | null;
};

type ClientItemProps = {
  client: TClient;
  selected?: boolean;
  shouldShowDot?: boolean;
  setClients: React.Dispatch<
    React.SetStateAction<
      (Client & {
        conversationsTrack?: ClientConversationTrack | null;
      })[]
    >
  >;
};

export default function ClientItem({
  client: clientFromDB,
  selected,
  setClients,
}: ClientItemProps) {
  const [client, setClient] = useState<TClient | null>(null);
  const router = useRouter();

  const buttonRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();

  const conversationTrack = useClientCommunicationStore(
    (state) => state.clientConversationTrack,
  );
  const setClientConversationTrack = useClientCommunicationStore(
    (state) => state.setClientConversationTrack,
  );

  const markClientMessagesAsUnseen = async (clientId: number) => {
    try {
      const updatedTrack = await unreadClientSmsAndEmail(clientId);

      setClientConversationTrack(updatedTrack);
    } catch (err: any) {
      const formattedError = errorHandler(err);
      errorToast(formattedError.message);
    }
  };

  const markClientMessagesAsSeen = async (clientId: number) => {
    try {
      const updatedTrack = await readClientSmsAndEmail(clientId);
      setClientConversationTrack(updatedTrack);
    } catch (err: any) {
      const formattedError = errorHandler(err);
      errorToast(formattedError.message);
    }
  };

  useEffect(() => {
    if (clientFromDB) {
      setClient(clientFromDB);
    }
  }, [clientFromDB]);

  useEffect(() => {
    if (conversationTrack?.clientId === client?.id) {
      setClient((prev) => {
        return prev
          ? {
              ...prev,
              conversationsTrack: conversationTrack,
            }
          : prev;
      });
    }
  }, [conversationTrack]);

  const filter = useDemoClientFilterStore((state) => state.filter);

  const handleRedirect = async () => {
    // await updateLastMailReadId({ clientId: client.id });
    if (searchParams) {
      const params = new URLSearchParams(searchParams);
      let pathname = `/dashboard/communication/client/${client?.id}`;

      document.querySelector("#client-message-lists")?.classList.add("hidden");

      if (params.has("open")) {
        params.delete("open");
      }
      params.set("chat", "true");
      pathname = params.toString()
        ? `${pathname}?${params.toString()}`
        : pathname;

      useClientCommunicationStore.setState({
        clientConversationTrack: client?.conversationsTrack,
      });

      router.push(pathname, {
        scroll: false,
      });
    }
  };

  const handleStarUnStarClient = async (
    event: React.MouseEvent<HTMLButtonElement>,
    isStarred: boolean,
    clientId: number,
  ) => {
    try {
      event.stopPropagation();
      await starUnstarClient({
        clientId,
        state: isStarred ? false : true,
      });
      setClient((prev) => {
        return prev ? { ...prev, isStarred: isStarred ? false : true } : prev;
      });
      setClients((prev) => {
        if (filter === "Starred") {
          return prev.filter((client) => client.id !== clientId);
        }
        return prev;
      });
    } catch (err) {
      console.log(err);
    }
  };

  const chatHistory = client?.conversationsTrack;

  const isShowConversationIndicator =
    chatHistory && (!chatHistory?.smsIsRead || !chatHistory?.emailIsRead);
  return (
    <div
      ref={buttonRef}
      className={cn(
        "relative mb-2 flex w-full cursor-pointer items-center gap-2 overflow-x-hidden rounded-md p-3",
        selected ? "bg-[#006D77]" : "bg-[#F2F2F2]",
      )}
      onClick={handleRedirect}
    >
      <Image
        src={
          !client?.photo
            ? "/images/default.png"
            : client.photo.includes("/images/default.png")
              ? "/images/default.png"
              : client.photo
        }
        alt={client?.firstName + " " + client?.lastName}
        width={50}
        height={50}
        className="size-[50px] rounded-full"
      />
      <div className="flex flex-col">
        <p
          className={cn(
            "text-[14px] font-bold",
            selected ? "text-white" : "text-[#797979]",
          )}
        >
          {client?.firstName} {client?.lastName}
        </p>
        <p
          className={cn(
            "mt-2 text-xs",
            selected ? "text-white" : "text-[#797979]",
          )}
        >
          {client?.customerCompany}
        </p>
        {chatHistory?.emailLastMessage && (
          <p
            className={cn(
              "mt-2 line-clamp-1 text-xs",
              selected ? "text-white" : "text-[#797979]",
              chatHistory?.emailIsRead ? "font-normal" : "font-bold",
            )}
          >
            Last client email: {chatHistory?.emailLastMessage}
          </p>
        )}
        {chatHistory?.smsLastMessage && (
          <p
            className={cn(
              "mt-2 line-clamp-1 text-xs",
              selected ? "text-white" : "text-[#797979]",
              chatHistory?.smsIsRead ? "font-normal" : "font-bold",
            )}
          >
            Last client sms: {chatHistory?.smsLastMessage}
          </p>
        )}
      </div>
      {/* notification indicator */}
      {isShowConversationIndicator && (
        <div className="absolute right-[11px] top-[11px] z-10">
          <div className="flex h-5 w-5 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {chatHistory.emailIsUnReadCount + chatHistory.smsUnReadCount}
            </span>
          </div>
        </div>
      )}
      <div className="relative ml-auto flex items-center gap-x-2">
        <StarOrUnStarAction
          isStarred={!!client?.isStarred}
          clientId={client?.id}
          onStarChange={handleStarUnStarClient}
        />
        <div className="relative">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8",
                  selected
                    ? "text-white hover:bg-[#005a63]"
                    : "text-gray-500 hover:bg-gray-200",
                )}
              >
                <MdKeyboardArrowDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={async (e) => {
                  e.stopPropagation();

                  await markClientMessagesAsSeen(client?.id as number);
                }}
              >
                Mark as Read
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={async (e) => {
                  e.stopPropagation();

                  !isShowConversationIndicator &&
                    (await markClientMessagesAsUnseen(client?.id as number));
                }}
              >
                Mark as Unread
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  handleStarUnStarClient(
                    e as any,
                    !!client?.isStarred,
                    client?.id as number,
                  );
                }}
              >
                {client?.isStarred
                  ? "Remove from Favorites"
                  : "Add to Favorites"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
