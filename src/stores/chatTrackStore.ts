import { ChatTrack, Message } from "@prisma/client";
import { create } from "zustand";

interface ChatTrackStore {
  lastMessage: (ChatTrack & { message?: Message | null }) | null;
  unreadMessageCount: {
    collaborationCount: number;
    internalCount: number;
  };
  setUnreadMessageCount: (unreadMessageCount: {
    collaborationCount: number;
    internalCount: number;
  }) => void;
  setLastMessage: (
    chatTrackInfo: ChatTrack & { message?: Message | null },
  ) => void;
}

export const useChatTrackStore = create<ChatTrackStore>((set) => ({
  lastMessage: null,
  unreadMessageCount: {
    collaborationCount: 0,
    internalCount: 0,
  },
  setLastMessage: (chatTrackInfo) => set({ lastMessage: chatTrackInfo }),
  setUnreadMessageCount: (unreadMessageCount) =>
    set({ unreadMessageCount: unreadMessageCount }),
}));
