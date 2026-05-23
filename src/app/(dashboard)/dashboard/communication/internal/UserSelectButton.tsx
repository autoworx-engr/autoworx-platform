import { createUserChatTrack } from "@/actions/communication/internal/createUserChatTrack";
import { updateChatTrack } from "@/actions/communication/internal/updateChatTrack";
import Avatar from "@/components/Avatar";
import { cn } from "@/lib/cn";
import { pusher } from "@/lib/pusher/client";
import { useChatTrackStore } from "@/stores/chatTrackStore";
import { ChatTrack, Message, User } from "@prisma/client";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { useMessageDeduper } from "./_hooks/useMessageDeduper";

type TUser = User & { unreadCount: number; latestMessage?: Message | null };
type TTraceMessage = ChatTrack & { message?: Message | null };
type TPusherChatTrack = ChatTrack & { message: Message | null };

type TProps = {
  user: TUser;
  isSelectedUser: boolean;
  traceLastMessage?: TTraceMessage | null;
  setUsersList: React.Dispatch<React.SetStateAction<TUser[]>>;
  groupListLength: number;
  updateUserState?: (userId: number, updates: Partial<TUser>) => void;
  addChatItem?: (item: TUser, type: "user" | "group") => void;
};

export default function UserSelectButton({
  user,
  isSelectedUser,
  traceLastMessage,
  setUsersList,
  groupListLength,
  updateUserState,
  addChatItem,
}: TProps) {
  const { data: session } = useSession();
  const { setLastMessage, setUnreadMessageCount } = useChatTrackStore();
  const [lastMessageHistory, setLastMessageHistory] =
    useState(traceLastMessage);
  const { shouldProcess } = useMessageDeduper(100);

  useEffect(() => {
    if (traceLastMessage) {
      setLastMessageHistory(traceLastMessage);
    }
  }, [traceLastMessage]);

  // Ensure a ChatTrack row exists for this pair.
  useEffect(() => {
    if (traceLastMessage) return;
    createUserChatTrack({
      senderId: parseInt(session?.user?.id!),
      receiverId: user.id,
    }).catch(() => {
      /* non-blocking; row will be lazily created on first send */
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const participants = useMemo<"sender" | "receiver">(() => {
    const messageToCheck = lastMessageHistory?.message || user.latestMessage;
    if (!messageToCheck) return "receiver";
    return messageToCheck.from === parseInt(session?.user?.id!)
      ? "sender"
      : "receiver";
  }, [lastMessageHistory?.message, user.latestMessage, session?.user?.id]);

  useEffect(() => {
    const currentUserChannel = pusher.subscribe(`track-${session?.user?.id}`);
    const otherUserChannel = pusher.subscribe(`track-${user?.id}`);

    const handleChatTrack = (data: TPusherChatTrack) => {
      const messageKey = `${data.message?.id || data.id}-${data.message?.from}-${data.message?.to}-${data.message?.createdAt}`;
      if (!shouldProcess(messageKey)) return;

      const isForThisConversation =
        (data.message?.to === parseInt(session?.user?.id!) &&
          data.message?.from === user.id) ||
        (data.message?.from === parseInt(session?.user?.id!) &&
          data.message?.to === user.id);

      if (!isForThisConversation || data.message?.groupId) return;

      const updatedChatTrack = {
        ...data,
        lastMessage: data.message?.message || data.lastMessage,
      };
      setLastMessageHistory(updatedChatTrack);
      setLastMessage(updatedChatTrack);

      if (data.message?.to === parseInt(session?.user?.id!)) {
        const currentUnread = useChatTrackStore.getState().unreadMessageCount;
        setUnreadMessageCount({
          ...currentUnread,
          internalCount: currentUnread.internalCount + 1,
        });
        setUsersList((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, unreadCount: 1 } : u)),
        );
        updateUserState?.(user.id, { unreadCount: 1 });
      }
    };

    const handleChatTrackRead = (data: {
      senderId: number;
      userId: number;
      section: string;
    }) => {
      if (
        data.senderId === user.id &&
        data.userId === parseInt(session?.user?.id!)
      ) {
        setLastMessageHistory((prev) =>
          prev ? { ...prev, isRead: true } : prev,
        );
      }
    };

    currentUserChannel.bind("chat-track", handleChatTrack);
    otherUserChannel.bind("chat-track", handleChatTrack);
    currentUserChannel.bind("chat-track-read", handleChatTrackRead);
    otherUserChannel.bind("chat-track-read", handleChatTrackRead);

    return () => {
      currentUserChannel.unbind("chat-track", handleChatTrack);
      currentUserChannel.unbind("chat-track-read", handleChatTrackRead);
      otherUserChannel.unbind("chat-track", handleChatTrack);
      otherUserChannel.unbind("chat-track-read", handleChatTrackRead);
      pusher.unsubscribe(`track-${session?.user?.id}`);
      pusher.unsubscribe(`track-${user?.id}`);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, session?.user?.id]);

  const handleSelectedUser = async (
    selected: TUser,
    role: "sender" | "receiver",
    lastMessageInfo?: TTraceMessage | null,
  ) => {
    const updatedLastMessage =
      lastMessageInfo &&
      role === "receiver" &&
      (await updateChatTrack(lastMessageInfo.id));

    if (updatedLastMessage && updatedLastMessage?.type === "success") {
      setLastMessageHistory(updatedLastMessage?.data);
    }

    if (addChatItem) {
      const updatedUser = { ...selected, unreadCount: 0 };
      addChatItem(updatedUser, "user");
      updateUserState?.(selected.id, { unreadCount: 0 });
    } else {
      setUsersList((list) => {
        const idx = list.findIndex((u) => u.id === selected.id);
        if (idx !== -1) {
          const next = [...list];
          next[idx] = { ...next[idx], unreadCount: 0 };
          updateUserState?.(selected.id, { unreadCount: 0 });
          return next;
        }

        const updatedUser = { ...selected, unreadCount: 0 };
        updateUserState?.(selected.id, { unreadCount: 0 });

        const total = list.length + groupListLength;
        if (total >= 4 && list.length >= 1) {
          const next = [...list];
          next[next.length - 1] = updatedUser;
          return next;
        }
        return [...list, updatedUser];
      });
    }

    if (lastMessageInfo && !lastMessageInfo.isRead && role === "receiver") {
      const currentUnread = useChatTrackStore.getState().unreadMessageCount;
      setUnreadMessageCount({
        ...currentUnread,
        internalCount: Math.max(0, currentUnread.internalCount - 1),
      });
    }
  };

  const hasMessageHistory =
    lastMessageHistory?.messageId && lastMessageHistory?.lastMessage;
  const isUnreadReceiver =
    hasMessageHistory &&
    !lastMessageHistory?.isRead &&
    participants === "receiver";

  return (
    <button
      className={cn(
        `group relative flex items-center w-full gap-2 rounded-2xl p-3 sm:p-4`,
        "border border-transparent shadow-sm transition-all duration-200",
        "hover:shadow-md active:scale-[0.99]",
        isSelectedUser
          ? "bg-gradient-to-r from-teal-700 to-teal-600 ring-1 ring-teal-500/60"
          : "bg-white dark:bg-zinc-900/60 border-zinc-200/70 dark:border-white/10 hover:border-zinc-300/80 dark:hover:border-white/20",
      )}
      onClick={() => handleSelectedUser(user, participants, lastMessageHistory)}
    >
      {isUnreadReceiver && (
        <div className="absolute right-[11px] top-[11px] z-10">
          <div className="flex h-5 w-5 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              1
            </span>
          </div>
        </div>
      )}
      <Avatar
        className="flex-shrink-0"
        photo={user.image}
        width={60}
        height={60}
      />
      <div className="flex w-full flex-col justify-start hover:text-white text-start">
        <p
          className={cn(
            "text-[14px] font-bold text-[#797979]",
            isSelectedUser
              ? "text-[#F2F2F2] font-bold"
              : lastMessageHistory?.isRead || participants === "sender"
                ? "text-black font-bold"
                : "text-black font-extrabold",
          )}
        >
          {user.firstName} {user.lastName}
        </p>
        {(lastMessageHistory?.lastMessage || user.latestMessage) && (
          <p
            className={cn(
              "mt-2 line-clamp-1 text-xs",
              lastMessageHistory?.isRead ||
                isSelectedUser ||
                participants === "sender"
                ? "font-normal"
                : "font-semibold",
              isSelectedUser
                ? "text-white/95"
                : "text-zinc-600 dark:text-zinc-300",
            )}
          >
            {(() => {
              const displayText =
                participants === "sender" ? "You" : user.firstName;
              const messageText =
                lastMessageHistory?.lastMessage || user.latestMessage?.message;
              return messageText ? `${displayText}: ${messageText}` : "";
            })()}
          </p>
        )}
      </div>
    </button>
  );
}
