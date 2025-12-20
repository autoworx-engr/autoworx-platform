import { SetStateAction, useEffect, useRef, useState } from "react";
import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { autoScrollForElements } from "@atlaskit/pragmatic-drag-and-drop-auto-scroll/element";
import { Employee, ShopLead, ShopPipelineData } from "@/types/invoiceLead";
import { Tag, User } from "@prisma/client";
import DraggableLead from "./DraggableLead";
type DroppableColumnProps = {
  columnRefs: React.MutableRefObject<Array<HTMLDivElement | null>>;
  item: ShopPipelineData;
  openDropdownIndex?: { category: number; index: number } | null;
  tagDropdownStates: { [key: string]: boolean };
  openServiceDropdown: { [key: string]: boolean };

  // for the child components, e.g., DraggableLead
  screenWidth: number;
  categoryIndex: number;
  leadRefs: React.MutableRefObject<Map<string, HTMLLIElement>>;
  handleColumnDropdownToggle: (
    categoryIndex: number,
    leadIndex: number
  ) => void;
  pipelineType: string;
  isDropdownOpen?: boolean;
  handleDropdownToggle: (categoryIndex: number, leadIndex: number) => void;

  createEmployeeSelectHandler: (
    categoryIndex: number,
    leadIndex: number
  ) => (value: SetStateAction<Employee | null>) => void;
  companyUsers: User[];
  setOpenDropdownIndex: (
    value: SetStateAction<{
      category: number;
      index: number;
    } | null>
  ) => void;

  showColumnSelect: { [key: string]: boolean };
  pipelineData: ShopPipelineData[];
  handleColumnChange: (
    categoryIndex: number,
    leadIndex: number,
    newColumnId: string
  ) => Promise<void>;
  setShowColumnSelect: (
    value: SetStateAction<{
      [key: string]: boolean;
    }>
  ) => void;
  setColumnDropdownOpen: (
    value: SetStateAction<{
      [key: string]: boolean;
    }>
  ) => void;
  columnDropdownOpen: { [key: string]: boolean };
  handleTagRemove: (
    categoryIndex: number,
    leadIndex: number,
    tagToRemove: Tag
  ) => Promise<void>;
  handleTagDropdownToggle: (categoryIndex: number, leadIndex: number) => void;

  handleTagSelect: (
    categoryIndex: number,
    leadIndex: number,
    selectedTag: Tag | undefined
  ) => Promise<void>;
  handleServiceDropdownToggle: (
    categoryIndex: number,
    leadIndex: number
  ) => void;
  isTechnician: boolean | undefined;
  setSelectedClientId: (value: SetStateAction<number | null>) => void;
  setSelectedVehicleId: (value: SetStateAction<number | null>) => void;
  setIsAppointmentModalOpen: (value: SetStateAction<boolean>) => void;
};
const DroppableColumn = ({
  columnRefs,
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
  setIsAppointmentModalOpen,
}: DroppableColumnProps) => {
  const columnRef = useRef<HTMLDivElement | null>(null);
  const ulRef = useRef<HTMLUListElement | null>(null);
  const [isDraggedOver, setIsDraggedOver] = useState(false);

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
  return (
    <div
      ref={(el) => {
        columnRefs.current[categoryIndex] = el;
        if (columnRef.current !== el) {
          columnRef.current = el;
        }
      }}
      className={`mx-2 w-[calc(100vw-2rem)] flex-shrink-0 rounded-md border sm:min-w-80 sm:flex-1 lg:min-w-[calc(100%/3-1.5rem)] xl:min-w-[calc(100%/4-1.5rem)] 2xl:min-w-[calc(100%/6-1.5rem)] ${isDraggedOver ? "ring-2 ring-blue-50" : ""}`}
      style={{
        backgroundColor: "rgba(101, 113, 255, 0.15)",
        padding: "0",
      }}
    >
      <h2 className="rounded-lg bg-[#6571FF] px-4 py-3 text-center text-white">
        <p className="text-base font-bold">
          {item.title || ""}
          <span className="ml-2 rounded-lg bg-[#3F49B9] px-2">
            {item.leads.length}
          </span>
        </p>
      </h2>

      <ul
        ref={ulRef}
        className="thin-scrollbar mt-1 flex max-h-[70vh] min-h-[70vh] flex-col gap-1 overflow-y-auto p-1"
        style={{ maxHeight: "70vh" }}
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
              screenWidth={screenWidth}
              categoryIndex={categoryIndex}
              leadIndex={leadIndex}
              lead={lead}
              leadRefs={leadRefs}
              handleColumnDropdownToggle={handleColumnDropdownToggle}
              pipelineType={pipelineType}
              isDropdownOpen={isDropdownOpen}
              handleDropdownToggle={handleDropdownToggle}
              selectedEmployee={selectedEmployee} // from parent component
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
              isTagDropdownOpen={isTagDropdownOpen} // from parent component
              handleTagSelect={handleTagSelect}
              isServiceDropdownOpen={isServiceDropdownOpen} // from parent component
              handleServiceDropdownToggle={handleServiceDropdownToggle}
              isTechnician={isTechnician}
              setSelectedClientId={setSelectedClientId}
              setSelectedVehicleId={setSelectedVehicleId}
              setIsAppointmentModalOpen={setIsAppointmentModalOpen}
            />
          );
        })}
      </ul>
    </div>
  );
};

export default DroppableColumn;
