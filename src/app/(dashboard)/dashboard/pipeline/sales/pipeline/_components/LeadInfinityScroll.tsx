"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { getLeads } from "@/actions/pipelines/getLeads";
import { actionTypes } from "@/constants/lead.constant";
import {
  useColumnDispatch,
  useSearchTerm,
} from "@/context/sales-pipeline.context";
import { LeadWithSalesUser } from "@/types/invoiceLead";
import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { autoScrollForElements } from "@atlaskit/pragmatic-drag-and-drop-auto-scroll/element";

type TProps = {
  columnTitle: string;
  columnId: number | null;
  columnIndex: number;
  leads: LeadWithSalesUser[];
  children: (leads: LeadWithSalesUser[]) => React.ReactNode;
};

const defaultTakeLeads = 10;

export default function LeadInfinityScroll({
  leads = [],
  columnId,
  columnIndex,
  children,
}: TProps) {
  const dispatch = useColumnDispatch();
  const searchTerm = useSearchTerm();
  const scrollRef = useRef<HTMLUListElement>(null);
  const loaderRef = useRef<HTMLDivElement>(null);
  const [scrollLoading, setScrollLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [screenWidth, setScreenWidth] = useState<number>(
    typeof window !== "undefined" ? window.innerWidth : 1200
  );

  const leadsLength = leads?.length ?? 0;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    return dropTargetForElements({
      element: el,
      getData: () => ({
        type: "column",
        columnId,
        columnIndex,
        index: leads.length,
      }),
    });
  }, [columnId, columnIndex, leads.length]);

  // Enable vertical auto-scroll within the column list during drag (desktop)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || screenWidth < 768) return;
    return autoScrollForElements({ element: el });
  }, [screenWidth]);

  useEffect(() => {
    function updateWidth() {
      setScreenWidth(window.innerWidth);
    }
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  const fetchMoreLeads = useCallback(async () => {
    try {
      if (columnId) {
        const getNextLeads = await getLeads({
          columnId,
          take: defaultTakeLeads,
          skip: leadsLength,
          searchTerm: searchTerm || undefined,
        });
        if (getNextLeads?.length < defaultTakeLeads) {
          setHasMore(false);
        }
        dispatch({
          type: actionTypes.MORE_LEADS,
          payload: {
            columnId,
            leads: getNextLeads,
          },
        });
      }
    } catch (err) {
      console.error(err);
      setHasMore(false);
    }
  }, [columnId, leadsLength, searchTerm, dispatch]);

  useEffect(() => {
    if (leadsLength >= defaultTakeLeads) {
      setHasMore(true);
    }
  }, [leadsLength]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !scrollLoading && hasMore) {
          setScrollLoading(true);
          fetchMoreLeads().finally(() => setScrollLoading(false));
        }
      },
      { threshold: 0.3 }
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => observer.disconnect();
  }, [fetchMoreLeads, scrollLoading, hasMore]);

  return (
    <ul
      ref={scrollRef}
      className="thin-scrollbar mt-1 flex max-h-[65vh] min-h-[65vh] flex-col gap-1 overflow-y-auto p-1"
      style={{ maxHeight: "65vh" }}
    >
      {children(leads)}
      {hasMore && !searchTerm && (
        <div ref={loaderRef} className="text-center">
          <div className="mx-auto h-6 w-6 animate-spin rounded-full border-4 border-dashed border-yellow-500"></div>
          <h2 className="mt-4 text-zinc-900 dark:text-white">Loading...</h2>
        </div>
      )}
    </ul>
  );
}