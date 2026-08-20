import { ChatTrack, Group, Message, User } from "@prisma/client";
import InfiniteScroll from "react-infinite-scroll-component";
import UserSelectButton from "../UserSelectButton";
import type { CombinedItem } from "../_hooks/useSortedChatList";
import { GroupListItem } from "./GroupListItem";
import { SidebarListSkeleton } from "./SidebarListSkeleton";

type TUser = User & { unreadCount: number; latestMessage?: Message | null };
type TGroup = Group & { users: User[] };

type Props = {
  tab: "users" | "groups";
  visible: CombinedItem[];
  groupsList: TGroup[];
  usersList: TUser[];
  chatTrackState: (ChatTrack & { message?: Message | null })[];
  setUsersList: React.Dispatch<React.SetStateAction<TUser[]>>;
  setGroupsList: React.Dispatch<React.SetStateAction<TGroup[]>>;
  updateUserState: (userId: number, updates: Partial<TUser>) => void;
  addChatItem?: (item: TUser | TGroup, type: "user" | "group") => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isLoading: boolean;
  fetchNextPage: () => void;
};

export function SidebarChatList({
  tab,
  visible,
  groupsList,
  usersList,
  chatTrackState,
  setUsersList,
  setGroupsList,
  updateUserState,
  addChatItem,
  hasNextPage,
  isFetchingNextPage,
  isLoading,
  fetchNextPage,
}: Props) {
  return (
    <div
      id="internalSidebarScroll"
      className="h-[calc(80vh-7rem)] mt-2 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto"
    >
      <InfiniteScroll
        key={tab}
        dataLength={visible.length}
        next={fetchNextPage}
        hasMore={hasNextPage}
        loader={
          isFetchingNextPage ? (
            <div className="py-2 text-center text-xs text-zinc-500">
              Loading more…
            </div>
          ) : null
        }
        scrollableTarget="internalSidebarScroll"
        style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
      >
        {isLoading && visible.length === 0 && <SidebarListSkeleton />}
        {!isLoading && visible.length === 0 && (
          <p className="py-4 text-center text-xs text-zinc-500">
            {tab === "users" ? "No users found" : "No groups found"}
          </p>
        )}
        {visible.map((item) => {
          if (item.type === "group") {
            return (
              <GroupListItem
                key={`group-${item.data.id}`}
                group={item.data}
                isSelectedGroup={
                  !!groupsList.find((g) => g.id === item.data.id)
                }
                onClick={() => {
                  if (addChatItem) {
                    addChatItem(item.data, "group");
                    return;
                  }
                  setGroupsList((groupList) => {
                    if (groupList.find((g) => g?.id === item.data.id)) {
                      return groupList;
                    }
                    const total = groupList.length + usersList.length;
                    if (total >= 4 && groupList.length >= 1) {
                      const next = [...groupList];
                      next[next.length - 1] = item.data;
                      return next;
                    }
                    return [...groupList, item.data];
                  });
                }}
              />
            );
          }

          const user = item.data;
          const userChatTracks = chatTrackState.filter(
            (c) => c.receiverId === user.id || c.senderId === user.id,
          );
          const traceLastMessage =
            userChatTracks.length > 0
              ? userChatTracks.reduce((latest, current) =>
                  new Date(current.updatedAt) > new Date(latest.updatedAt)
                    ? current
                    : latest,
                )
              : undefined;

          return (
            <UserSelectButton
              key={`user-${user.id}`}
              groupListLength={groupsList?.length}
              isSelectedUser={!!usersList.find((u) => u.id === user.id)}
              traceLastMessage={traceLastMessage}
              user={user}
              setUsersList={setUsersList}
              updateUserState={updateUserState}
              addChatItem={addChatItem}
            />
          );
        })}
      </InfiniteScroll>
    </div>
  );
}
