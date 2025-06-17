import { getLeads } from "@/actions/pipelines/getLeads";
import { errorToast } from "@/lib/toast";
import { usePipelineFilterStore } from "@/stores/PipelineFilterStore";
import { LeadWithSalesUser, SalesLead } from "@/types/invoiceLead";
import { salesPipelineQueryKeys } from "@/utils/enums/query-key-constant";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useRef, useState } from "react";

type TProps = {
  columnTitle: string;
  columnId: number | null;
  children: (leads: SalesLead[]) => React.ReactNode;
};

const defaultTakeLeads = 10;

export default function SalesPipelineInfinityScroll({
  columnTitle,
  columnId,
  children,
}: TProps) {
  const searchTerm = usePipelineFilterStore((state) => state.searchTerm);
  const {
    data: leads,
    isLoading,
    isError,
    isFetching,
    isFetched,
  } = useQuery({
    queryKey: salesPipelineQueryKeys
      .getLeadsKey(columnId!)
      .concat(searchTerm ?? ""),
    queryFn: () => {
      if (columnId && searchTerm) {
        return getLeads({ columnId, searchTerm });
      } else if (columnId) {
        const take = defaultTakeLeads;
        const skip = 0;
        return getLeads({ columnId, take, skip });
      } else {
        return [];
      }
    },
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (searchTerm) {
      setHasMore(false);
    } else {
      setHasMore(true);
    }
  }, [searchTerm]);

  let transformedLeads: SalesLead[] = [];
  const queryClient = useQueryClient();

  const loaderRef = useRef<HTMLDivElement>(null);
  const [scrollLoading, setScrollLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const leadsLength = leads?.length ?? 0;

  const fetchMoreLeads = async () => {
    try {
      console.log("Fetching more leads data...");
      if (columnId) {
        const getNextLeads = await getLeads({
          columnId,
          take: defaultTakeLeads,
          skip: leadsLength,
        });
        if (getNextLeads?.length < defaultTakeLeads) {
          setHasMore(false);
        }
        queryClient.setQueryData<LeadWithSalesUser[]>(
          salesPipelineQueryKeys.getLeadsKey(columnId).concat(searchTerm ?? ""),
          (oldLeads) => [...(oldLeads ?? []), ...(getNextLeads ?? [])],
        );
      } else {
        throw new Error("Column not found");
      }
    } catch (err) {
      console.error("Error fetching more leads:", err);
      setHasMore(false);
    }
  };

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
  }, [fetchMoreLeads, scrollLoading, hasMore, leadsLength]);

  if ((isLoading || isFetching) && !isError) {
    transformedLeads = [];
    return (
      <div className="text-center">
        <div className="mx-auto h-6 w-6 animate-spin rounded-full border-4 border-dashed border-yellow-500"></div>
        <h2 className="mt-4 text-zinc-900 dark:text-white">Loading...</h2>
      </div>
    );
  } else if (!isLoading && isError) {
    errorToast(`${columnTitle} leads fetching failed, something went wrong`);
    transformedLeads = [];
  } else if (!isLoading && !isError && leads && leads?.length > 0) {
    transformedLeads = leads.map((lead) => ({
      leadId: lead.id,
      name: lead.clientName ?? "",
      email: lead.clientEmail ?? "",
      phone: lead.clientPhone ?? "",
      vehicle: lead.vehicleInfo ?? "",
      services: lead.services,
      source: lead.source,
      comments: lead.comments,
      createdAt: lead.createdAt,
      companyId: lead.companyId,
      columnId: lead.columnId ?? 0,
      assignedSalesUserId: lead.assignedSalesUserId ?? 0,
      salesUser: lead.salesUser,
      tasks: lead.tasks,
      client: lead?.client,
      isEstimateCreated: lead.isEstimateCreated,
      leadTags: lead.leadTags ?? [],
      totalMessage: lead.totalMessage,
    }));
  }
  return (
    <ul
      id="scrollableDiv"
      className="thin-scrollbar mt-1 flex max-h-[70vh] min-h-[70vh] flex-col gap-1 overflow-y-auto p-1"
      style={{ maxHeight: "70vh" }}
    >
      {children(transformedLeads)}
      {hasMore && !searchTerm && isFetched && (
        <div ref={loaderRef} className="text-center">
          <div className="mx-auto h-6 w-6 animate-spin rounded-full border-4 border-dashed border-yellow-500"></div>
          <h2 className="mt-4 text-zinc-900 dark:text-white">Loading...</h2>
        </div>
      )}
    </ul>
  );
}
