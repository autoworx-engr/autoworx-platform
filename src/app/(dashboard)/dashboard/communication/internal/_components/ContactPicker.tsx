import Avatar from "@/components/Avatar";
import { SlimInput } from "@/components/SlimInput";
import { User } from "@prisma/client";
import { ChevronDown, ChevronUp, CircleX, Search } from "lucide-react";
import React, { useEffect, useRef } from "react";
import InfiniteScroll from "react-infinite-scroll-component";
import type { TContactListUser } from "../_hooks/useGroupContactInfiniteList";

type Props = {
  contactList: TContactListUser[];
  groupUsers: User[];
  openUserList: boolean;
  setOpenUserList: (open: boolean | ((v: boolean) => boolean)) => void;
  onSearch: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAdd: (user: User) => void;
  onRemove: (user: TContactListUser) => void;
  onOpenList: () => void;
  hasNextPage?: boolean;
  fetchNextPage?: () => void;
  isFetchingNextPage?: boolean;
  isLoading?: boolean;
  required?: boolean;
};

export function ContactPicker({
  contactList,
  groupUsers,
  openUserList,
  setOpenUserList,
  onSearch,
  onAdd,
  onRemove,
  onOpenList,
  hasNextPage,
  fetchNextPage,
  isFetchingNextPage,
  isLoading,
  required,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (openUserList && inputRef.current) inputRef.current.focus();
  }, [openUserList]);

  return (
    <>
      <div className="flex max-h-[250px] flex-wrap gap-3 overflow-y-auto rounded-lg p-2">
        {contactList.map((u) => (
          <div
            key={u.id}
            className="group flex items-center justify-between space-x-1 rounded-full bg-primary px-3 py-1 text-white shadow-sm transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-[#5a67e8] hover:shadow-indigo-500/50"
          >
            <p className="text-sm font-medium">{u.name}</p>
            <CircleX
              onClick={() => onRemove(u)}
              className="size-4 cursor-pointer text-white/80 transition-colors duration-300 ease-in-out group-hover:text-white"
            />
          </div>
        ))}
        {contactList.length === 0 && (
          <p className="text-sm italic text-slate-500 dark:text-slate-400">
            Click above to add users to the group.
          </p>
        )}
      </div>

      <div>
        {openUserList ? (
          <>
            <div className="mb-1 px-2 font-medium text-slate-800 dark:text-white">
              Select Contacts{" "}
              {required && <span className="text-red-500">*</span>}
            </div>
            <div className="w-full space-y-4 rounded-xl border border-slate-300/50 bg-white/50 p-4 backdrop-blur-sm max-h-[50vh] overflow-hidden ring-1 ring-slate-900/5 dark:border-slate-700/50 dark:bg-slate-800/50 dark:ring-white/10 sm:max-h-[60vh]">
              <div className="relative">
                <input
                  ref={inputRef}
                  onChange={onSearch}
                  type="text"
                  placeholder="Search Users..."
                  className="w-full rounded-lg border border-slate-300/70 bg-white/80 py-1 pl-9 pr-8 leading-6 outline-none transition-colors duration-300 ease-in-out placeholder:text-slate-400 focus:border-[#00b8b0] dark:border-slate-700 dark:bg-slate-700 dark:text-white dark:focus:border-[#0098da]"
                />
                <ChevronUp
                  onClick={() => setOpenUserList((p) => !p)}
                  className="absolute right-1 top-1/2 size-6 -translate-y-1/2 cursor-pointer text-slate-600 transition-transform duration-300 ease-in-out hover:scale-110 dark:text-slate-400"
                />
                <Search className="absolute left-2 top-1/2 size-5 -translate-y-1/2 text-slate-600 dark:text-slate-400" />
              </div>
              <div
                id="contact-picker-scroll"
                className="max-h-60 flex flex-col items-start space-y-2 overflow-y-auto thin-scrollbar p-1"
              >
                <InfiniteScroll
                  dataLength={groupUsers.length}
                  next={fetchNextPage ?? (() => {})}
                  hasMore={hasNextPage ?? false}
                  loader={
                    isFetchingNextPage ? (
                      <div className="py-2 text-center text-xs text-zinc-500">
                        Loading more…
                      </div>
                    ) : null
                  }
                  scrollableTarget="contact-picker-scroll"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                  }}
                >
                  {isLoading && groupUsers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary" />
                    </div>
                  ) : groupUsers.length > 0 ? (
                    groupUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex w-full cursor-pointer items-center space-x-3 rounded-lg p-2 transition-all duration-300 ease-in-out hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
                        onClick={() => onAdd(user)}
                      >
                        <Avatar photo={user.image} width={60} height={60} />
                        <div className="flex flex-col overflow-hidden flex-1 min-w-0">
                          <p className="truncate max-w-[280px] text-xs md:text-base font-semibold text-slate-800 dark:text-white">
                            {user.firstName} {user.lastName}
                          </p>
                          <div className="flex flex-col text-[8px] md:text-xs text-slate-600 dark:text-slate-400">
                            {user.phone && <p>{user.phone}</p>}
                            <p className="truncate">{user.email}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="w-full py-4 text-center text-amber-500">
                      No user found
                    </p>
                  )}
                </InfiniteScroll>
              </div>
            </div>
          </>
        ) : (
          <div className="relative">
            <SlimInput
              label={
                <>
                  Contact List{" "}
                  {required && <span className="text-red-500">*</span>}
                </>
              }
              name="ContactList"
              type="text"
              readOnly
              onClick={onOpenList}
              autoFocus={false}
              className="text-left cursor-pointer text-slate-600 dark:text-white"
              rootClassName="overflow-hidden"
              placeholder="Click to add users..."
            />
            <ChevronDown
              onClick={onOpenList}
              className="absolute right-1 top-[32px] size-6 cursor-pointer text-slate-600 transition-transform duration-300 ease-in-out hover:scale-110 dark:text-slate-400"
            />
          </div>
        )}
      </div>
    </>
  );
}
