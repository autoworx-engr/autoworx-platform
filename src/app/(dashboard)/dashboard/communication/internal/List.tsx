import { cn } from "@/lib/cn";
import { useChatTrackStore } from "@/stores/chatTrackStore";
import { ChatTrack, Group, Message, User } from "@prisma/client";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import CreateGroupModal from "./CreateGroupModal";
import { SidebarChatList } from "./_components/SidebarChatList";
import { SidebarSearch } from "./_components/SidebarSearch";
import { TabButton } from "./_components/TabButton";
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
    isLoading: isLoadingUsers,
  } = useInfiniteUsersList({
    companyId,
    search: usersTabActive ? searchTerm : "",
  });

  const {
    data: groupsInfinite,
    fetchNextPage: fetchNextGroupsPage,
    hasNextPage: hasNextGroupsPage,
    isFetchingNextPage: isFetchingNextGroupsPage,
    isLoading: isLoadingGroups,
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
  const activeIsLoading = usersTabActive ? isLoadingUsers : isLoadingGroups;

  return (
    <div
      className={cn(
        "app-shadow flex h-[calc(100vh-7rem)] w-full flex-col rounded-lg bg-background p-3 sm:w-80 sm:shrink-0",
        className,
      )}
    >
      <div className="flex items-center justify-between w-full">
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

      <SidebarSearch
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder={
          tab === "users"
            ? "Search by Name, Email or Phone"
            : "Search Groups by Name"
        }
      />

      <SidebarChatList
        tab={tab}
        visible={visible}
        groupsList={groupsList}
        usersList={usersList}
        chatTrackState={chatTrackState}
        setUsersList={setUsersList}
        setGroupsList={setGroupsList}
        updateUserState={updateUserState}
        addChatItem={addChatItem}
        hasNextPage={!!activeHasNextPage}
        isFetchingNextPage={activeIsFetchingNextPage}
        isLoading={activeIsLoading}
        fetchNextPage={() => {
          void activeFetchNextPage();
        }}
      />
    </div>
  );
}
