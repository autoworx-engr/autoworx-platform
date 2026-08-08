"use client";
import { cn } from "@/lib/cn";
import type React from "react";
import type { Client, ClientConversationTrack } from "@prisma/client";
import Image from "next/image";
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
import StarOrUnStarAction from "./StarOrUnStarAction";
import { useClientCommunicationStore } from "@/stores/client-store";
import { ChevronDown } from "lucide-react";
import { useCompanyFeaturePermissionStore } from "@/stores/companyFeaturePermissionStore";
import { companyPermissionModule } from "@/constants/company-permission";
import { isCallLive } from "@/lib/twilio/callDisplay";

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
  const [client, setClient] = useState<TClient | null>(clientFromDB);
  const router = useRouter();
  const { companyFeaturePermission } = useCompanyFeaturePermissionStore();

  const isMessengerAccess = companyFeaturePermission.find(
    (permission) =>
      permission.permission_name === companyPermissionModule?.MESSENGER,
  );

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
      if (filter === "Unread") {
        setClients((prev) => prev.filter((c) => c.id !== clientId));
      }
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
  }, [conversationTrack, client?.id]);

  const filter = useDemoClientFilterStore((state) => state.filter);

  const handleRedirect = async (channel?: string) => {
    // await updateLastMailReadId({ clientId: client.id });
    if (!isMessengerAccess?.enabled && channel == "MESSENGER") {
      channel = "SMS";
    }
    if (searchParams) {
      const params = new URLSearchParams(searchParams);
      let pathname = `/dashboard/communication/client/${client?.id}`;

      document.querySelector("#client-message-lists")?.classList.add("hidden");

      params.delete("open");
      if (channel && channel !== "SMS") {
        params.set("open", channel);
      }

      params.set("chat", "true");
      pathname = params.toString()
        ? `${pathname}?${params.toString()}`
        : pathname;

      useClientCommunicationStore.setState({
        clientConversationTrack: client?.conversationsTrack,
      });

      router.replace(pathname, {
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

  const conversationsTrack = client?.conversationsTrack as
    | (NonNullable<typeof client>["conversationsTrack"] & {
        messengerUnReadCount?: number;
        messengerLastMessage?: string | null;
        messengerIsRead?: boolean;
        messengerLastBy?: string | null;
      })
    | undefined;

  const isShowConversationIndicator =
    !!conversationsTrack &&
    (!conversationsTrack.emailIsRead ||
      !conversationsTrack.smsIsRead ||
      conversationsTrack.messengerIsRead === false);

  // While a call is ringing or connected the row collapses to just the call —
  // the email and SMS previews would only bury the thing that needs attention
  // right now. They come back the moment the call settles.
  const callTrack = conversationsTrack as
    | (typeof conversationsTrack & {
        callStatus?: string | null;
        callUpdatedAt?: Date | string | null;
      })
    | undefined;
  const isLiveCall = isCallLive(
    callTrack?.callStatus,
    callTrack?.callUpdatedAt,
  );
  const callPreview =
    isLiveCall && conversationsTrack?.smsLastMessage
      ? conversationsTrack.smsLastMessage
      : null;

  return (
    <div
      ref={buttonRef}
      onClick={() => handleRedirect()}
      className={cn(
        // layout
        "group relative mb-2 flex w-full cursor-pointer items-center gap-3 overflow-hidden rounded-2xl p-3 sm:p-4",
        // base card feel
        "border border-transparent shadow-sm transition-all duration-200",
        // hover/active polish
        "hover:shadow-md active:scale-[0.99]",
        // selected vs default states
        selected
          ? [
              "bg-gradient-to-r from-teal-700 to-teal-600",
              "ring-1 ring-teal-500/60",
            ].join(" ")
          : isLiveCall
            ? // A call happening right now outranks the normal resting style so
              // the row is impossible to miss while the phone is ringing.
              [
                "bg-emerald-50 dark:bg-emerald-950/40",
                "border-emerald-300 dark:border-emerald-700",
                "ring-1 ring-emerald-400/50",
              ].join(" ")
            : [
                "bg-white dark:bg-zinc-900/60",
                "border-zinc-200/70 dark:border-white/10",
                "hover:border-zinc-300/80 dark:hover:border-white/20",
              ].join(" "),
      )}
    >
      <Image
        src={
          client?.photo?.includes("autoworx-production")
            ? client.photo
            : "/images/default.png"
        }
        alt={(client?.firstName || "") + " " + (client?.lastName || "")}
        width={56}
        height={56}
        className={cn(
          "size-12 shrink-0 rounded-full object-cover",
          selected
            ? "ring-2 ring-white/80"
            : "ring-1 ring-zinc-200 dark:ring-white/10",
        )}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p
            className={cn(
              "truncate text-sm font-semibold tracking-tight",
              selected ? "text-white" : "text-zinc-800 dark:text-zinc-100",
            )}
            title={`${client?.firstName || ""} ${client?.lastName || ""}`}
          >
            {client?.firstName} {client?.lastName}
          </p>
        </div>

        {client?.customerCompany && (
          <p
            className={cn(
              "mt-1 truncate text-xs",
              selected ? "text-teal-50/90" : "text-zinc-500 dark:text-zinc-400",
            )}
            title={client?.customerCompany}
          >
            {client?.customerCompany}
          </p>
        )}

        {/* Live call — replaces the message previews for as long as it lasts */}
        {callPreview && (
          <p
            onClick={(e) => {
              e.stopPropagation();
              handleRedirect("PHONE");
            }}
            className={cn(
              "mt-2 line-clamp-1 cursor-pointer text-xs font-semibold",
              selected ? "text-white" : "text-emerald-600",
            )}
            title={callPreview}
          >
            <span className="mr-1.5 inline-block size-1.5 animate-pulse rounded-full bg-emerald-500 align-middle" />
            {callPreview}
          </p>
        )}

        {/* Email preview */}
        {!callPreview && client?.conversationsTrack?.emailLastMessage && (
          <p
            onClick={(e) => {
              e.stopPropagation();
              handleRedirect("EMAIL");
            }}
            className={cn(
              "mt-2 line-clamp-1 text-xs cursor-pointer",
              selected ? "text-white/95" : "text-zinc-600 dark:text-zinc-300",
              client?.conversationsTrack?.emailIsRead
                ? "font-normal"
                : "font-semibold",
            )}
            title={client?.conversationsTrack?.emailLastMessage}
          >
            {client?.conversationsTrack?.lastEmailBy === "Company"
              ? "You (Email)"
              : "Client (Email)"}{" "}
            — {client?.conversationsTrack?.emailLastMessage}
          </p>
        )}

        {/* SMS preview */}
        {!callPreview && client?.conversationsTrack?.smsLastMessage && (
          <p
            onClick={(e) => {
              e.stopPropagation();
              handleRedirect("SMS");
            }}
            className={cn(
              "mt-1.5 line-clamp-1 text-xs cursor-pointer",
              selected ? "text-white/95" : "text-zinc-600 dark:text-zinc-300",
              client?.conversationsTrack?.smsIsRead
                ? "font-normal"
                : "font-semibold",
            )}
            title={client?.conversationsTrack?.smsLastMessage}
          >
            {client?.conversationsTrack?.lastMessageBy === "Company"
              ? "You (SMS)"
              : "Client (SMS)"}{" "}
            — {client?.conversationsTrack?.smsLastMessage}
          </p>
        )}

        {/* Messenger preview */}
        {!callPreview && conversationsTrack?.messengerLastMessage && (
          <p
            onClick={(e) => {
              e.stopPropagation();
              handleRedirect("MESSENGER");
            }}
            className={cn(
              "mt-1.5 line-clamp-1 text-xs cursor-pointer",
              selected ? "text-white/95" : "text-zinc-600 dark:text-zinc-300",
              conversationsTrack?.messengerIsRead
                ? "font-normal"
                : "font-semibold",
            )}
            title={conversationsTrack?.messengerLastMessage}
          >
            {conversationsTrack?.messengerLastBy === "Company"
              ? "You (Messenger)"
              : "Client (Messenger)"}{" "}
            — {conversationsTrack?.messengerLastMessage}
          </p>
        )}
      </div>

      {/* notification indicator */}
      {isShowConversationIndicator && (
        <span
          role="status"
          aria-label="Unread conversation"
          className="absolute right-3 top-3 z-10 size-2.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-zinc-900"
        />
      )}

      <div className="relative ml-auto flex items-center gap-1.5">
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
                  "h-8 w-8 rounded-xl transition-colors",
                  selected
                    ? "text-white hover:bg-white/15"
                    : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/10",
                )}
                aria-label="More actions"
              >
                <ChevronDown className="h-4 w-4" />
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

      {/* subtle selection shine */}
      {selected && (
        <span className="pointer-events-none absolute inset-y-0 right-[-40%] h-[200%] w-[80%] rotate-12 bg-white/10 blur-2xl" />
      )}
    </div>
  );
}
