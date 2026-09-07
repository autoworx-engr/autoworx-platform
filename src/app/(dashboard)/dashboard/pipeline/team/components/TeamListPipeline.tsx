"use client";

import { getTeamWorkOrdersList } from "@/actions/pipelines/getTeamWorkOrdersList";
import {
  removeInvoiceTag,
  saveInvoiceTag,
} from "@/actions/pipelines/invoiceTag";
import { ShopLead, ShopPipelineData } from "@/types/invoiceLead";
import { useGetCurrentUser } from "@/utils/useGetCurrentUser";
import { EmployeeType, Tag } from "@prisma/client";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import DroppableColumn from "../../components/DroppableColumn";
import SearchScroll from "../../components/SearchScroll";

const PAGE_SIZE = 20;

interface TeamListPipelineProps {
  leads: ShopLead[];
  totalCount: number;
  hasMore: boolean;
  employeeType?: EmployeeType;
  isTechnician?: boolean;
}

const noop = () => {};
const asyncNoop = async () => {};

export default function TeamListPipeline({
  leads,
  totalCount,
  hasMore: initialHasMore,
  employeeType,
  isTechnician,
}: TeamListPipelineProps) {
  const currentUser = useGetCurrentUser();
  const searchParams = useSearchParams();
  const searchTerm = searchParams.get("search") ?? "";

  const [column, setColumn] = useState<ShopPipelineData>({
    id: null,
    title: "All Work Orders",
    leads,
    totalCount,
    hasMore: initialHasMore,
  });
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [openServiceDropdown, setOpenServiceDropdown] = useState<{
    [key: string]: boolean;
  }>({});
  const [screenWidth, setScreenWidth] = useState(0);

  const columnRef = useRef<HTMLDivElement | null>(null);
  const leadRefs = useRef<Map<string, HTMLLIElement>>(new Map());
  const isFetchingRef = useRef(false);

  useEffect(() => {
    const updateWidth = () => setScreenWidth(window.innerWidth);
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  // A fresh server render (search / type change) resets the list
  useEffect(() => {
    setColumn({
      id: null,
      title: "All Work Orders",
      leads,
      totalCount,
      hasMore: initialHasMore,
    });
    setHasMore(initialHasMore);
    leadRefs.current = new Map();
  }, [leads, totalCount, initialHasMore]);

  const loadMore = useCallback(async () => {
    if (isFetchingRef.current || !hasMore) return;
    isFetchingRef.current = true;
    setIsLoadingMore(true);

    try {
      const result = await getTeamWorkOrdersList(
        column.leads.length,
        PAGE_SIZE,
        employeeType,
        isTechnician ? Number(currentUser?.id) : undefined,
        searchTerm || undefined,
      );
      setColumn((prev) => ({
        ...prev,
        leads: [...prev.leads, ...result.leads],
        totalCount: result.total,
      }));
      setHasMore(result.hasMore);
    } catch {
      // leave the list as-is; the sentinel stays and can retry on next scroll
    } finally {
      isFetchingRef.current = false;
      setIsLoadingMore(false);
    }
  }, [
    column.leads.length,
    hasMore,
    employeeType,
    isTechnician,
    currentUser,
    searchTerm,
  ]);

  const handleTagSelect = async (
    _categoryIndex: number,
    leadIndex: number,
    selectedTag: Tag | undefined,
  ) => {
    if (!selectedTag) return;
    const lead = column.leads[leadIndex];
    const result = await saveInvoiceTag(lead.invoiceId, selectedTag.id);
    if (!result) return;

    setColumn((prev) => {
      const nextLeads = [...prev.leads];
      nextLeads[leadIndex] = {
        ...nextLeads[leadIndex],
        tags: [
          ...nextLeads[leadIndex].tags,
          { id: selectedTag.id, tag: selectedTag },
        ],
      };
      return { ...prev, leads: nextLeads };
    });
  };

  const handleTagRemove = async (
    _categoryIndex: number,
    leadIndex: number,
    tagToRemove: Tag,
  ) => {
    const lead = column.leads[leadIndex];
    const result = await removeInvoiceTag(lead.invoiceId, tagToRemove.id);
    if (!result) return;

    setColumn((prev) => {
      const nextLeads = [...prev.leads];
      nextLeads[leadIndex] = {
        ...nextLeads[leadIndex],
        tags: nextLeads[leadIndex].tags.filter(
          (t) => t.tag.id !== tagToRemove.id,
        ),
      };
      return { ...prev, leads: nextLeads };
    });
  };

  const handleServiceDropdownToggle = (
    _categoryIndex: number,
    leadIndex: number,
  ) => {
    const key = `0-${leadIndex}`;
    setOpenServiceDropdown((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <>
      <div className="mb-4 px-2">
        <SearchScroll
          pipelineData={[column]}
          isTeamPipeline={true}
          employeeType={employeeType}
        />
      </div>

      {column.leads.length === 0 ? (
        <div className="flex h-64 w-full flex-col items-center justify-center gap-2 text-center">
          <p className="text-lg font-semibold text-gray-500">
            No work orders found
          </p>
          <p className="text-sm text-gray-400">
            Nothing is assigned to the team for this filter yet.
          </p>
        </div>
      ) : (
        <div className="h-full w-full px-2">
          <DroppableColumn
            fullWidth
            isTeamPipeline={true}
            setColumnRef={(el) => {
              columnRef.current = el;
            }}
            categoryIndex={0}
            item={column}
            pipelineData={[column]}
            pipelineType="Team Pipelines"
            screenWidth={screenWidth}
            leadRefs={leadRefs}
            isTechnician={isTechnician}
            searchTerm={searchTerm}
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
            onLoadMore={loadMore}
            openServiceDropdown={openServiceDropdown}
            handleServiceDropdownToggle={handleServiceDropdownToggle}
            handleTagSelect={handleTagSelect}
            handleTagRemove={handleTagRemove}
            tagDropdownStates={{}}
            handleTagDropdownToggle={noop}
            openDropdownIndex={null}
            handleDropdownToggle={noop}
            setOpenDropdownIndex={noop}
            createEmployeeSelectHandler={() => noop}
            companyUsers={[]}
            showColumnSelect={{}}
            setShowColumnSelect={noop}
            columnDropdownOpen={{}}
            setColumnDropdownOpen={noop}
            handleColumnDropdownToggle={noop}
            handleColumnChange={asyncNoop}
          />
        </div>
      )}
    </>
  );
}
