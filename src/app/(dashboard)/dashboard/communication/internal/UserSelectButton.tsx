import { createUserChatTrack } from "@/actions/communication/internal/createUserChatTrack";
import { updateChatTrack } from "@/actions/communication/internal/updateChatTrack";
import Avatar from "@/components/Avatar";
import { cn } from "@/lib/cn";
import { pusher } from "@/lib/pusher/client";
import { useChatTrackStore } from "@/stores/chatTrackStore";
import { ChatTrack, Message, User } from "@prisma/client";
import { useSession } from "next-auth/react";
import { useEffect, useState, useMemo } from "react";

type TProps = {
  user: User & { unreadCount: number; latestMessage?: Message | null };
  isSelectedUser: boolean;
  traceLastMessage?: (ChatTrack & { message?: Message | null }) | null;
  setUsersList: React.Dispatch<
    React.SetStateAction<(User & { unreadCount: number; latestMessage?: Message | null })[]>
  >;
  groupListLength: number;
  updateUserState?: (userId: number, updates: Partial<User & { unreadCount: number; latestMessage?: Message | null }>) => void;
  addChatItem?: (item: any, type: 'user' | 'group') => void;
};

type TPusherMessage = ChatTrack & { message: Message | null };

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
  const {
    setLastMessage,
    setUnreadMessageCount,
    unreadMessageCount,
  } = useChatTrackStore();
  const [lastMessageHistory, setLastMessageHistory] =
    useState(traceLastMessage);

  // Update lastMessageHistory when traceLastMessage prop changes (on initial load or refresh)
  useEffect(() => {
    if (traceLastMessage) {
      setLastMessageHistory(traceLastMessage);
    }
  }, [traceLastMessage]);

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

  // Calculate participants dynamically based on the latest message
  const participants = useMemo(() => {
    // Check ChatTrack message first, then fallback to user's latestMessage
    const messageToCheck = lastMessageHistory?.message || user.latestMessage;
    if (!messageToCheck) return "receiver"; // Default to receiver if no message
    
    return messageToCheck.from === parseInt(session?.user?.id!) ? "sender" : "receiver";
  }, [lastMessageHistory?.message, user.latestMessage, session?.user?.id]);

  useEffect(() => {
    // Subscribe to both channels but add deduplication logic
    const currentUserChannel = pusher.subscribe(`track-${session?.user?.id}`);
    const otherUserChannel = pusher.subscribe(`track-${user?.id}`);
    
    // Track processed messages to avoid duplicates
    const processedMessages = new Set<string>();
    
    const handleChatTrack = (data: TPusherMessage) => {
      // Create a unique key for this message to prevent duplicate processing
      const messageKey = `${data.message?.id || data.id}-${data.message?.from}-${data.message?.to}-${data.message?.createdAt}`;
      
      // If we've already processed this message, skip it
      if (processedMessages.has(messageKey)) {
        return;
      }
      
      // Check if this message is part of the conversation between current user and this specific user
      const isMessageForThisConversation = 
        (data.message?.to === parseInt(session?.user?.id!) && data.message?.from === user.id) ||
        (data.message?.from === parseInt(session?.user?.id!) && data.message?.to === user.id);
      
      if (isMessageForThisConversation && !data.message?.groupId) {
        // Mark this message as processed
        processedMessages.add(messageKey);
        
        // Clean up old message keys to prevent memory leaks (keep only last 100)
        if (processedMessages.size > 100) {
          const keys = Array.from(processedMessages);
          keys.slice(0, 50).forEach(key => processedMessages.delete(key));
        }
        
        // Ensure the ChatTrack object has the latest message text
        const updatedChatTrack = {
          ...data,
          lastMessage: data.message?.message || data.lastMessage,
        };
        
        // Always update the local message history for this specific conversation
        setLastMessageHistory(updatedChatTrack);
        
        // Update the global store for other components that might need it
        setLastMessage(updatedChatTrack);
        
        // Only increment unread count if current user is receiving the message
        if (data.message?.to === parseInt(session?.user?.id!)) {
          // Get the current unread count to avoid stale closure
          const currentUnreadCount = useChatTrackStore.getState().unreadMessageCount;
          setUnreadMessageCount({
            ...currentUnreadCount,
            internalCount: currentUnreadCount.internalCount + 1,
          });
          
          // Set the user's unread count to 1 (simple indicator)
          setUsersList((prevUsersList) => {
            return prevUsersList.map((u) => {
              if (u.id === user.id) {
                return { ...u, unreadCount: 1 };
              }
              return u;
            });
          });
          
          // Also update the main user state in the List component
          if (updateUserState) {
            updateUserState(user.id, { unreadCount: 1 });
          }
        }
      }
    };
    
    const handleChatTrackRead = (data: { senderId: number; userId: number; section: string }) => {
      // If this user's messages were marked as read, update the state
      if (data.senderId === user.id && data.userId === parseInt(session?.user?.id!)) {
        setLastMessageHistory(prev => prev ? { ...prev, isRead: true } : prev);
      }
    };
    
    // Listen for events on both channels
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
  }, [user.id, session?.user?.id, setLastMessage, setUnreadMessageCount]);

  // handle selected user
  const handleSelectedUser = async (
    user: User & { unreadCount: number; latestMessage?: Message | null },
    participants: "sender" | "receiver",
    lastMessageInfo?: (ChatTrack & { message?: Message | null }) | null
  ) => {
    try {
      const updatedLastMessage =
        lastMessageInfo &&
        participants === "receiver" &&
        (await updateChatTrack(lastMessageInfo.id));
      
      if (updatedLastMessage && updatedLastMessage?.type === "success") {
        setLastMessageHistory(updatedLastMessage?.data);
      }
      
      // Update the user's unread count immediately in the UI
      if (addChatItem) {
        // Use the new coordinated approach
        const updatedUser = { ...user, unreadCount: 0 };
        addChatItem(updatedUser, 'user');
        
        // Also update the main user state
        if (updateUserState) {
          updateUserState(user.id, { unreadCount: 0 });
        }
      } else {
        // Fallback to old approach
        setUsersList((usersList) => {
          const existingUserIndex = usersList.findIndex((u) => u.id === user.id);
          
          if (existingUserIndex !== -1) {
            const updatedUsersList = [...usersList];
            updatedUsersList[existingUserIndex] = { ...updatedUsersList[existingUserIndex], unreadCount: 0 };
            
            if (updateUserState) {
              updateUserState(user.id, { unreadCount: 0 });
            }
            
            return updatedUsersList;
          } else {
            const updatedUser = { ...user, unreadCount: 0 };
            
            if (updateUserState) {
              updateUserState(user.id, { unreadCount: 0 });
            }
            
            const totalChatBoxes = usersList.length + groupListLength;
            
            if (totalChatBoxes >= 4) {
              const newUsersList = [...usersList];
              if (newUsersList.length >= 1) {
                newUsersList[newUsersList.length - 1] = updatedUser;
                return newUsersList;
              } else {
                return [updatedUser];
              }
            } else {
              return [...usersList, updatedUser];
            }
          }
        });
      }
      
      // Only decrement unread count if there was actually an unread message
      if (lastMessageInfo && !lastMessageInfo.isRead && participants === "receiver") {
        const currentUnreadCount = useChatTrackStore.getState().unreadMessageCount;
        setUnreadMessageCount({
          ...currentUnreadCount,
          internalCount: Math.max(0, currentUnreadCount.internalCount - 1),
        });
      }
    } catch (err) {
      console.log(err);
    }
  };
  return (
    <button
      className={cn(
        `relative flex items-center gap-2 rounded-md border border-[#006D77] bg-[#F2F2F2] p-2 hover:bg-gray-500 sm:border-0`,
        isSelectedUser && "bg-[#006D77]"
      )}
      onClick={() => handleSelectedUser(user, participants, lastMessageHistory)}
    >
      {/* Unread message indicator - improved design similar to client communication */}
      {(() => {
        // Only show unread indicator if:
        // 1. There's an actual message history (conversation exists)
        // 2. The message is unread
        // 3. Current user is the receiver of the message
        const hasMessageHistory = lastMessageHistory?.messageId && lastMessageHistory?.lastMessage;
        const isUnreadReceiver = hasMessageHistory && 
                                !lastMessageHistory?.isRead && 
                                participants === "receiver";
        
        const shouldShowUnread = isUnreadReceiver;
        
        return shouldShowUnread ? (
          <div className="absolute right-[11px] top-[11px] z-10">
            <div className="flex h-5 w-5 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  1
              </span>
            </div>
          </div>
        ) : null;
      })()}
      <Avatar
        className="flex-shrink-0"
        photo={user.image}
        width={60}
        height={60}
      />
      <div className="flex w-full flex-col justify-start hover:text-white">
        <p
          className={cn(
            "text-start text-[14px] hover:text-[#F2F2F2]",
            // Make unread messages more prominent
            isSelectedUser
              ? "text-[#F2F2F2] font-bold"
              : lastMessageHistory?.isRead || participants === "sender"
                ? "text-black font-bold"
                : "text-black font-extrabold" // Extra bold for unread messages
          )}
        >
          {user.firstName} {user.lastName}
        </p>
        {(lastMessageHistory?.lastMessage || user.latestMessage) && (
          <p
            className={cn(
              "line-clamp-2 text-start text-[10px]",
              // Make unread messages more prominent
              lastMessageHistory?.isRead ||
                isSelectedUser ||
                participants === "sender"
                ? "font-normal text-gray-400"
                : "font-semibold text-gray-700",
              !isSelectedUser && "hover:text-[#F2F2F2]"
            )}
          >
            {(() => {
              const displayText = participants === "sender" ? "You" : user.firstName;
              // Prefer chatTrack lastMessage, fallback to user.latestMessage
              const messageText = lastMessageHistory?.lastMessage || user.latestMessage?.message;
              
              return messageText ? `${displayText}: ${messageText}` : "";
            })()}
          </p>
        )}
      </div>
    </button>
  );
}
