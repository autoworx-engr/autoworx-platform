import Avatar from "@/components/Avatar";
import { cn } from "@/lib/cn";
import { useChatTrackStore } from "@/stores/chatTrackStore";
import { ChatTrack, Group, Message, User } from "@prisma/client";
import { Search } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import InfiniteScroll from "react-infinite-scroll-component";
import CreateGroupModal from "./CreateGroupModal";
import UserSelectButton from "./UserSelectButton";
import { useInfiniteGroupsList } from "./_hooks/useInfiniteGroupsList";
import { useInfiniteUsersList } from "./_hooks/useInfiniteUsersList";
import { useInternalSidebarPusher } from "./_hooks/useInternalSidebarPusher";
import { useSortedChatList } from "./_hooks/useSortedChatList";

type TUser = User & { unreadCount: number; latestMessage?: Message | null };
type TGroup = Group & { users: User[] };

type TListProps = {
  users: TUser[];
  setUsersList: React.Dispatch<React.SetStateAction<TUser[]>>;
  setGroupsList: React.Dispatch<React.SetStateAction<TGroup[]>>;
  groups: TGroup[];
  className?: string;
  groupsList: TGroup[];
  usersList: TUser[];
  userChatTrack: (ChatTrack & { message?: Message | null })[];
  messages?: Message[];
  addChatItem?: (item: TUser | TGroup, type: "user" | "group") => void;
};

export default function List({
  users,
  setUsersList,
  groups,
  setGroupsList,
  groupsList,
  usersList,
  className,
  userChatTrack,
  messages = [],
  addChatItem,
}: TListProps) {
  const { data: session } = useSession();
  const companyId = session?.user?.companyId ?? 0;
  const sessionUserId = session?.user?.id ? parseInt(session.user.id) : null;

  const [tab, setTab] = useState<"users" | "groups">("users");
  const [searchTerm, setSearchTerm] = useState("");
  // Both lists start empty; the infinite-query hooks below populate them on
  // mount, and Pusher updates keep them in sync.
  const [sideBarGroupsLists, setSideBarGroupLists] = useState<TGroup[]>([]);
  const [userState, setUserState] = useState<TUser[]>([]);
  const [chatTrackState, setChatTrackState] =
    useState<(ChatTrack & { message?: Message | null })[]>(userChatTrack);
  const [messagesState, setMessagesState] = useState<Message[]>(messages);

  const { lastMessage } = useChatTrackStore();
  const { sortLists, buildCombinedSortedList } = useSortedChatList(
    messagesState,
    lastMessage,
    sessionUserId,
  );

  // Paginated users — only active when the Users tab is selected; the
  // hook still mounts but `enabled: false` skips network until the user
  // switches tabs. (Switching tabs flips both `enabled` flags atomically.)
  const usersTabActive = tab === "users";
  const groupsTabActive = tab === "groups";

  const {
    data: usersInfinite,
    fetchNextPage: fetchNextUsersPage,
    hasNextPage: hasNextUsersPage,
    isFetchingNextPage: isFetchingNextUsersPage,
  } = useInfiniteUsersList({
    companyId,
    search: usersTabActive ? searchTerm : "",
  });

  const {
    data: groupsInfinite,
    fetchNextPage: fetchNextGroupsPage,
    hasNextPage: hasNextGroupsPage,
    isFetchingNextPage: isFetchingNextGroupsPage,
  } = useInfiniteGroupsList({
    companyId,
    search: groupsTabActive ? searchTerm : "",
  });

  const paginatedUsers = useMemo(() => {
    const pages = usersInfinite?.pages ?? [];
    return pages.flatMap((p) => p.data) as TUser[];
  }, [usersInfinite]);

  const paginatedGroups = useMemo(() => {
    const pages = groupsInfinite?.pages ?? [];
    return pages.flatMap((p) => p.data) as TGroup[];
  }, [groupsInfinite]);

  useEffect(() => {
    if (paginatedUsers.length === 0 && !usersInfinite) return;
    setUserState(paginatedUsers);
  }, [paginatedUsers, usersInfinite]);

  useEffect(() => {
    if (paginatedGroups.length === 0 && !groupsInfinite) return;
    setSideBarGroupLists(paginatedGroups);
  }, [paginatedGroups, groupsInfinite]);

  // Re-sort current state when the inputs to the sort function change
  // (messages stream, lastMessage from store, chatTrack updates). The two
  // paginated queries above are the *seed* — this effect just keeps the order
  // fresh as new realtime data lands.
  useEffect(() => {
    if (userState.length === 0 && sideBarGroupsLists.length === 0) return;
    const { sortedUsers, sortedGroups } = sortLists(
      userState,
      sideBarGroupsLists,
    );
    setUserState(sortedUsers);
    setSideBarGroupLists(sortedGroups);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messagesState, lastMessage, chatTrackState, sortLists]);

  useInternalSidebarPusher({
    sessionUserId,
    userState,
    setUserState,
    setSideBarGroupLists,
    setGroupsList,
    setMessagesState,
    setChatTrackState,
    sortLists,
  });

  const updateUserState = (userId: number, updates: Partial<TUser>) => {
    setUserState((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, ...updates } : u)),
    );
  };

  // Tab decides whether the sidebar is showing users or groups. Both lists are
  // server-paginated through their own infinite query, so the search term
  // participates in the query key for each — no client-side filtering needed.
  const combined = buildCombinedSortedList(userState, sideBarGroupsLists);
  const visible = combined.filter(
    (item) => item.type === (usersTabActive ? "user" : "group"),
  );

  const activeFetchNextPage = usersTabActive
    ? fetchNextUsersPage
    : fetchNextGroupsPage;
  const activeHasNextPage = usersTabActive
    ? hasNextUsersPage
    : hasNextGroupsPage;
  const activeIsFetchingNextPage = usersTabActive
    ? isFetchingNextUsersPage
    : isFetchingNextGroupsPage;

  return (
    <div
      className={cn(
        "app-shadow max-h-[92vh] w-full rounded-lg bg-background p-3 sm:block sm:w-[25%]",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-[#795252] sm:text-[14px] sm:font-normal">
          {tab === "users" ? "User List" : "Group List"}
        </h2>
        <CreateGroupModal
          users={users}
          existingGroups={sideBarGroupsLists}
          setSideBarGroupLists={setSideBarGroupLists}
          addChatItem={addChatItem}
        />
      </div>

      <div className="mt-3 grid grid-cols-2 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
        <TabButton
          active={tab === "users"}
          onClick={() => {
            setTab("users");
            setSearchTerm("");
          }}
        >
          Users
        </TabButton>
        <TabButton
          active={tab === "groups"}
          onClick={() => {
            setTab("groups");
            setSearchTerm("");
          }}
        >
          Groups
        </TabButton>
      </div>

      <div className="relative mt-3">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
          size={18}
        />
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          type="text"
          placeholder={
            tab === "users"
              ? "Search by name, email or phone"
              : "Search groups by name"
          }
          className={cn(
            "w-full rounded-md border bg-white pl-9 pr-9 py-2 text-sm text-zinc-700 placeholder-zinc-400 outline-none",
            "border-zinc-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20",
            "dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200",
          )}
        />
      </div>

      <div
        id="internalSidebarScroll"
        className="thin-scrollbar mt-2 flex h-[88%] flex-col gap-2 overflow-y-auto max-[2127px]:h-[87%]"
      >
        <InfiniteScroll
          // dataLength + key drive the InfiniteScroll behavior. Including
          // `tab` in the key forces a fresh scroll context when the user
          // switches tabs — otherwise dataLength would change without the
          // scroll position resetting, and the next-page trigger could fire
          // prematurely against the wrong dataset.
          key={tab}
          dataLength={visible.length}
          next={() => {
            void activeFetchNextPage();
          }}
          hasMore={!!activeHasNextPage}
          loader={
            activeIsFetchingNextPage ? (
              <div className="py-2 text-center text-xs text-zinc-500">
                Loading more…
              </div>
            ) : null
          }
          scrollableTarget="internalSidebarScroll"
          style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
        >
          {visible.length === 0 && (
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
                    } else {
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
                    }
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
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-md py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-white text-teal-700 shadow-sm dark:bg-zinc-900 dark:text-teal-300"
          : "text-zinc-600 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200",
      )}
    >
      {children}
    </button>
  );
}

function GroupListItem({
  group,
  isSelectedGroup,
  onClick,
}: {
  group: TGroup;
  isSelectedGroup: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        `group relative flex items-center w-full gap-2 rounded-2xl p-3 sm:p-4`,
        "border border-transparent shadow-sm transition-all duration-200",
        "hover:shadow-md active:scale-[0.99]",
        isSelectedGroup
          ? "bg-gradient-to-r from-teal-700 to-teal-600 ring-1 ring-teal-500/60"
          : "bg-white dark:bg-zinc-900/60 border-zinc-200/70 dark:border-white/10 hover:border-zinc-300/80 dark:hover:border-white/20",
      )}
      onClick={onClick}
    >
      <div
        className={cn(
          "grid items-center",
          group.users.length === 1 ? "grid-cols-1" : "grid-cols-2",
        )}
      >
        {group.users.length > 0 &&
          group.users
            .slice(0, 4)
            .map((user) => (
              <Avatar
                photo={user?.image}
                width={40}
                height={40}
                key={user?.id}
              />
            ))}
      </div>
      <div className="flex flex-col">
        <p
          className={cn(
            "text-[14px] font-bold text-[#797979]",
            isSelectedGroup && "text-white hover:text-[#797979]",
          )}
        >
          {group?.name}
        </p>
      </div>
    </button>
  );
}
