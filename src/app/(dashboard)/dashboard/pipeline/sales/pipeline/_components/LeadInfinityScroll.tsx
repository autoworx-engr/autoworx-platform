"use client";

import { actionTypes } from "@/constants/lead.constant";
import {
  useColumnDispatch,
  useOrderBy,
  useSearchTerm,
} from "@/context/sales-pipeline.context";
import { LeadWithSalesUser } from "@/types/invoiceLead";
import { autoScrollForElements } from "@atlaskit/pragmatic-drag-and-drop-auto-scroll/element";
import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import React, { useCallback, useEffect, useRef, useState } from "react";

type TProps = {
  columnTitle: string;
  columnId: number | null;
  columnIndex?: number;
  leads: LeadWithSalesUser[];
  totalLeads?: number;
  screenWidth?: number;
  children: (leads: LeadWithSalesUser[]) => React.ReactNode;
};

const defaultTakeLeads = 10;

export default function LeadInfinityScroll({
  leads = [],
  columnId,
  columnIndex,
  children,
  screenWidth,
  columnTitle,
  totalLeads,
}: TProps) {
  const dispatch = useColumnDispatch();
  const searchTerm = useSearchTerm();
  const orderBy = useOrderBy();
  const scrollRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const loaderRef = useRef<HTMLDivElement>(null);
  const [scrollLoading, setScrollLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [isDraggedOver, setIsDraggedOver] = useState(false);
  // const [screenWidth, setScreenWidth] = useState<number>(
  //   typeof window !== "undefined" ? window.innerWidth : 1200
  // );

  const leadsLength = leads?.length ?? 0;

  const fetchMoreLeads = useCallback(async () => {
    try {
      if (columnId) {
        const queryParams = new URLSearchParams();
        if (columnId) queryParams.append("columnId", columnId.toString());
        queryParams.append("take", defaultTakeLeads.toString());
        queryParams.append("skip", leadsLength.toString());
        if (searchTerm) queryParams.append("searchTerm", searchTerm);
        if (orderBy) queryParams.append("orderBy", orderBy);

        const response = await fetch(
          `/api/pipeline/sales/leads?` + queryParams.toString(),
        );
        const data = await response.json();
        if (!data.success) throw new Error(data.error);

        const getNextLeads = data.data.leads;
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
      } else {
        throw new Error("Column ID not found");
      }
    } catch (err) {
      console.error(err);
      setHasMore(false);
    }
  }, [columnId, leadsLength, searchTerm, dispatch, orderBy]);

  useEffect(() => {
    setHasMore(
      totalLeads !== undefined
        ? leadsLength < totalLeads
        : leadsLength >= defaultTakeLeads,
    );
  }, [searchTerm, leadsLength, totalLeads]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !scrollLoading && hasMore) {
          setScrollLoading(true);
          fetchMoreLeads().finally(() => setScrollLoading(false));
        }
      },
      { threshold: 0.3 },
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => observer.disconnect();
  }, [fetchMoreLeads, scrollLoading, hasMore]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || (screenWidth !== undefined && screenWidth < 768)) {
      return;
    }

    return dropTargetForElements({
      element,
      getData: () => ({ columnIndex, targetType: "column" }),
      onDragEnter: () => setIsDraggedOver(true),
      onDragLeave: () => setIsDraggedOver(false),
      onDrop: () => setIsDraggedOver(false),
    });
  }, [columnIndex, screenWidth]);

  useEffect(() => {
    const ulElement = scrollRef.current;
    if (!ulElement || (screenWidth !== undefined && screenWidth < 768)) return;

    return autoScrollForElements({ element: ulElement });
  }, [screenWidth]);

  return (
    <div
      ref={containerRef}
      data-column-index={columnIndex}
      className="mx-2 w-[calc(100vw-2rem)] flex-shrink-0 rounded-md border sm:min-w-80 sm:flex-1 lg:min-w-[calc(100%/3-1.5rem)] xl:min-w-[calc(100%/4-1.5rem)] 2xl:min-w-[calc(100%/6-1.5rem)]"
      style={{
        backgroundColor: "rgba(101, 113, 255, 0.15)",
        padding: "0",
      }}
    >
      <h2 className="rounded-lg bg-primary px-4 py-3 text-center text-white">
        <p className="text-base font-bold">
          {columnTitle || ""}
          <span className="ml-2 rounded-lg bg-[#3F49B9] px-2">
            {totalLeads || 0}
          </span>
        </p>
      </h2>
      <ul
        ref={scrollRef}
        className="mt-1 flex max-h-[65vh] min-h-[65vh] flex-col gap-1 overflow-y-auto p-1"
        style={{ maxHeight: "65vh" }}
      >
        {children(leads)}
        {hasMore && (
          <div ref={loaderRef} className="text-center">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-4 border-dashed border-yellow-500"></div>
            <h2 className="mt-4 text-zinc-900 dark:text-white">Loading...</h2>
          </div>
        )}
      </ul>
    </div>
  );
}
