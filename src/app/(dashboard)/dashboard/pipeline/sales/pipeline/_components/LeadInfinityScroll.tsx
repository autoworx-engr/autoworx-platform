"use client";
import { getLeads } from "@/actions/pipelines/getLeads";
import { actionTypes } from "@/constants/lead.constant";
import {
  useColumnDispatch,
  useSearchTerm,
} from "@/context/sales-pipeline.context";
import { LeadWithSalesUser } from "@/types/invoiceLead";
import { DroppableProvided } from "@hello-pangea/dnd";
import React, { useEffect, useRef, useState } from "react";

type TProps = {
  provided: DroppableProvided;
  columnTitle: string;
  columnId: number | null;
  leads: LeadWithSalesUser[];
  children: (leads: LeadWithSalesUser[]) => React.ReactNode;
};

const defaultTakeLeads = 10;

export default function LeadInfinityScroll({
  provided,
  leads = [],
  columnId,
  children,
}: TProps) {
  const dispatch = useColumnDispatch();
  const searchTerm = useSearchTerm();

  const loaderRef = useRef<HTMLDivElement>(null);
  const [scrollLoading, setScrollLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const leadsLength = leads?.length ?? 0;

  const fetchMoreLeads = async () => {
    try {
      console.log("Fetching more leads data...");
      if (columnId) {
        const getNextLeads = await getLeads({
          columnId,
          take: defaultTakeLeads,
          skip: leadsLength,
          searchTerm: searchTerm || undefined, // Include search term in pagination
        });
        if (getNextLeads?.length < defaultTakeLeads) {
          setHasMore(false);
        }
        // Call dispatch action to update leads in the store
        dispatch({
          type: actionTypes.MORE_LEADS,
          payload: {
            columnId,
            leads: getNextLeads,
          },
        });
      } else {
        throw new Error("Column not found");
      }
    } catch (err) {
      console.error("Error fetching more leads:", err);
      setHasMore(false);
    }
  };

  useEffect(() => {
    if (leadsLength >= defaultTakeLeads) {
      setHasMore(true);
    }
  }, [leadsLength]);

  // Reset hasMore when search term changes
  useEffect(() => {
    if (searchTerm) {
      setHasMore(false); // Disable infinity scroll during search
    } else if (leadsLength >= defaultTakeLeads) {
      setHasMore(true); // Re-enable when search is cleared
    }
  }, [searchTerm, leadsLength]);

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
  }, [fetchMoreLeads, scrollLoading, hasMore, leadsLength]);

  return (
    <ul
      {...provided?.droppableProps}
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
