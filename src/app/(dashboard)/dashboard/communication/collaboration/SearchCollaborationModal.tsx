"use client";

import { connectWithCompany } from "@/actions/settings/myNetwork";
import Avatar from "@/components/Avatar";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from "@/components/Dialog";
import { errorToast, successToast } from "@/lib/toast";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Plus, Search } from "lucide-react";
import { Company, User } from "@prisma/client";
import {
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  TCollaboratorAdmin,
  useInfinitySearchCollaborators,
} from "./hooks/useInfinitySearchCollaborators";

type TProps = {
  companyAdmins: Partial<
    User & { isConnected: boolean; companyStatus?: string | null }
  >[];
  setCompanyAdmins: React.Dispatch<
    SetStateAction<
      Partial<User & { isConnected: boolean; companyStatus?: string | null }>[]
    >
  >;
  companies: (Company & { users: User[] })[];
};

export default function SearchCollaborationModal({}: TProps) {
  const [open, setOpen] = useState(false);
  const [openUserList, setOpenUserList] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [connectingId, setConnectingId] = useState<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!open) {
      setOpenUserList(false);
      setError(null);
      setSearchInput("");
      setDebouncedSearch("");
    }
  }, [open]);

  // Debounce search input
  useEffect(() => {
    const handle = setTimeout(
      () => setDebouncedSearch(searchInput.trim()),
      300,
    );
    return () => clearTimeout(handle);
  }, [searchInput]);

  const {
    data: pagesData,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfinitySearchCollaborators(debouncedSearch, openUserList);

  const admins = useMemo(
    () => pagesData?.pages?.flatMap((p) => p.data) ?? [],
    [pagesData],
  );

  // Local optimistic patches keyed by companyId so the freshly connected
  // company shows "Connected" immediately without refetching every page.
  const [optimisticConnected, setOptimisticConnected] = useState<
    Record<number, boolean>
  >({});

  const maybeLoadMore = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el || isFetchingNextPage || !hasNextPage) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom < 120) {
      void fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.addEventListener("scroll", maybeLoadMore, { passive: true });
    return () => el.removeEventListener("scroll", maybeLoadMore);
  }, [maybeLoadMore]);

  useEffect(() => {
    if (!isLoading) maybeLoadMore();
  }, [isLoading, admins.length, maybeLoadMore]);

  async function handleConnectCompany(companyId: number) {
    setConnectingId(companyId);
    try {
      const result = await connectWithCompany({
        targetCompanyId: companyId,
        revalidatePathName: "/communication/collaboration",
      });

      if (result?.success) {
        setOptimisticConnected((prev) => ({ ...prev, [companyId]: true }));
        successToast("Connected with the company");
        // Also refresh the sidebar list
        queryClient.invalidateQueries({
          queryKey: ["collaboration-companies"],
        });
      } else {
        errorToast(result?.message || "Failed to connect");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to connect";
      setError(message);
      errorToast(message);
    } finally {
      setConnectingId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-1.5 rounded-lg bg-[#006D77] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#005a63] active:scale-95">
          <Plus size={16} strokeWidth={2.5} />
          Search for Collaborators
        </button>
      </DialogTrigger>
      <DialogContent
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="w-[calc(100vw-2rem)] sm:w-full sm:max-w-lg"
      >
        {error && <p className="text-center text-sm text-red-400">{error}</p>}
        <h2 className="mb-4 text-xl font-bold text-slate-600">
          Search for Collaborators
        </h2>
        <div className="w-full sm:min-w-96">
          {openUserList ? (
            <>
              <div className="mb-1.5 px-1 text-sm font-semibold text-slate-600">
                Enter Company Name
              </div>
              <div className="h-fit w-full space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-2 sm:p-4">
                {/* Search box */}
                <div className="relative flex items-center">
                  <Search className="pointer-events-none absolute left-3 size-4 text-slate-400" />
                  <input
                    autoFocus
                    placeholder="Search for a Company"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    type="text"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm font-medium text-slate-700 placeholder-slate-400 outline-none transition-all focus:border-[#006D77]/40 focus:bg-white focus:ring-2 focus:ring-[#006D77]/15"
                  />
                </div>

                {/* user list */}
                <div
                  ref={scrollContainerRef}
                  className="thin-scrollbar flex h-72 flex-col items-start space-y-2 overflow-y-auto p-1"
                >
                  {isLoading && admins.length === 0 ? (
                    <div className="flex w-full items-center justify-center py-8 text-sm text-slate-400">
                      Loading…
                    </div>
                  ) : admins.length === 0 ? (
                    <div className="flex w-full items-center justify-center py-8 text-sm text-slate-400">
                      {debouncedSearch
                        ? "No companies match your search"
                        : "No companies found"}
                    </div>
                  ) : (
                    admins.map((user: TCollaboratorAdmin) => {
                      const isConnected =
                        (user.companyId &&
                          optimisticConnected[user.companyId]) ||
                        user.isConnected ||
                        user.companyStatus === "accepted";

                      return (
                        <div
                          key={user?.id}
                          className="flex w-full flex-wrap items-center gap-2 rounded-lg border border-slate-100 bg-white p-2 transition-colors hover:bg-slate-50 sm:flex-nowrap sm:gap-3 sm:p-2.5"
                        >
                          <Avatar
                            className="flex-shrink-0"
                            photo={user?.image}
                            width={40}
                            height={40}
                          />
                          <div className="flex min-w-0 flex-1 flex-col">
                            <div className="flex flex-wrap items-center gap-1 sm:flex-nowrap sm:gap-2">
                              <p className="truncate text-sm font-semibold text-slate-700">
                                {user?.firstName} {user?.lastName}
                              </p>
                              <span className="flex-shrink-0 rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-[#006D77] sm:text-xs">
                                {user?.companyName}
                              </span>
                            </div>
                            <div className="flex flex-col text-[10px] text-slate-400 sm:flex-row sm:items-center sm:gap-2 sm:text-xs">
                              {user?.phone && <span>{user?.phone}</span>}
                              <span className="truncate">{user?.email}</span>
                            </div>
                          </div>
                          <div className="w-full flex-shrink-0 sm:w-auto">
                            {isConnected ? (
                              <span className="block w-full rounded-lg bg-slate-100 px-3 py-1.5 text-center text-xs font-semibold text-slate-500 sm:inline sm:w-auto sm:text-left">
                                Connected
                              </span>
                            ) : user?.companyStatus ? (
                              <span className="block w-full rounded-lg bg-amber-200 px-3 py-1.5 text-center text-xs font-semibold text-slate-500 capitalize sm:inline sm:w-auto sm:text-left">
                                {user?.companyStatus}
                              </span>
                            ) : (
                              <button
                                disabled={connectingId === user.companyId}
                                onClick={() =>
                                  user.companyId &&
                                  handleConnectCompany(user.companyId)
                                }
                                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#006D77] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-[#005a63] active:scale-95 disabled:opacity-60 sm:w-auto"
                              >
                                <Plus size={14} strokeWidth={2.5} />
                                <span>
                                  {connectingId === user.companyId
                                    ? "Inviting…"
                                    : "Invite"}
                                </span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}

                  {isFetchingNextPage && (
                    <div className="w-full py-2 text-center text-xs text-slate-400">
                      Loading more…
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setOpenUserList((prev) => !prev)}
              className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-500 transition-all hover:border-slate-300 hover:bg-white"
            >
              <span>Enter Company Name</span>
              <ChevronDown className="size-5 text-slate-400" />
            </button>
          )}
        </div>
        <DialogFooter className="flex-row-reverse gap-x-2 sm:flex-row">
          <DialogClose className="rounded-lg border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 transition-all hover:bg-slate-50 active:scale-95">
            Cancel
          </DialogClose>
          <button
            onClick={() => {
              setOpen(false);
              setOpenUserList(false);
            }}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#525ceb] active:scale-95"
          >
            Done
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
