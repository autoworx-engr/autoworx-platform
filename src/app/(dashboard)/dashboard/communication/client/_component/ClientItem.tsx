"use client";
import { cn } from "@/lib/cn";
import type React from "react";
import type { Client, ClientConversationTrack } from "@prisma/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { errorToast } from "@/lib/toast";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import {
  readClientSmsAndEmail,
  unreadClientSmsAndEmail,
} from "@/actions/communication/client/chat-track";

import { starUnstarClient } from "@/actions/communication/client/starUnstarClient";
import { useDemoClientFilterStore } from "@/stores/clientFilter";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { MoreHorizontal, Star } from "lucide-react";
import { useClientCommunicationStore } from "@/stores/client-store";

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

function hasRealPhoto(photo?: string | null) {
  return !!photo && !photo.includes("/images/default.png");
}

function relativeTime(d?: Date | string | null) {
  if (!d) return "";
  const date = new Date(d);
  const now = Date.now();
  const diff = (now - date.getTime()) / 1000;
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 86400 * 2) return "Yesterday";
  if (diff < 86400 * 7)
    return date.toLocaleDateString("en-US", { weekday: "short" });
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ClientItem({
  client: clientFromDB,
  selected,
  setClients,
}: ClientItemProps) {
  const [client, setClient] = useState<TClient | null>(clientFromDB);
  const router = useRouter();
  const buttonRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();

  const conversationTrack = useClientCommunicationStore(
    (state) => state.clientConversationTrack,
  );
  const setClientConversationTrack = useClientCommunicationStore(
    (state) => state.setClientConversationTrack,
  );

  const markRead = async (id: number) => {
    try {
      setClientConversationTrack(await readClientSmsAndEmail(id));
    } catch (err: any) {
      errorToast(errorHandler(err).message);
    }
  };
  const markUnread = async (id: number) => {
    try {
      const updatedTrack = await readClientSmsAndEmail(clientId);
      setClientConversationTrack(updatedTrack);
      if (filter === "Unread") {
        setClients((prev) => prev.filter((c) => c.id !== clientId));
      }
    } catch (err: any) {
      errorToast(errorHandler(err).message);
    }
  };

  useEffect(() => {
    if (clientFromDB) setClient(clientFromDB);
  }, [clientFromDB]);

  useEffect(() => {
    if (conversationTrack?.clientId === client?.id) {
      setClient((prev) =>
        prev ? { ...prev, conversationsTrack: conversationTrack } : prev,
      );
    }
  }, [conversationTrack]);

  const filter = useDemoClientFilterStore((state) => state.filter);

  const handleRedirect = () => {
    if (!searchParams) return;
    const params = new URLSearchParams(searchParams);
    let pathname = `/dashboard/communication/client/${client?.id}`;
    document.querySelector("#client-message-lists")?.classList.add("hidden");
    if (params.has("open")) params.delete("open");
    params.set("chat", "true");
    pathname = params.toString()
      ? `${pathname}?${params.toString()}`
      : pathname;
    useClientCommunicationStore.setState({
      clientConversationTrack: client?.conversationsTrack,
    });
    router.replace(pathname, { scroll: false });
  };

  const handleStar = async (
    event: React.MouseEvent<HTMLButtonElement>,
    isStarred: boolean,
    clientId: number,
  ) => {
    try {
      event.stopPropagation();
      await starUnstarClient({ clientId, state: !isStarred });
      setClient((prev) => (prev ? { ...prev, isStarred: !isStarred } : prev));
      setClients((prev) =>
        filter === "Starred" ? prev.filter((c) => c.id !== clientId) : prev,
      );
    } catch (err) {
      console.log(err);
    }
  };

  const track = client?.conversationsTrack;
  const hasUnread =
    !!track &&
    (!track.smsIsRead || !track.emailIsRead || !track.messengerIsRead);
  const unreadCount =
    (track?.emailIsUnReadCount || 0) +
    (track?.smsUnReadCount || 0) +
    (track?.messengerUnReadCount || 0);

  const lastMessage =
    track?.smsLastMessage ||
    track?.emailLastMessage ||
    track?.messengerLastMessage ||
    "";
  const lastBy =
    track?.lastMessageBy || track?.lastEmailBy || track?.messengerLastBy;
  const preview = lastMessage
    ? `${lastBy === "Company" ? "You: " : ""}${lastMessage}`
    : "";

  return (
    <div
      ref={buttonRef}
      onClick={handleRedirect}
      className={cn(
        "group relative flex w-full cursor-pointer items-start gap-3 px-3 py-2.5",
        "border-b border-l-2 border-b-zinc-100 transition-colors dark:border-b-white/10",
        selected
          ? "bg-[#006D77]/5 border-l-[#006D77]"
          : "border-l-transparent hover:bg-zinc-50 dark:hover:bg-white/5",
      )}
    >
      <Image
        src={
          hasRealPhoto(client?.photo) ? client!.photo : "/images/default.png"
        }
        alt={`${client?.firstName ?? ""} ${client?.lastName ?? ""}`.trim()}
        width={40}
        height={40}
        className="size-10 shrink-0 rounded-full object-cover ring-1 ring-zinc-200 dark:ring-white/10"
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p
            className={cn(
              "truncate text-sm",
              hasUnread || selected
                ? "font-semibold text-zinc-900 dark:text-zinc-50"
                : "font-medium text-zinc-700 dark:text-zinc-200",
            )}
          >
            {client?.firstName} {client?.lastName}
          </p>
          {hasUnread && (
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#006D77]" />
          )}
          {!!client?.isStarred && (
            <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />
          )}
        </div>
        {preview && (
          <p
            className={cn(
              "mt-0.5 line-clamp-1 text-xs",
              hasUnread
                ? "text-zinc-700 dark:text-zinc-200"
                : "text-zinc-500 dark:text-zinc-400",
            )}
            title={preview}
          >
            {preview}
          </p>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
          {relativeTime(track?.sendAt ?? track?.updatedAt)}
        </span>
        {unreadCount > 0 ? (
          <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#006D77] px-1.5 text-[10px] font-semibold text-white">
            {unreadCount}
          </span>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 text-zinc-300 opacity-0 transition-opacity hover:text-zinc-600 group-hover:opacity-100"
                aria-label="More actions"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-44 rounded-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenuItem
                onClick={async (e) => {
                  e.stopPropagation();
                  await markRead(client?.id as number);
                }}
              >
                Mark as Read
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={async (e) => {
                  e.stopPropagation();
                  !hasUnread && (await markUnread(client?.id as number));
                }}
              >
                Mark as Unread
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) =>
                  handleStar(
                    e as any,
                    !!client?.isStarred,
                    client?.id as number,
                  )
                }
              >
                {client?.isStarred
                  ? "Remove from Favorites"
                  : "Add to Favorites"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
