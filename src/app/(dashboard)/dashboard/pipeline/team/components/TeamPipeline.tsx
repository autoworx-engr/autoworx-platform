"use client";
import { getEmployees } from "@/actions/employee/get";
import { updateInvoiceStatus } from "@/actions/estimate/invoice/updateInvoiceStatus";
import { updateTechnicianStatustoComplete } from "@/actions/estimate/invoice/updateTechnicianStatustoComplete";
import { updateAssignedTo } from "@/actions/pipelines/getWorkOrders";
import { getWorkOrdersByTechnician } from "@/actions/pipelines/getWorkOrdersPaginated";
import {
  removeInvoiceTag,
  saveInvoiceTag,
} from "@/actions/pipelines/invoiceTag";
import { errorToast, successToast } from "@/lib/toast";
import { updateTagAutomationTrigger } from "@/service/tag-automation-trigger/api";
import { Employee, ShopPipelineData } from "@/types/invoiceLead";
import { useGetCurrentUser } from "@/utils/useGetCurrentUser";
import { autoScrollForElements } from "@atlaskit/pragmatic-drag-and-drop-auto-scroll/element";
import { monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { EmployeeType, Tag, User } from "@prisma/client";
import { useRouter, useSearchParams } from "next/navigation";
import {
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import toast from "react-hot-toast";
import DroppableColumn from "../../components/DroppableColumn";
import PipelineLoadingSkeleton from "../../components/PipelineLoadingSkeleton";
import SearchScroll from "../../components/SearchScroll";

const PIPELINE_PAGE_SIZE = 10;

interface PipelinesProps {
  pipelinesTitle: string;
  columns?: User[];
  shopPipelineDataProp: ShopPipelineData[];
  loading?: boolean;
  isTechnician?: boolean;
  employeeType?: EmployeeType;
}

type ColumnMeta = {
  hasMore: boolean;
  loadedCount: number;
  isLoading: boolean;
};

export default function TeamPipelines({
  pipelinesTitle: pipelineType,
  columns,
  loading = false,
  shopPipelineDataProp,
  isTechnician,
  employeeType,
}: PipelinesProps) {
  const router = useRouter();

  const [pipelineData, setPipelineData] =
    useState<ShopPipelineData[]>(shopPipelineDataProp);
  const [companyUsers, setCompanyUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const columnRefs = useRef<(HTMLDivElement | null)[]>([]);
  const leadRefs = useRef<Map<string, HTMLLIElement>>(new Map());
  const dragDropContextRef = useRef<HTMLDivElement | null>(null);
  const loadingColumnsRef = useRef<Set<number>>(new Set());
  const [screenWidth, setScreenWidth] = useState<number>(window.innerWidth);

  const currentUser = useGetCurrentUser();
  const urlSearchParams = useSearchParams();
  const searchTerm = urlSearchParams.get("search") ?? "";
  const searchTermRef = useRef(searchTerm);
  useEffect(() => {
    searchTermRef.current = searchTerm;
  }, [searchTerm]);
  const [selectedSearchColumnId, setSelectedSearchColumnId] = useState<
    number | null
  >(null);

  // Per-column pagination metadata keyed by technician id (column id)
  const [columnMeta, setColumnMeta] = useState<Record<number, ColumnMeta>>(
    () => {
      const initial: Record<number, ColumnMeta> = {};
      for (const col of shopPipelineDataProp) {
        if (col.id !== null) {
          initial[col.id] = {
            hasMore: col.hasMore ?? false,
            loadedCount: col.leads.length,
            isLoading: false,
          };
        }
      }
      return initial;
    },
  );

  function updateWidth() {
    setScreenWidth(window.innerWidth);
  }

  useEffect(() => {
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  useEffect(() => {
    setPipelineData(shopPipelineDataProp);
    columnRefs.current = new Array(shopPipelineDataProp.length).fill(null);
    leadRefs.current = new Map();
    setIsLoading(false);

    const meta: Record<number, ColumnMeta> = {};
    for (const col of shopPipelineDataProp) {
      if (col.id !== null) {
        meta[col.id] = {
          hasMore: col.hasMore ?? false,
          loadedCount: col.leads.length,
          isLoading: false,
        };
      }
    }
    setColumnMeta(meta);
  }, [shopPipelineDataProp]);

  useEffect(() => {
    const fetchCompanyUsers = async () => {
      const fetchedCompanyUsers = await getEmployees({
        excludeCurrentUser: true,
        notType: "Sales",
      });
      setCompanyUsers(fetchedCompanyUsers);
      setIsLoading(false);
    };
    fetchCompanyUsers();
  }, [router]);

  const loadMoreForColumn = useCallback(
    async (columnIndex: number) => {
      const column = pipelineData[columnIndex];
      if (!column?.id) return;

      const meta = columnMeta[column.id];
      if (!meta?.hasMore) return;

      if (loadingColumnsRef.current.has(column.id)) return;
      loadingColumnsRef.current.add(column.id);

      setColumnMeta((prev) => ({
        ...prev,
        [column.id!]: { ...prev[column.id!], isLoading: true },
      }));

      try {
        const result = await getWorkOrdersByTechnician(
          column.id,
          meta.loadedCount,
          PIPELINE_PAGE_SIZE,
          isTechnician ? Number(currentUser?.id) : undefined,
          searchTermRef.current || undefined,
        );

        setPipelineData((prev) => {
          const next = [...prev];
          next[columnIndex] = {
            ...next[columnIndex],
            leads: [...next[columnIndex].leads, ...result.leads],
          };
          return next;
        });

        setColumnMeta((prev) => ({
          ...prev,
          [column.id!]: {
            hasMore: result.hasMore,
            loadedCount: meta.loadedCount + result.leads.length,
            isLoading: false,
          },
        }));
      } catch {
        setColumnMeta((prev) => ({
          ...prev,
          [column.id!]: { ...prev[column.id!], isLoading: false },
        }));
      } finally {
        loadingColumnsRef.current.delete(column.id);
      }
    },
    [pipelineData, columnMeta, isTechnician, currentUser],
  );

  // Filter pipeline data: search is server-side; only apply client-side column visibility filter
  const filteredPipelineData = useMemo(() => {
    if (selectedSearchColumnId === null) return pipelineData;
    return pipelineData.map((column) =>
      column.id !== selectedSearchColumnId ? { ...column, leads: [] } : column,
    );
  }, [pipelineData, selectedSearchColumnId]);

  const [selectedEmployees, setSelectedEmployees] = useState<{
    [key: string]: Employee | null;
  }>({});
  const [openDropdownIndex, setOpenDropdownIndex] = useState<{
    category: number;
    index: number;
  } | null>(null);

  const [tag, setTag] = useState<Tag>();
  const [tagDropdownStates, setTagDropdownStates] = useState<{
    [key: string]: boolean;
  }>({});

  const [openServiceDropdown, setOpenServiceDropdown] = useState<{
    [key: string]: boolean;
  }>({});

  const [showColumnSelect, setShowColumnSelect] = useState<{
    [key: string]: boolean;
  }>({});

  const [columnDropdownOpen, setColumnDropdownOpen] = useState<{
    [key: string]: boolean;
  }>({});

  const handleSearchResult = useCallback(
    (result: { columnIndex: number; leadIndex: number } | null) => {
      if (!result) return;

      const { columnIndex, leadIndex } = result;

      if (columnRefs.current[columnIndex]) {
        columnRefs.current[columnIndex]?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "start",
        });

        setTimeout(() => {
          const leadKey = `${columnIndex}-${leadIndex}`;
          const leadElement = leadRefs.current.get(leadKey);

          if (leadElement) {
            leadElement.scrollIntoView({
              behavior: "smooth",
              block: "nearest",
            });

            leadElement.classList.add(
              "bg-yellow-200",
              "border-yellow-300",
              "scale-[1.02]",
              "transition-transform",
            );
            setTimeout(() => {
              leadElement.classList.remove(
                "bg-yellow-200",
                "border-yellow-300",
                "scale-[1.02]",
                "transition-transform",
              );
            }, 2000);
          }
        }, 300);
      }
    },
    [],
  );

  const handleDropdownToggle = (categoryIndex: number, leadIndex: number) => {
    if (
      openDropdownIndex?.category === categoryIndex &&
      openDropdownIndex.index === leadIndex
    ) {
      setOpenDropdownIndex(null);
    } else {
      setOpenDropdownIndex({ category: categoryIndex, index: leadIndex });
    }
  };

  const createEmployeeSelectHandler =
    (categoryIndex: number, leadIndex: number) =>
    async (value: SetStateAction<Employee | null>) => {
      const key = `${categoryIndex}-${leadIndex}`;
      const resolvedValue =
        typeof value === "function" ? value(selectedEmployees[key]) : value;

      setSelectedEmployees((prevState) => ({
        ...prevState,
        [key]: resolvedValue,
      }));

      setOpenDropdownIndex(null);

      const invoiceId = pipelineData[categoryIndex].leads[leadIndex].invoiceId;

      if (resolvedValue && resolvedValue.id) {
        try {
          const response = await updateAssignedTo(invoiceId, resolvedValue.id);
          if (response.success) {
            const updatedPipelineData = [...pipelineData];
            updatedPipelineData[categoryIndex].leads[leadIndex].assignedTo =
              resolvedValue;
            setPipelineData(updatedPipelineData);
          } else {
            console.error("Failed to update assigned employee");
          }
        } catch (error) {
          console.error("Error updating assigned employee:", error);
        }
      } else {
        console.error("No employee selected");
      }
    };

  const handleTagDropdownToggle = (
    categoryIndex: number,
    leadIndex: number,
  ) => {
    const key = `${categoryIndex}-${leadIndex}`;
    setTagDropdownStates((prevState) => ({
      ...prevState,
      [key]: !prevState[key],
    }));
  };

  const handleTagSelect = async (
    categoryIndex: number,
    leadIndex: number,
    selectedTag: Tag | undefined,
  ) => {
    if (selectedTag) {
      const invoiceId = pipelineData[categoryIndex].leads[leadIndex].invoiceId;
      try {
        const result = await saveInvoiceTag(invoiceId, selectedTag.id);
        if (result) {
          const updatedPipelineData = [...pipelineData];
          updatedPipelineData[categoryIndex].leads[leadIndex].tags.push({
            id: selectedTag.id,
            tag: selectedTag,
          });
          setPipelineData(updatedPipelineData);

          updateTagAutomationTrigger({
            columnId: result?.invoice?.columnId!,
            companyId: result?.invoice?.companyId,
            pipelineType: "SHOP",
            tagId: selectedTag?.id,
            invoiceId: result?.invoiceId,
          });
        }
      } catch (error) {
        console.error("Error saving tag:", error);
      }
    }
  };

  const handleTagRemove = async (
    categoryIndex: number,
    leadIndex: number,
    tagToRemove: Tag,
  ) => {
    const invoiceId = pipelineData[categoryIndex].leads[leadIndex].invoiceId;

    try {
      const result = await removeInvoiceTag(invoiceId, tagToRemove.id);

      if (result) {
        const updatedPipelineData = [...pipelineData];
        updatedPipelineData[categoryIndex].leads[leadIndex].tags =
          updatedPipelineData[categoryIndex].leads[leadIndex].tags.filter(
            (tag) => tag.tag.id !== tagToRemove.id,
          );
        setPipelineData(updatedPipelineData);
      }
    } catch (error) {
      console.error("Error removing tag:", error);
    }
  };

  const handleServiceDropdownToggle = (
    categoryIndex: number,
    leadIndex: number,
  ) => {
    const key = `${categoryIndex}-${leadIndex}`;
    setOpenServiceDropdown((prevState) => ({
      ...prevState,
      [key]: !prevState[key],
    }));
  };

  const handleColumnDropdownToggle = (
    categoryIndex: number,
    leadIndex: number,
  ) => {
    const key = `${categoryIndex}-${leadIndex}`;
    setShowColumnSelect((prevState) => ({
      ...prevState,
      [key]: !prevState[key],
    }));
    setColumnDropdownOpen((prevState) => ({
      ...prevState,
      [key]: !prevState[key],
    }));
  };

  const handleColumnChange = async (
    categoryIndex: number,
    leadIndex: number,
    newColumnId: string,
  ) => {
    const key = `${categoryIndex}-${leadIndex}`;
    const lead = pipelineData[categoryIndex].leads[leadIndex];

    if (!newColumnId || newColumnId === categoryIndex.toString()) {
      setShowColumnSelect((prev) => ({ ...prev, [key]: false }));
      setColumnDropdownOpen((prev) => ({ ...prev, [key]: false }));
      return;
    }

    try {
      const destinationColumnIndex = parseInt(newColumnId);
      const sourceColumn = pipelineData[categoryIndex];
      const destinationColumn = pipelineData[destinationColumnIndex];

      if (destinationColumn && destinationColumn.title === "Delivered") {
        const completed = lead?.services?.incomplete?.length === 0;
        if (!completed && lead?.technicians?.length > 0) {
          toast.error(
            "All services must be completed by Technicians before moving to delivered.",
          );
          return;
        }
        if (lead.dueBalance !== 0) {
          toast.error("Please clear due balance before moving to delivered.");
          return;
        }
      }

      const sourceItems = [...sourceColumn.leads];
      const destinationItems = [...destinationColumn.leads];
      const [movedLead] = sourceItems.splice(leadIndex, 1);
      destinationItems.push(movedLead);

      const updatedData = pipelineData.map((column, index) => {
        if (index === categoryIndex) {
          return { ...column, leads: sourceItems };
        } else if (index === destinationColumnIndex) {
          return { ...column, leads: destinationItems };
        }
        return column;
      });

      setPipelineData(updatedData);

      const newStatusId = destinationColumn.id;
      if (newStatusId !== null) {
        const response = await updateInvoiceStatus(lead.invoiceId, newStatusId);
        if (response.type === "success") {
          toast.success("Job moved successfully");

          if (destinationColumn.title === "Delivered") {
            await updateTechnicianStatustoComplete(lead.invoiceId);
          }
        } else {
          toast.error("Failed to move job. Please try again.");
          setPipelineData(pipelineData);
        }
      }

      setShowColumnSelect((prev) => ({ ...prev, [key]: false }));
      setColumnDropdownOpen((prev) => ({ ...prev, [key]: false }));
    } catch (error) {
      toast.error("Failed to move lead. Please try again.");
      console.error("Error moving lead:", error);
    }
  };

  useEffect(() => {
    return monitorForElements({
      onDrop({ source, location }) {
        const destination = location.current.dropTargets[0];
        if (!destination) return;

        const sourceData = source.data as {
          columnIndex: number;
          leadIndex: number;
          invoiceId: number;
        };
        const destData = destination.data as {
          columnIndex: number;
          index?: number;
        };

        const sourceColIdx = sourceData.columnIndex;
        const destColIdx = destData.columnIndex;
        const sourceLeadIdx = sourceData.leadIndex;
        const destLeadIdx = destData.index ?? 0;

        if (sourceColIdx === destColIdx && sourceLeadIdx === destLeadIdx)
          return;

        setPipelineData((prevData) => {
          const newData = [...prevData];
          const sourceColumn = {
            ...newData[sourceColIdx],
            leads: [...newData[sourceColIdx].leads],
          };
          const [removed] = sourceColumn.leads.splice(sourceLeadIdx, 1);

          const destinationColumn = newData[destColIdx];
          if (destinationColumn.title === "Delivered") {
            const completed = removed?.services?.incomplete?.length === 0;
            const hasDue = removed.dueBalance !== 0;

            if ((!completed && removed?.technicians?.length > 0) || hasDue) {
              if (hasDue)
                toast.error(
                  "Please clear due balance before moving to delivered.",
                );
              else
                toast.error(
                  "All services must be completed before moving to delivered.",
                );
              return prevData;
            }

            updateTechnicianStatustoComplete(removed.invoiceId).catch(
              console.error,
            );
          }

          if (sourceColIdx === destColIdx) {
            sourceColumn.leads.splice(destLeadIdx, 0, removed);
            newData[sourceColIdx] = sourceColumn;
          } else {
            const destColumn = {
              ...newData[destColIdx],
              leads: [...newData[destColIdx].leads],
            };
            destColumn.leads.splice(destLeadIdx, 0, removed);
            newData[sourceColIdx] = sourceColumn;
            newData[destColIdx] = destColumn;

            const newStatusId = destColumn.id;
            if (newStatusId) {
              updateInvoiceStatus(removed.invoiceId, newStatusId)
                .then((res) =>
                  res.type === "success"
                    ? successToast("Job moved successfully")
                    : errorToast("Update failed"),
                )
                .catch(() => errorToast("Failed to update status"));
            }
          }

          return newData;
        });
      },
    });
  }, []);

  useEffect(() => {
    const scrollContainer = dragDropContextRef.current;
    if (!scrollContainer || screenWidth < 768) return;

    return autoScrollForElements({
      element: scrollContainer,
    });
  }, [screenWidth]);

  return (
    <>
      <div className="mb-4 px-2">
        <SearchScroll
          pipelineData={filteredPipelineData}
          onSearchResult={handleSearchResult}
          onColumnChange={(colId) => setSelectedSearchColumnId(colId)}
          isTeamPipeline={true}
        />
      </div>

      {loading || isLoading ? (
        <PipelineLoadingSkeleton />
      ) : filteredPipelineData.length === 0 ? (
        <div className="flex h-64 w-full flex-col items-center justify-center gap-2 text-center">
          <p className="text-lg font-semibold text-gray-500">
            No results found
          </p>
          <p className="text-sm text-gray-400">
            There are no team members assigned to this role yet.
          </p>
        </div>
      ) : (
        <div className="h-full w-full overflow-hidden px-2">
          <div
            ref={dragDropContextRef}
            className="thin-scrollbar flex touch-pan-x snap-x snap-mandatory flex-nowrap justify-start gap-2 overflow-x-auto"
          >
            {filteredPipelineData.map((item, categoryIndex) => (
              <DroppableColumn
                isTeamPipeline={true}
                key={categoryIndex}
                setColumnRef={(el) => {
                  columnRefs.current[categoryIndex] = el;
                }}
                categoryIndex={categoryIndex}
                item={item}
                openDropdownIndex={openDropdownIndex}
                tagDropdownStates={tagDropdownStates}
                openServiceDropdown={openServiceDropdown}
                screenWidth={screenWidth}
                leadRefs={leadRefs}
                handleColumnDropdownToggle={handleColumnDropdownToggle}
                pipelineType={pipelineType}
                handleDropdownToggle={handleDropdownToggle}
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
                handleTagSelect={handleTagSelect}
                handleServiceDropdownToggle={handleServiceDropdownToggle}
                isTechnician={isTechnician}
                searchTerm={searchTerm}
                hasMore={
                  item.id !== null
                    ? (columnMeta[item.id]?.hasMore ?? false)
                    : false
                }
                isLoadingMore={
                  item.id !== null
                    ? (columnMeta[item.id]?.isLoading ?? false)
                    : false
                }
                onLoadMore={() => loadMoreForColumn(categoryIndex)}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
