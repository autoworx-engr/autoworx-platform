import { Employee, ShopPipelineData } from "@/types/invoiceLead";
import { autoScrollForElements } from "@atlaskit/pragmatic-drag-and-drop-auto-scroll/element";
import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { Tag, User } from "@prisma/client";
import { SetStateAction, useEffect, useRef, useState } from "react";
import DraggableLead from "./DraggableLead";

type DroppableColumnProps = {
  setColumnRef: (el: HTMLDivElement | null) => void;
  item: ShopPipelineData;
  openDropdownIndex?: { category: number; index: number } | null;
  tagDropdownStates: { [key: string]: boolean };
  openServiceDropdown: { [key: string]: boolean };
  isTeamPipeline?: boolean;
  screenWidth: number;
  categoryIndex: number;
  leadRefs: React.MutableRefObject<Map<string, HTMLLIElement>>;
  handleColumnDropdownToggle: (
    categoryIndex: number,
    leadIndex: number,
  ) => void;
  pipelineType: string;
  isDropdownOpen?: boolean;
  handleDropdownToggle: (categoryIndex: number, leadIndex: number) => void;
  createEmployeeSelectHandler: (
    categoryIndex: number,
    leadIndex: number,
  ) => (value: SetStateAction<Employee | null>) => void;
  companyUsers: User[];
  setOpenDropdownIndex: (
    value: SetStateAction<{
      category: number;
      index: number;
    } | null>,
  ) => void;
  showColumnSelect: { [key: string]: boolean };
  pipelineData: ShopPipelineData[];
  handleColumnChange: (
    categoryIndex: number,
    leadIndex: number,
    newColumnId: string,
  ) => Promise<void>;
  setShowColumnSelect: (
    value: SetStateAction<{
      [key: string]: boolean;
    }>,
  ) => void;
  setColumnDropdownOpen: (
    value: SetStateAction<{
      [key: string]: boolean;
    }>,
  ) => void;
  columnDropdownOpen: { [key: string]: boolean };
  handleTagRemove: (
    categoryIndex: number,
    leadIndex: number,
    tagToRemove: Tag,
  ) => Promise<void>;
  handleTagDropdownToggle: (categoryIndex: number, leadIndex: number) => void;
  handleTagSelect: (
    categoryIndex: number,
    leadIndex: number,
    selectedTag: Tag | undefined,
  ) => Promise<void>;
  handleServiceDropdownToggle: (
    categoryIndex: number,
    leadIndex: number,
  ) => void;
  isTechnician: boolean | undefined;
  setSelectedClientId?: (value: SetStateAction<number | null>) => void;
  setSelectedVehicleId?: (value: SetStateAction<number | null>) => void;
  setSelectedAppointmentId?: (value: SetStateAction<number | null>) => void;
  setIsAppointmentModalOpen?: (value: SetStateAction<boolean>) => void;
  searchTerm?: string;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
};

const DroppableColumn = ({
  setColumnRef,
  categoryIndex,
  item,
  openDropdownIndex,
  tagDropdownStates,
  openServiceDropdown,
  screenWidth,
  leadRefs,
  handleColumnDropdownToggle,
  pipelineType,
  handleDropdownToggle,
  createEmployeeSelectHandler,
  companyUsers,
  setOpenDropdownIndex,
  showColumnSelect,
  pipelineData,
  handleColumnChange,
  setShowColumnSelect,
  setColumnDropdownOpen,
  columnDropdownOpen,
  handleTagRemove,
  handleTagDropdownToggle,
  handleTagSelect,
  handleServiceDropdownToggle,
  isTechnician,
  setSelectedClientId,
  setSelectedVehicleId,
  setSelectedAppointmentId,
  setIsAppointmentModalOpen,
  searchTerm,
  isTeamPipeline = false,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
}: DroppableColumnProps) => {
  const columnRef = useRef<HTMLDivElement | null>(null);
  const ulRef = useRef<HTMLUListElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const onLoadMoreRef = useRef(onLoadMore);
  const [isDraggedOver, setIsDraggedOver] = useState(false);

  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  useEffect(() => {
    const element = columnRef.current;
    if (!element) return;

    return dropTargetForElements({
      element,
      getData: () => ({ columnIndex: categoryIndex }),
      onDragEnter: () => setIsDraggedOver(true),
      onDragLeave: () => setIsDraggedOver(false),
      onDrop: () => setIsDraggedOver(false),
    });
  }, [categoryIndex]);

  useEffect(() => {
    const ulElement = ulRef.current;
    if (!ulElement || screenWidth < 768) return;

    return autoScrollForElements({ element: ulElement });
  }, [screenWidth]);

  // Infinite scroll — watch sentinel at bottom of column list
  useEffect(() => {
    if (!hasMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) onLoadMoreRef.current?.();
      },
      { root: ulRef.current, rootMargin: "50px", threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore]);

  return (
    <div
      ref={(el) => {
        columnRef.current = el;
        setColumnRef(el);
      }}
      className={`mx-2 w-full max-w-md flex-shrink-0 rounded-md border sm:min-w-80 sm:flex-1 lg:min-w-[calc(100%/3-1.5rem)] xl:min-w-[calc(100%/4-1.5rem)] 2xl:min-w-[calc(100%/6-1.5rem)] ${isDraggedOver ? "ring-2 ring-blue-50" : ""}`}
      style={{
        backgroundColor: "rgba(101, 113, 255, 0.15)",
        padding: "0",
      }}
    >
      <h2 className="rounded-lg bg-primary px-4 py-3 text-center text-white">
        <p className="text-base font-bold">
          {item.title || ""}
          <span className="ml-2 rounded-lg bg-[#3F49B9] px-2">
            {item.totalCount ?? item.leads.length}
          </span>
        </p>
      </h2>

      <ul
        ref={ulRef}
        className="mt-1 flex max-h-[65vh] min-h-[65vh] flex-col gap-1 overflow-y-auto p-1"
        style={{ maxHeight: "65vh" }}
      >
        {item.leads.map((lead, leadIndex) => {
          const key = `${categoryIndex}-${leadIndex}`;
          const isDropdownOpen =
            openDropdownIndex?.category === categoryIndex &&
            openDropdownIndex.index === leadIndex;
          const isTagDropdownOpen = tagDropdownStates[key];
          const isServiceDropdownOpen = openServiceDropdown[key] || false;
          const selectedEmployee = lead.assignedTo;

          return (
            <DraggableLead
              key={leadIndex}
              screenWidth={screenWidth}
              categoryIndex={categoryIndex}
              leadIndex={leadIndex}
              lead={lead}
              userId={Number(item.id)}
              leadRefs={leadRefs}
              isTeamPipeline={isTeamPipeline}
              handleColumnDropdownToggle={handleColumnDropdownToggle}
              pipelineType={pipelineType}
              isDropdownOpen={isDropdownOpen}
              handleDropdownToggle={handleDropdownToggle}
              selectedEmployee={selectedEmployee}
              createEmployeeSelectHandler={createEmployeeSelectHandler}
              companyUsers={companyUsers}
              setOpenDropdownIndex={setOpenDropdownIndex}
              showColumnSelect={showColumnSelect}
              pipelineData={pipelineData}
              handleColumnChange={handleColumnChange}
              setShowColumnSelect={setShowColumnSelect}
              setColumnDropdownOpen={setColumnDropdownOpen}
              columnDropdownOpen={columnDropdownOpen}
              handleTagRemove={handleTagRemove}
              handleTagDropdownToggle={handleTagDropdownToggle}
              isTagDropdownOpen={isTagDropdownOpen}
              handleTagSelect={handleTagSelect}
              isServiceDropdownOpen={isServiceDropdownOpen}
              handleServiceDropdownToggle={handleServiceDropdownToggle}
              isTechnician={isTechnician}
              setSelectedClientId={setSelectedClientId}
              setSelectedVehicleId={setSelectedVehicleId}
              setSelectedAppointmentId={setSelectedAppointmentId}
              setIsAppointmentModalOpen={setIsAppointmentModalOpen}
              searchTerm={searchTerm}
            />
          );
        })}

        {hasMore && (
          <div
            ref={sentinelRef}
            className="flex items-center justify-center py-3"
          >
            {isLoadingMore ? (
              <div className="text-center">
                <div className="mx-auto h-6 w-6 animate-spin rounded-full border-4 border-dashed border-yellow-500"></div>
                <h2 className="mt-4 text-zinc-900 dark:text-white">
                  Loading...
                </h2>
              </div>
            ) : (
              <span className="text-xs text-gray-400">
                {item.leads.length} of {item.totalCount} loaded
              </span>
            )}
          </div>
        )}
      </ul>
    </div>
  );
};

export default DroppableColumn;
