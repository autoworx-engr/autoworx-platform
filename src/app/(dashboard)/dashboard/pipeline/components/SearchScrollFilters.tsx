"use client";

import { useDebounce } from "@/hooks/useDebounce";
import { useEmployeeFilterOptions } from "@/hooks/pipeline/useEmployeeFilterOptions";
import { EmployeeType } from "@prisma/client";
import { ArrowDown, ArrowUp } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import PipelineFilterDropdown, { FilterOption } from "./PipelineFilterDropdown";

const EMPLOYEE_TYPES: EmployeeType[] = [
  "Admin",
  "Manager",
  "Sales",
  "Technician",
  "Other",
];

export type SelectedEmployee = {
  id: number;
  firstName: string;
  lastName: string | null;
};

interface SearchScrollFiltersProps {
  pipelineData: any[];
  isTeamPipeline: boolean;
  selectedColumnId: number | null;
  onSelectColumn: (columnId: number | null) => void;
  /** Resolved server-side so the button can name a selection that isn't on a loaded page */
  selectedEmployee?: SelectedEmployee | null;
  resultCount: number;
  currentResultIndex: number;
  onPrevResult: () => void;
  onNextResult: () => void;
}

const employeeName = (employee: SelectedEmployee) =>
  `${employee.firstName ?? ""} ${employee.lastName ?? ""}`.trim();

export default function SearchScrollFilters({
  pipelineData,
  isTeamPipeline,
  selectedColumnId,
  onSelectColumn,
  selectedEmployee,
  resultCount,
  currentResultIndex,
  onPrevResult,
  onNextResult,
}: SearchScrollFiltersProps) {
  const pathname = usePathname() || "";
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectedType = searchParams?.get("type") ?? null;
  const selectedEmployeeId = searchParams?.get("employeeId") ?? null;

  const [employeeMenuOpen, setEmployeeMenuOpen] = useState(false);
  const [employeeSearchInput, setEmployeeSearchInput] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const debounceEmployeeSearch = useDebounce(
    (value: string) => setEmployeeSearch(value),
    300,
  );

  const employeeQuery = useEmployeeFilterOptions(
    (selectedType as EmployeeType) ?? undefined,
    employeeSearch,
    isTeamPipeline && employeeMenuOpen,
  );

  const employeeOptions: FilterOption[] = useMemo(
    () =>
      (employeeQuery.data?.pages ?? []).flatMap((page) =>
        page.employees.map((employee) => ({
          value: String(employee.id),
          label: employeeName(employee),
        })),
      ),
    [employeeQuery.data],
  );

  // Both filters live in the URL so the server component can re-query with them
  const pushParams = (mutate: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    mutate(params);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const columnOptions: FilterOption[] = pipelineData.map((column: any) => ({
    value: String(column.id),
    label: column.title || "Untitled Column",
  }));

  return (
    <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-4">
      {!isTeamPipeline ? (
        <PipelineFilterDropdown
          allLabel="All Columns"
          ariaLabel="Filter by column"
          options={columnOptions}
          value={selectedColumnId === null ? null : String(selectedColumnId)}
          onSelect={(value) => onSelectColumn(Number(value))}
          onClear={() => onSelectColumn(null)}
        />
      ) : (
        <>
          <PipelineFilterDropdown
            allLabel="All Type"
            ariaLabel="Filter by employee type"
            options={EMPLOYEE_TYPES.map((type) => ({
              value: type,
              label: type,
            }))}
            value={selectedType}
            onSelect={(value) =>
              pushParams((params) => {
                params.set("type", value);
                // The employee list is scoped to the chosen type, so a person
                // picked under the previous type may no longer be offered.
                params.delete("employeeId");
              })
            }
            onClear={() =>
              pushParams((params) => {
                params.delete("type");
                params.delete("employeeId");
              })
            }
          />

          <PipelineFilterDropdown
            allLabel="All Employees"
            ariaLabel="Filter by employee"
            options={employeeOptions}
            value={selectedEmployeeId}
            selectedLabel={
              selectedEmployee ? employeeName(selectedEmployee) : undefined
            }
            onSelect={(value) =>
              pushParams((params) => params.set("employeeId", value))
            }
            onClear={() => pushParams((params) => params.delete("employeeId"))}
            onOpenChange={setEmployeeMenuOpen}
            searchValue={employeeSearchInput}
            searchPlaceholder="Search employee"
            onSearchChange={(value) => {
              setEmployeeSearchInput(value);
              debounceEmployeeSearch(value);
            }}
            hasMore={!!employeeQuery.hasNextPage}
            isLoading={
              employeeQuery.isLoading || employeeQuery.isFetchingNextPage
            }
            onLoadMore={() => {
              if (
                employeeQuery.hasNextPage &&
                !employeeQuery.isFetchingNextPage
              )
                employeeQuery.fetchNextPage();
            }}
          />
        </>
      )}

      {resultCount > 0 && (
        <div className="flex h-12 items-center justify-between gap-1 rounded-2xl border-2 border-slate-100 bg-slate-50/50 px-3 shadow-sm">
          <div className="flex items-center gap-2 border-r border-slate-200 pr-3">
            <span className="text-xs font-semibold text-primary">
              {currentResultIndex + 1}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              of {resultCount}
            </span>
          </div>

          <div className="flex gap-1">
            <button
              onClick={onPrevResult}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm transition-all hover:bg-primary hover:text-white active:scale-90"
              aria-label="Previous result"
            >
              <ArrowUp size={14} />
            </button>
            <button
              onClick={onNextResult}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm transition-all hover:bg-primary hover:text-white active:scale-90"
              aria-label="Next result"
            >
              <ArrowDown size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
