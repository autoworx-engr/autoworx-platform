import { markUserAsRead } from "@/actions/communication/internal/markUserAsRead";
import Avatar from "@/components/Avatar";
import { cn } from "@/lib/cn";
import { useChatTrackStore } from "@/stores/chatTrackStore";
import { ChatTrack, Message, User } from "@prisma/client";
import { useSession } from "next-auth/react";
import { useMemo } from "react";
import { useDraftPreview } from "../_hooks/useDraftPreview";

type TUser = User & { unreadCount: number; latestMessage?: Message | null };
type TTraceMessage = ChatTrack & { message?: Message | null };

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
  const { setUnreadMessageCount } = useChatTrackStore();
  // No local state, no per-row pusher subscription. The parent's `useChatTrackPusher`
  // owns the single `track-${sessionUserId}` channel and updates `chatTrackState`
  // + `userState` for the whole sidebar; this component just reads from props.
  const lastMessageHistory = traceLastMessage;

  const participants = useMemo<"sender" | "receiver">(() => {
    const messageToCheck = lastMessageHistory?.message || user.latestMessage;
    if (!messageToCheck) return "receiver";
    return messageToCheck.from === parseInt(session?.user?.id!)
      ? "sender"
      : "receiver";
  }, [lastMessageHistory?.message, user.latestMessage, session?.user?.id]);

  const handleSelectedUser = async (
    selected: TUser,
    role: "sender" | "receiver",
    _lastMessageInfo?: TTraceMessage | null,
  ) => {
    // Snapshot the prior unread count BEFORE we mutate state so we know
    // exactly how much to subtract from the global side-nav counter.
    const priorUnread = selected.unreadCount ?? 0;

    // Server-side: flip the (me, other) internal chatTrack to isRead=true.
    // Pair-based lookup — no need for a pre-hydrated chatTrackId. The action
    // emits `chat-track-read` Pusher events so all open tabs sync.
    if (priorUnread > 0) {
      void markUserAsRead(selected.id);
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

    // Drop the side-nav internal counter by exactly what this conversation
    // was contributing. `useChatTrackPusher.handleMessageRead` will also fire
    // when the read receipt round-trips through Pusher, but that handler
    // doesn't decrement the global counter, so this is the canonical place.
    if (priorUnread > 0) {
      const currentUnread = useChatTrackStore.getState().unreadMessageCount;
      setUnreadMessageCount({
        ...currentUnread,
        internalCount: Math.max(0, currentUnread.internalCount - priorUnread),
      });
    }
  };

  // Badge + unread typography are driven by the server-side `user.unreadCount`
  // (real per-counterpart count) — chatTrack is no longer plumbed per-row, so
  // we don't gate on `lastMessageHistory.isRead`. `unreadCount > 0` already
  // implies inbound unread messages from this user.
  const unreadCount = user.unreadCount ?? 0;
  const unreadLabel = unreadCount > 9 ? "9+" : String(unreadCount);
  const showBadge = unreadCount > 0;

  const messageText =
    lastMessageHistory?.lastMessage || user.latestMessage?.message;
  const previewPrefix = participants === "sender" ? "You" : user.firstName;
  const isUnreadPreview = unreadCount > 0 && !isSelectedUser;
  // Suppressed while this row is open — you're already looking at that text
  // in the compose box, so re-showing it here on every keystroke is noise.
  const draftTextLive = useDraftPreview("internal", "dm", user.id);
  const draftText = isSelectedUser ? "" : draftTextLive;

  return (
    <button
      onClick={() => handleSelectedUser(user, participants, lastMessageHistory)}
      className={cn(
        "group relative flex w-full items-center gap-3 rounded-lg p-3 text-left",
        "border shadow-sm transition-all duration-200 hover:shadow-md active:scale-[0.99]",
        isSelectedUser
          ? "border-transparent bg-gradient-to-r from-teal-700 to-teal-600 ring-1 ring-teal-500/60"
          : "border-zinc-200/70 bg-white hover:border-zinc-300/80 dark:border-white/10 dark:bg-zinc-900/60 dark:hover:border-white/20",
      )}
    >
      {showBadge && (
        <div className="absolute right-3 top-3 z-10">
          <div className="relative flex h-5 min-w-5 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex min-w-4 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
              {unreadLabel}
            </span>
          </div>
        </div>
      )}

      <div
        className={cn(
          "shrink-0 rounded-full ring-2",
          isSelectedUser ? "ring-teal-600" : "ring-white dark:ring-zinc-900",
        )}
      >
        <Avatar photo={user.image} width={40} height={40} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <p
          className={cn(
            "truncate text-sm",
            isSelectedUser
              ? "font-semibold text-white"
              : isUnreadPreview
                ? "font-extrabold text-zinc-900 dark:text-zinc-50"
                : "font-semibold text-zinc-800 dark:text-zinc-100",
          )}
        >
          {user.firstName} {user.lastName}
        </p>
        {(draftText || messageText) && (
          <p
            className={cn(
              "mt-0.5 line-clamp-1 text-xs",
              isSelectedUser
                ? "text-white/80"
                : isUnreadPreview
                  ? "font-semibold text-zinc-700 dark:text-zinc-200"
                  : "text-zinc-500 dark:text-zinc-400",
            )}
          >
            {draftText ? (
              <>
                <span className="font-semibold text-black dark:text-white">
                  Draft:
                </span>{" "}
                {draftText}
              </>
            ) : (
              `${previewPrefix}: ${messageText}`
            )}
          </p>
        )}
      </div>
    </button>
  );
}
