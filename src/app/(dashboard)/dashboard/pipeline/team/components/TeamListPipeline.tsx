"use client";

import { getTeamWorkOrdersList } from "@/actions/pipelines/getTeamWorkOrdersList";
import { ShopLead } from "@/types/invoiceLead";
import { useGetCurrentUser } from "@/utils/useGetCurrentUser";
import { EmployeeType } from "@prisma/client";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import SearchScroll from "../../components/SearchScroll";
import { SelectedEmployee } from "../../components/SearchScrollFilters";
import TeamListRow from "./TeamListRow";
import { useTeamWorkOrderPanel } from "./useTeamWorkOrderPanel";

const PAGE_SIZE = 20;

interface TeamListPipelineProps {
  leads: ShopLead[];
  totalCount: number;
  hasMore: boolean;
  employeeType?: EmployeeType;
  employeeId?: number;
  selectedEmployee?: SelectedEmployee | null;
  isTechnician?: boolean;
}

export default function TeamListPipeline({
  leads,
  totalCount,
  hasMore: initialHasMore,
  employeeType,
  employeeId,
  selectedEmployee,
  isTechnician,
}: TeamListPipelineProps) {
  const currentUser = useGetCurrentUser();
  const searchParams = useSearchParams();
  const searchTerm = searchParams.get("search") ?? "";

  const [loadedLeads, setLoadedLeads] = useState<ShopLead[]>(leads);
  const [total, setTotal] = useState(totalCount);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const { selectedLead, openLead, panel } = useTeamWorkOrderPanel();

  const listRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const isFetchingRef = useRef(false);
  const loadMoreRef = useRef<() => void>(() => {});

  // A fresh server render (search / filter change) resets the list
  useEffect(() => {
    setLoadedLeads(leads);
    setTotal(totalCount);
    setHasMore(initialHasMore);
  }, [leads, totalCount, initialHasMore]);

  const loadMore = useCallback(async () => {
    if (isFetchingRef.current || !hasMore) return;
    isFetchingRef.current = true;
    setIsLoadingMore(true);

    try {
      const result = await getTeamWorkOrdersList(
        loadedLeads.length,
        PAGE_SIZE,
        employeeType,
        isTechnician ? Number(currentUser?.id) : undefined,
        searchTerm || undefined,
        employeeId,
      );
      setLoadedLeads((prev) => [...prev, ...result.leads]);
      setTotal(result.total);
      setHasMore(result.hasMore);
    } catch {
      // leave the list as-is; the sentinel can retry on the next scroll
    } finally {
      isFetchingRef.current = false;
      setIsLoadingMore(false);
    }
  }, [
    loadedLeads.length,
    hasMore,
    employeeType,
    employeeId,
    isTechnician,
    currentUser,
    searchTerm,
  ]);

  useEffect(() => {
    loadMoreRef.current = loadMore;
  }, [loadMore]);

  useEffect(() => {
    if (!hasMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMoreRef.current();
      },
      { root: listRef.current, rootMargin: "80px", threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadedLeads.length]);

  return (
    <>
      <div className="mb-4 px-2">
        <SearchScroll
          pipelineData={[
            { id: null, title: "All Work Orders", leads: loadedLeads },
          ]}
          isTeamPipeline={true}
          selectedEmployee={selectedEmployee}
        />
      </div>

      <div className="px-4">
        <div className="overflow-hidden rounded-xl border border-slate-100 bg-[#6675FF] shadow-sm">
          <div className="flex items-center justify-between bg-[#6574FD] px-4 py-2.5 text-white">
            <p className="text-sm font-bold">All Work Orders</p>
            <span className="rounded-md bg-white px-2 py-0.5 text-xs font-bold text-slate-700">
              {total}
            </span>
          </div>

          {loadedLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
              <p className="text-lg font-semibold text-gray-500">
                No work orders found
              </p>
              <p className="text-sm text-gray-400">
                Nothing is assigned to the team for this filter yet.
              </p>
            </div>
          ) : (
            <div
              ref={listRef}
              className="max-h-[70vh] overflow-y-auto bg-slate-50/60 p-2"
            >
              <ul className="flex flex-col gap-2">
                {loadedLeads.map((lead) => (
                  <TeamListRow
                    key={lead.invoiceId}
                    lead={lead}
                    isSelected={selectedLead?.invoiceId === lead.invoiceId}
                    onSelect={() => openLead(lead)}
                  />
                ))}
              </ul>

              {hasMore && (
                <div
                  ref={sentinelRef}
                  className="flex items-center justify-center py-3"
                >
                  {isLoadingMore ? (
                    <span className="text-xs text-slate-400">Loading…</span>
                  ) : (
                    <span className="text-xs text-slate-400">
                      {loadedLeads.length} of {total} loaded
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {panel}
    </>
  );
}
