import { createUserChatTrack } from "@/actions/communication/internal/createUserChatTrack";
import { updateChatTrack } from "@/actions/communication/internal/updateChatTrack";
import Avatar from "@/components/Avatar";
import { cn } from "@/lib/cn";
import { pusher } from "@/lib/pusher/client";
import { useChatTrackStore } from "@/stores/chatTrackStore";
import { ChatTrack, Message, User } from "@prisma/client";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

type TProps = {
  user: any;
  isSelectedUser: boolean;
  traceLastMessage?: (ChatTrack & { message?: Message | null }) | null;
  setUsersList: React.Dispatch<React.SetStateAction<User[]>>;
  groupListLength: number;
};

type TPusherMessage = ChatTrack & { message: Message | null };

export default function UserSelectButton({
  user,
  isSelectedUser,
  traceLastMessage,
  setUsersList,
  groupListLength,
}: TProps) {
  const { data: session } = useSession();
  const {
    lastMessage,
    setLastMessage,
    setUnreadMessageCount,
    unreadMessageCount,
  } = useChatTrackStore();
  const [lastMessageHistory, setLastMessageHistory] =
    useState(traceLastMessage);

  useEffect(() => {
    if (lastMessage) {
      setLastMessageHistory((prevHistory) => {
        if (prevHistory?.id === lastMessage.id) {
          return lastMessage;
        }
        return prevHistory;
      });
    }
  }, [lastMessage]);

  // initial check to db is chat tracker are exist or not and if hasn't then create or get new chat tracker
  useEffect(() => {
    const createChatTrack = async () => {
      try {
        if (!traceLastMessage) {
          await createUserChatTrack({
            senderId: parseInt(session?.user?.id!),
            receiverId: user.id,
          });
        }
      } catch (err) {
        console.log(err);
      }
    };
    createChatTrack();
  }, []);

  const participants =
    lastMessageHistory?.message?.to === user.id ? "sender" : "receiver";

  useEffect(() => {
    pusher
      .subscribe(`track-${user?.id}`)
      .bind("chat-track", (data: TPusherMessage) => {
        if (
          data.message?.to === parseInt(session?.user?.id!) ||
          (data.message?.from === parseInt(session?.user?.id!) &&
            !data.message?.groupId)
        ) {
          setLastMessageHistory(data);
          setLastMessage(data);
          setUnreadMessageCount({
            ...unreadMessageCount,
            internalCount: unreadMessageCount.internalCount + 1,
          });
        }
      });
    return () => {
      pusher.unbind("chat-track").unsubscribe(`track-${user?.id}`);
    };
  }, [user]);

  // handle selected user
  const handleSelectedUser = async (
    user: User,
    participants: "sender" | "receiver",
    lastMessageInfo?: (ChatTrack & { message?: Message | null }) | null,
  ) => {
    try {
      const updatedLastMessage =
        lastMessageInfo &&
        participants === "receiver" &&
        (await updateChatTrack(lastMessageInfo.id));
      if (updatedLastMessage && updatedLastMessage?.type === "success") {
        setLastMessageHistory(updatedLastMessage?.data);
      }
      setUsersList((usersList) => {
        if (usersList.length + groupListLength >= 4) return usersList;
        if (usersList.find((u) => u.id === user.id)) {
          return usersList;
        }
        return [...usersList, user];
      });
      setUnreadMessageCount({
        ...unreadMessageCount,
        internalCount: unreadMessageCount.internalCount - 1,
      });
    } catch (err) {
      console.log(err);
    }
  };
  return (
    <button
      className={cn(
        `relative flex items-center gap-2 rounded-md border border-[#006D77] bg-[#F2F2F2] p-2 hover:bg-gray-500 sm:border-0`,
        isSelectedUser && "bg-[#006D77]",
      )}
      onClick={() => handleSelectedUser(user, participants, lastMessageHistory)}
    >
      {lastMessageHistory?.messageId &&
        !lastMessageHistory?.isRead &&
        participants === "receiver" && (
          <div className="absolute right-[11px] top-[11px] z-10">
            <div className="flex h-5 w-5 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {/* {chatHistory.emailIsUnReadCount + chatHistory.smsUnReadCount} */}
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
      <div className="flex w-full flex-col justify-start hover:text-white">
        <p
          className={cn(
            "text-start text-[14px] font-bold hover:text-[#F2F2F2]",
            isSelectedUser ? "text-[#F2F2F2]" : "text-black",
          )}
        >
          {user.firstName} {user.lastName}
        </p>
        {lastMessageHistory?.lastMessage && (
          <p
            className={cn(
              "line-clamp-2 text-start text-[10px] text-gray-400",
              // lastMessageHistory?.isRead ||
              //   isSelectedUser ||
              //   participants === "sender"
              //   ? "font-normal"
              //   : "text-lg font-extrabold text-gray-300",
              !isSelectedUser && "text-gray-800 hover:text-[#F2F2F2]",
            )}
          >
            {participants === "sender" ? "You" : user.firstName}:{" "}
            {lastMessageHistory?.lastMessage}
          </p>
        )}
      </div>
    </button>
  );
}
