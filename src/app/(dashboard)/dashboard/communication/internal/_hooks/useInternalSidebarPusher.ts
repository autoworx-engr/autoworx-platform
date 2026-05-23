import type { ChatTrack, Group, Message, User } from "@prisma/client";
import { useChatTrackPusher } from "./useChatTrackPusher";
import { useGroupLifecyclePusher } from "./useGroupLifecyclePusher";

type TUser = User & { unreadCount: number; latestMessage?: Message | null };
type TGroup = Group & { users: User[] };

type PusherSidebarArgs = {
  sessionUserId: number | null;
  userState: TUser[];
  setUserState: React.Dispatch<React.SetStateAction<TUser[]>>;
  setSideBarGroupLists: React.Dispatch<React.SetStateAction<TGroup[]>>;
  setGroupsList: React.Dispatch<React.SetStateAction<TGroup[]>>;
  setMessagesState: React.Dispatch<React.SetStateAction<Message[]>>;
  setChatTrackState: React.Dispatch<
    React.SetStateAction<(ChatTrack & { message?: Message | null })[]>
  >;
  sortLists: (
    users: TUser[],
    groups: TGroup[],
  ) => { sortedUsers: TUser[]; sortedGroups: TGroup[] };
};

/**
 * Composes the two Pusher subscription hooks the internal sidebar needs:
 *   - {@link useChatTrackPusher}      → personal chat-track + read events
 *   - {@link useGroupLifecyclePusher} → create / delete / add-member events
 */
export function useInternalSidebarPusher({
  sessionUserId,
  userState,
  setUserState,
  setSideBarGroupLists,
  setGroupsList,
  setMessagesState,
  setChatTrackState,
  sortLists,
}: PusherSidebarArgs) {
  useChatTrackPusher({
    sessionUserId,
    userState,
    setUserState,
    setSideBarGroupLists,
    setMessagesState,
    setChatTrackState,
    sortLists,
  });

  useGroupLifecyclePusher({
    sessionUserId,
    userState,
    setSideBarGroupLists,
    setGroupsList,
    sortLists,
  });
}
