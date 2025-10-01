import { ChatTrack, Group, Message, User } from "@prisma/client";
import CreateGroupModal from "./CreateGroupModal";
import Avatar from "@/components/Avatar";
import { cn } from "@/lib/cn";
import { useEffect, useState, useCallback } from "react";
import { pusher } from "@/lib/pusher/client";
import { useSession } from "next-auth/react";
import { getGroupById } from "@/actions/communication/internal/query";
import UserSelectButton from "./UserSelectButton";
import { useChatTrackStore } from "@/stores/chatTrackStore";
import { fetchUsersWithLatestMessages } from "@/actions/communication/internal/fetchUsersWithLatestMessages";

type TListProps = {
  users: (User & { unreadCount: number; latestMessage?: Message | null })[];
  setUsersList: React.Dispatch<
    React.SetStateAction<
      (User & { unreadCount: number; latestMessage?: Message | null })[]
    >
  >;
  setGroupsList: React.Dispatch<
    React.SetStateAction<(Group & { users: User[] })[] | []>
  >;
  groups: (Group & { users: User[] })[] | [];
  className?: string;
  groupsList: (Group & { users: User[] })[];
  usersList: (User & { unreadCount: number; latestMessage?: Message | null })[];
  userChatTrack: (ChatTrack & { message?: Message | null })[];
  messages?: Message[]; // Add messages array
  addChatItem?: (item: any, type: "user" | "group") => void; // Add helper function
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
  messages = [], // Default to empty array
  addChatItem,
}: TListProps) {
  const { data: session } = useSession();
  const [searchTerm, setSearchTerm] = useState("");
  const [sideBarGroupsLists, setSideBarGroupLists] = useState(groups);
  const [userState, setUserState] =
    useState<
      (User & { unreadCount: number; latestMessage?: Message | null })[]
    >(users);
  const [chatTrackState, setChatTrackState] =
    useState<(ChatTrack & { message?: Message | null })[]>(userChatTrack);
  const [messagesState, setMessagesState] = useState<Message[]>(messages);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { lastMessage } = useChatTrackStore();

  // Combined sorting function for both users and groups based on latest messages
  const sortUsersAndGroupsByLatestMessage = useCallback(
    (
      usersToSort: (User & {
        unreadCount: number;
        latestMessage?: Message | null;
      })[],
      groupsToSort: (Group & { users: User[] })[]
    ) => {
      // Create a combined array with type indicators
      const combinedItems = [
        ...usersToSort.map((user) => ({
          type: "user" as const,
          data: user,
          latestMessage: (() => {
            const userMessages = messagesState.filter(
              (message) =>
                (message.from === user.id &&
                  message.to === parseInt(session?.user?.id!)) ||
                (message.from === parseInt(session?.user?.id!) &&
                  message.to === user.id)
            );
            return userMessages.length > 0
              ? userMessages[0]
              : user.latestMessage;
          })(),
        })),
        ...groupsToSort.map((group) => ({
          type: "group" as const,
          data: group,
          latestMessage: (() => {
            const groupMessages = messagesState.filter(
              (message) => message.groupId === group.id
            );
            return groupMessages.length > 0 ? groupMessages[0] : null;
          })(),
        })),
      ];

      // Sort the combined array by latest message timestamp
      const sorted = combinedItems.sort((a, b) => {
        let aTimestamp = a.latestMessage
          ? new Date(a.latestMessage.updatedAt).getTime()
          : 0;
        let bTimestamp = b.latestMessage
          ? new Date(b.latestMessage.updatedAt).getTime()
          : 0;

        // Check if lastMessage from store affects these items and use it if it's more recent
        if (lastMessage && lastMessage.message) {
          const lastMessageTimestamp = new Date(
            lastMessage.message.updatedAt
          ).getTime();

          if (a.type === "user") {
            if (
              (lastMessage.message.from === a.data.id &&
                lastMessage.message.to === parseInt(session?.user?.id!)) ||
              (lastMessage.message.from === parseInt(session?.user?.id!) &&
                lastMessage.message.to === a.data.id)
            ) {
              aTimestamp = Math.max(aTimestamp, lastMessageTimestamp);
            }
          } else if (
            a.type === "group" &&
            lastMessage.message.groupId === a.data.id
          ) {
            aTimestamp = Math.max(aTimestamp, lastMessageTimestamp);
          }

          if (b.type === "user") {
            if (
              (lastMessage.message.from === b.data.id &&
                lastMessage.message.to === parseInt(session?.user?.id!)) ||
              (lastMessage.message.from === parseInt(session?.user?.id!) &&
                lastMessage.message.to === b.data.id)
            ) {
              bTimestamp = Math.max(bTimestamp, lastMessageTimestamp);
            }
          } else if (
            b.type === "group" &&
            lastMessage.message.groupId === b.data.id
          ) {
            bTimestamp = Math.max(bTimestamp, lastMessageTimestamp);
          }
        }

        // Sort in descending order (most recent first)
        // Items with messages should always come before items without messages
        if (aTimestamp === 0 && bTimestamp === 0) return 0; // Both have no messages
        if (aTimestamp === 0) return 1; // A has no messages, B should come first
        if (bTimestamp === 0) return -1; // B has no messages, A should come first

        return bTimestamp - aTimestamp;
      });

      // Separate back to users and groups
      const sortedUsers = sorted
        .filter((item) => item.type === "user")
        .map((item) => item.data) as (User & {
        unreadCount: number;
        latestMessage?: Message | null;
      })[];
      const sortedGroups = sorted
        .filter((item) => item.type === "group")
        .map((item) => item.data) as (Group & { users: User[] })[];

      return { sortedUsers, sortedGroups };
    },
    [messagesState, lastMessage, session?.user?.id]
  );

  // Update states when props change and sort immediately
  useEffect(() => {
    // Sort users and groups together
    const { sortedUsers, sortedGroups } = sortUsersAndGroupsByLatestMessage(
      users,
      groups
    );
    setUserState(sortedUsers);
    setSideBarGroupLists(sortedGroups);
    setChatTrackState(userChatTrack);
    setMessagesState(messages);
  }, [
    users,
    userChatTrack,
    messages,
    groups,
    sortUsersAndGroupsByLatestMessage,
  ]);

  // Sort users whenever messagesState changes or when a new message arrives
  useEffect(() => {
    if (userState.length > 0 || sideBarGroupsLists.length > 0) {
      const { sortedUsers, sortedGroups } = sortUsersAndGroupsByLatestMessage(
        userState,
        sideBarGroupsLists
      );
      setUserState(sortedUsers);
      setSideBarGroupLists(sortedGroups);
    }
  }, [messagesState, lastMessage, sortUsersAndGroupsByLatestMessage]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch latest data when component mounts (for navigating from other pages)
  useEffect(() => {
    const refreshData = async () => {
      setIsRefreshing(true);
      try {
        const result = await fetchUsersWithLatestMessages();
        if (result.success && result.data) {
          setUserState(result.data.users);
          setMessagesState(result.data.messages);
          // We can still use existing chat track data for other purposes
        }
      } catch (error) {
        console.error("Failed to refresh user data:", error);
      } finally {
        setIsRefreshing(false);
      }
    };

    // Only refresh if we have a session
    if (session?.user?.id) {
      refreshData();
    }
  }, [session?.user?.id]); // Only run when session changes or component mounts

  // Fetch latest data when component mounts (for navigating from other pages)
  useEffect(() => {
    const refreshData = async () => {
      setIsRefreshing(true);
      try {
        const result = await fetchUsersWithLatestMessages();
        if (result.success && result.data) {
          setUserState(result.data.users);
          setMessagesState(result.data.messages);
          // We can still use existing chat track data for other purposes
        }
      } catch (error) {
        console.error("Failed to refresh user data:", error);
      } finally {
        setIsRefreshing(false);
      }
    };

    // Only refresh if we have a session
    if (session?.user?.id) {
      refreshData();
    }
  }, [session?.user?.id]); // Only run when session changes or component mounts

  // Listen for new messages and update user unread counts
  useEffect(() => {
    if (!session?.user?.id) return;

    const channel = pusher.subscribe(`track-${session.user.id}`);

    const handleNewMessage = (data: any) => {
      // Handle messages for any user (sender or receiver)
      const isMessageInvolvingCurrentUser =
        data.message &&
        (data.message.to === parseInt(session.user.id!) ||
          data.message.from === parseInt(session.user.id!));

      // Handle group messages involving current user
      const isGroupMessageInvolvingCurrentUser =
        data.message &&
        data.message.groupId &&
        (data.message.from === parseInt(session.user.id!) ||
          // Check if current user is in the group (we can enhance this later)
          true); // For now, assume all group messages are relevant

      if (isMessageInvolvingCurrentUser || isGroupMessageInvolvingCurrentUser) {
        // Add the new message to the messages state
        setMessagesState((prevMessages) => {
          const messageExists = prevMessages.some(
            (msg) => msg.id === data.message.id
          );
          if (messageExists) {
            return prevMessages;
          }
          // Add new message and sort by most recent first
          return [data.message, ...prevMessages].sort(
            (a, b) =>
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
        });

        // Handle group message sorting - update group order based on new message
        if (data.message.groupId) {
          setSideBarGroupLists((prevGroups) => {
            const { sortedGroups } = sortUsersAndGroupsByLatestMessage(
              userState,
              prevGroups
            );
            return sortedGroups;
          });
        }

        // Set the unread count to 1 for the sender (only if current user is receiver)
        if (data.message.to === parseInt(session.user.id!)) {
          setUserState((prevUsers) =>
            prevUsers.map((user) => {
              if (user.id === data.message.from) {
                return {
                  ...user,
                  unreadCount: 1,
                  latestMessage: data.message,
                };
              }
              return user;
            })
          );
        } else if (data.message.from === parseInt(session.user.id!)) {
          // Update the latest message for the receiver even if we sent it
          setUserState((prevUsers) =>
            prevUsers.map((user) => {
              if (user.id === data.message.to) {
                return {
                  ...user,
                  latestMessage: data.message,
                };
              }
              return user;
            })
          );
        }

        // Update the chat track state with the new message (for compatibility)
        setChatTrackState((prevChatTracks) => {
          const existingTrackIndex = prevChatTracks.findIndex(
            (track) => track.id === data.id
          );

          let updatedTracks;
          if (existingTrackIndex !== -1) {
            // Update existing track
            updatedTracks = [...prevChatTracks];
            updatedTracks[existingTrackIndex] = data;
          } else {
            // Add new track
            updatedTracks = [...prevChatTracks, data];
          }

          return updatedTracks;
        });
      }
    };

    const handleMessageRead = (data: { senderId: number; userId: number }) => {
      if (data.userId === parseInt(session.user.id!)) {
        // Reset unread count for the sender when messages are marked as read
        setUserState((prevUsers) =>
          prevUsers.map((user) => {
            if (user.id === data.senderId) {
              return { ...user, unreadCount: 0 };
            }
            return user;
          })
        );

        // Update chat track state to mark messages as read
        setChatTrackState((prevChatTracks) =>
          prevChatTracks.map((track) => {
            if (
              track.senderId === data.senderId &&
              track.receiverId === data.userId
            ) {
              return { ...track, isRead: true };
            }
            return track;
          })
        );
      }
    };

    channel.bind("chat-track", handleNewMessage);
    channel.bind("chat-track-read", handleMessageRead);

    return () => {
      channel.unbind("chat-track", handleNewMessage);
      channel.unbind("chat-track-read", handleMessageRead);
      pusher.unsubscribe(`track-${session.user.id}`);
    };
  }, [session?.user?.id]);

  // create new group for real time update
  useEffect(() => {
    let ignore = true;
    pusher
      .subscribe("create-group")
      .bind(
        "create",
        ({
          groupId,
          usersIds,
        }: {
          groupId: number;
          usersIds: { id: number }[];
        }) => {
          getGroupById(groupId, Number(session?.user?.id!)).then(
            (groupFromDb) => {
              if (groupFromDb) {
                if (!ignore) {
                  setSideBarGroupLists((prevGroups) => {
                    const isExistInGroup = prevGroups.find(
                      (g) => g.id === groupId
                    );
                    let updatedGroups;
                    if (!isExistInGroup) {
                      updatedGroups = [...prevGroups, groupFromDb];
                    } else {
                      updatedGroups = prevGroups;
                    }
                    // Sort groups after adding new one
                    const { sortedGroups } = sortUsersAndGroupsByLatestMessage(
                      userState,
                      updatedGroups
                    );
                    return sortedGroups;
                  });
                }
              }
            }
          );
        }
      );
    return () => {
      ignore = false;
      pusher.unbind("create");
    };
  }, []);

  // delete member from group for real time update
  useEffect(() => {
    let ignore = true;
    pusher
      .subscribe("delete-group")
      .bind(
        "delete",
        ({ groupId, userId }: { groupId: number; userId: number }) => {
          getGroupById(groupId, Number(session?.user?.id!)).then(
            (groupFromDb) => {
              if (groupFromDb) {
                if (!ignore) {
                  setSideBarGroupLists((prevGroups) => {
                    const isAlreadyExistInGroup = prevGroups.find(
                      (group) => group.id === groupId
                    );
                    let updatedGroups;
                    if (isAlreadyExistInGroup) {
                      updatedGroups = prevGroups.map((group) => {
                        if (group.id === groupId) {
                          return groupFromDb;
                        } else {
                          return group;
                        }
                      });
                    } else {
                      updatedGroups = prevGroups;
                    }
                    // Sort groups after updating
                    const { sortedGroups } = sortUsersAndGroupsByLatestMessage(
                      userState,
                      updatedGroups
                    );
                    return sortedGroups;
                  });
                  setGroupsList((groupLists: any) => {
                    return groupLists.map((group: any) => {
                      if (group.id === groupId) {
                        return groupFromDb;
                      } else {
                        return group;
                      }
                    });
                  });
                }
              } else {
                setSideBarGroupLists((prevGroups) => {
                  const isAlreadyExistInGroup = prevGroups.find(
                    (group) => group.id === groupId
                  );
                  if (isAlreadyExistInGroup) {
                    return prevGroups.filter((group) => group.id !== groupId);
                  } else {
                    return prevGroups;
                  }
                });
                setGroupsList((groupLists: any) => {
                  return groupLists.filter(
                    (group: any) => group.id !== groupId
                  );
                });
              }
            }
          );
        }
      );
    return () => {
      ignore = false;
      pusher.unbind("delete");
    };
  }, []);

  // add new member to group and update sidebar for real time update
  useEffect(() => {
    // "add-member-in-group", "add-member"
    let ignore = true;
    pusher
      .subscribe("add-member-in-group")
      .bind("add-member", ({ groupId }: { groupId: number }) => {
        getGroupById(groupId, Number(session?.user?.id!)).then(
          (groupFromDb) => {
            if (groupFromDb) {
              if (!ignore) {
                setSideBarGroupLists((prevGroups) => {
                  const isAlreadyExistInGroup = prevGroups.find(
                    (group) => group.id === groupId
                  );
                  let updatedGroups;
                  if (isAlreadyExistInGroup) {
                    updatedGroups = prevGroups.map((group) => {
                      if (group.id === groupId) {
                        return groupFromDb;
                      } else {
                        return group;
                      }
                    });
                  } else {
                    updatedGroups = [...prevGroups, groupFromDb];
                  }
                  // Sort groups after adding/updating member
                  const { sortedGroups } = sortUsersAndGroupsByLatestMessage(
                    userState,
                    updatedGroups
                  );
                  return sortedGroups;
                });
                setGroupsList((groupLists: any) => {
                  return groupLists.map((group: any) => {
                    if (group.id === groupId) {
                      return groupFromDb;
                    } else {
                      return group;
                    }
                  });
                });
              }
            }
          }
        );
      });
    return () => {
      ignore = false;
      pusher.unbind("add-member");
    };
  }, []);

  // Sort users whenever chatTrackState changes or when a new message arrives
  useEffect(() => {
    if (userState.length > 0 || sideBarGroupsLists.length > 0) {
      const { sortedUsers, sortedGroups } = sortUsersAndGroupsByLatestMessage(
        userState,
        sideBarGroupsLists
      );
      setUserState(sortedUsers);
      setSideBarGroupLists(sortedGroups);
    }
  }, [chatTrackState, lastMessage]); // eslint-disable-line react-hooks/exhaustive-deps

  // Also sort when users prop changes (initial load or refresh)
  useEffect(() => {
    if (users.length > 0 || groups.length > 0) {
      const { sortedUsers, sortedGroups } = sortUsersAndGroupsByLatestMessage(
        users,
        groups
      );
      setUserState(sortedUsers);
      setSideBarGroupLists(sortedGroups);
    }
  }, [users, groups]); // eslint-disable-line react-hooks/exhaustive-deps

  // Create a combined and sorted list of users and groups for display
  const getCombinedSortedList = useCallback(() => {
    // Create combined items with their latest messages
    const combinedItems = [
      ...sideBarGroupsLists.map((group) => {
        const groupMessages = messagesState.filter(
          (message) => message.groupId === group.id
        );
        const latestMessage =
          groupMessages.length > 0 ? groupMessages[0] : null;

        return {
          type: "group" as const,
          data: group,
          latestMessage,
          timestamp: latestMessage
            ? new Date(latestMessage.updatedAt).getTime()
            : 0,
        };
      }),
      ...userState.map((user) => {
        const userMessages = messagesState.filter(
          (message) =>
            (message.from === user.id &&
              message.to === parseInt(session?.user?.id!)) ||
            (message.from === parseInt(session?.user?.id!) &&
              message.to === user.id)
        );
        const latestMessage =
          userMessages.length > 0 ? userMessages[0] : user.latestMessage;

        return {
          type: "user" as const,
          data: user,
          latestMessage,
          timestamp: latestMessage
            ? new Date(latestMessage.updatedAt).getTime()
            : 0,
        };
      }),
    ];

    // Check if lastMessage from store affects any items
    if (lastMessage && lastMessage.message) {
      const lastMessageTimestamp = new Date(
        lastMessage.message.updatedAt
      ).getTime();
      const lastMsg = lastMessage.message; // Store reference to avoid repeated null checks

      combinedItems.forEach((item) => {
        if (item.type === "user") {
          if (
            (lastMsg.from === item.data.id &&
              lastMsg.to === parseInt(session?.user?.id!)) ||
            (lastMsg.from === parseInt(session?.user?.id!) &&
              lastMsg.to === item.data.id)
          ) {
            item.timestamp = Math.max(item.timestamp, lastMessageTimestamp);
          }
        } else if (item.type === "group" && lastMsg.groupId === item.data.id) {
          item.timestamp = Math.max(item.timestamp, lastMessageTimestamp);
        }
      });
    }

    // Sort by timestamp (most recent first)
    return combinedItems.sort((a, b) => {
      if (a.timestamp === 0 && b.timestamp === 0) return 0;
      if (a.timestamp === 0) return 1; // Items without messages go to bottom
      if (b.timestamp === 0) return -1; // Items without messages go to bottom
      return b.timestamp - a.timestamp;
    });
  }, [
    sideBarGroupsLists,
    userState,
    messagesState,
    lastMessage,
    session?.user?.id,
  ]);

  // Function to update user state (for unread counts and latest messages)
  const updateUserState = (
    userId: number,
    updates: Partial<
      User & { unreadCount: number; latestMessage?: Message | null }
    >
  ) => {
    setUserState((prevUsers) =>
      prevUsers.map((user) => {
        if (user.id === userId) {
          return { ...user, ...updates };
        }
        return user;
      })
    );
  };

  return (
    <div
      className={cn(
        "app-shadow max-h-[92vh] w-full rounded-lg bg-background p-3 sm:block sm:w-[20%]",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-[#795252] sm:text-[14px] sm:font-normal">
          User List
        </h2>
        <CreateGroupModal
          users={users}
          setSideBarGroupLists={setSideBarGroupLists}
          addChatItem={addChatItem}
        />
      </div>
      {/* Search */}
      <div>
        <input
          onChange={(e) => setSearchTerm(e.target.value)}
          type="text"
          placeholder="Search here..."
          className="my-3 mr-2 w-full rounded-md border-2 border-[#006D77] p-2 text-[12px] text-[#797979] focus:outline-none max-[1822px]:w-full"
        />
      </div>

      <div className="thin-scrollbar mt-2 flex h-[88%] flex-col gap-2 overflow-y-auto max-[2127px]:h-[87%]">
        {/* Combined list of groups and users sorted by latest message */}
        {getCombinedSortedList()
          .filter((item) => {
            if (item.type === "group") {
              return item.data.name
                .toLowerCase()
                .includes(searchTerm.toLowerCase());
            } else {
              const user = item.data;
              return (
                user.firstName
                  ?.toLowerCase()
                  .includes(searchTerm.toLowerCase()) ||
                user.lastName
                  ?.toLowerCase()
                  .includes(searchTerm.toLowerCase()) ||
                `${user.firstName?.toLowerCase()} ${user.lastName?.toLowerCase()}`.includes(
                  searchTerm.toLowerCase()
                ) ||
                user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.phone?.toLowerCase().includes(searchTerm.toLowerCase())
              );
            }
          })
          .map((item) => {
            if (item.type === "group") {
              const group = item.data;
              const isSelectedGroup = !!groupsList.find(
                (g) => g.id === group.id
              );

              return (
                <button
                  key={`group-${group.id}`}
                  className={cn(
                    "flex items-center gap-2 rounded-md border border-[#006D77] bg-[#F2F2F2] p-2 hover:bg-gray-300 sm:border-0",
                    isSelectedGroup && "bg-[#006D77]"
                  )}
                  onClick={() => {
                    // Use the helper function if available, otherwise fallback to old logic
                    if (addChatItem) {
                      addChatItem(group, "group");
                    } else {
                      // Fallback logic
                      setGroupsList((groupList) => {
                        const existingGroupIndex = groupList.findIndex(
                          (g) => g?.id === group.id
                        );

                        if (existingGroupIndex !== -1) {
                          return groupList;
                        } else {
                          const totalChatBoxes =
                            groupList.length + usersList.length;

                          if (totalChatBoxes >= 4) {
                            const newGroupList = [...groupList];
                            if (newGroupList.length >= 1) {
                              newGroupList[newGroupList.length - 1] = group;
                              return newGroupList;
                            } else {
                              return [group];
                            }
                          } else {
                            return [...groupList, group];
                          }
                        }
                      });
                    }
                  }}
                >
                  <div
                    className={cn(
                      "grid items-center",
                      group.users.length === 1 ? "grid-cols-1" : "grid-cols-2"
                    )}
                  >
                    {group.users.length > 0 &&
                      group.users?.slice(0, 4).map((user) => {
                        return (
                          <Avatar
                            photo={user?.image}
                            width={40}
                            height={40}
                            key={user?.id}
                          />
                        );
                      })}
                  </div>
                  <div className="flex flex-col">
                    <p
                      className={cn(
                        "text-[14px] font-bold text-[#797979]",
                        isSelectedGroup && "text-white hover:text-[#797979]"
                      )}
                    >
                      {group?.name}
                    </p>
                  </div>
                </button>
              );
            } else {
              const user = item.data;
              const isSelectedUser = !!usersList.find((u) => u.id === user.id);

              // Get the latest chat track for this user (most recent message)
              const userChatTracks = chatTrackState.filter(
                (chat) =>
                  chat.receiverId === user.id || chat.senderId === user.id
              );

              const traceLastMessage =
                userChatTracks.length > 0
                  ? userChatTracks.reduce((latest, current) =>
                      new Date(current.updatedAt) > new Date(latest.updatedAt)
                        ? current
                        : latest
                    )
                  : undefined;

              return (
                <UserSelectButton
                  key={`user-${user.id}`}
                  groupListLength={groupsList?.length}
                  isSelectedUser={isSelectedUser}
                  traceLastMessage={traceLastMessage}
                  user={user}
                  setUsersList={setUsersList}
                  updateUserState={updateUserState}
                  addChatItem={addChatItem}
                />
              );
            }
          })}
      </div>
    </div>
  );
}
