"use client";
import {
  getLeadFilterOptions,
  LeadFilterOptions,
} from "@/actions/pipelines/getLeadFilterOptions";
import { getCompanyUser } from "@/actions/user/getCompanyUser";
import DateRange from "@/components/DateRange";
import ResponsiveSalesPipelineCard from "@/components/mobile-responsive/pipeline/ResponsiveSalesPipelineCard";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { useCreateDraftEstimate } from "@/hooks/pipeline/useCreateDraftEstimate";
import { cn } from "@/lib/cn";
import { errorToast, successToast } from "@/lib/toast";
import { updatePipelineAutomationTrigger } from "@/service/pipeline-automation-trigger/api";
import { usePopupStore } from "@/stores/popup";
import { LeadWithSalesUser } from "@/types/invoiceLead";
import SessionUserType from "@/types/sessionUserType";
import { Appointment, Column, User } from "@prisma/client";
import { Pagination, Select } from "antd";
import { Search } from "lucide-react";
import moment from "moment";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import LeadsFilterDropdown, { LeadFilter } from "./LeadsFilterDropdown";
import LeadTableActions from "./LeadTableActions";
import { LeadsMobileSkeleton } from "./LeadsMobileSkeleton";
import LeadsSearch from "./LeadsSearch";
import { LeadsTableSkeleton } from "./LeadsTableSkeleton";
import { NewAppointmentPipeline } from "./NewAppointmentPipeline";
import useCompanyUsersQuery from "@/hooks/query-hook/useCompanyUsersQuery";

type TProps = {
  salesColumn: Column[];
};

const formatDisplayName = (name?: string | null) => {
  if (!name) return "N/A";

  const cleanedName = name
    .replace(/\b(undefined|null)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleanedName || "N/A";
};

const toLocalDateStr = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const Leads = ({ salesColumn }: TProps) => {
  const [initialLeads, setInitialLeads] = useState<LeadWithSalesUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [leads, setLeads] = useState<LeadWithSalesUser[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25); // Reduced from 50 to 25 for faster initial load
  const [showPagination, setShowPagination] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { data: companyUsers = [] } = useCompanyUsersQuery();
  const [filterOptions, setFilterOptions] = useState<LeadFilterOptions>({
    sources: [],
    services: [],
  });

  const [pending, startTransition] = useTransition();

  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(
    null,
  );

  const [search, setSearch] = useState<string>("");
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    null,
    null,
  ]);
  const [currentUser, setCurrentUser] = useState<SessionUserType>();
  const [filter, setFilter] = useState<LeadFilter>({
    assignedTo: null,
    status: null,
    service: null,
    source: null,
  });
  const { popup, open, close } = usePopupStore();

  // Ref to track processed search/filter combinations to prevent duplicate requests
  const processedFiltersRef = useRef(new Set<string>());
  const isFirstFilterEffectRun = useRef(true);

  // Memoize clearFilters to prevent unnecessary re-creation
  const clearFilters = useCallback(() => {
    setFilter({
      assignedTo: null,
      status: null,
      service: null,
      source: null,
    });
    setSearch("");
    setDateRange([null, null]);
    setCurrentPage(1);
    // Clear the processed filters cache when clearing filters
    processedFiltersRef.current.clear();
  }, []);

  // console.log(initialLeads, "initialLeads");
  // console.log(leads, "leads");

  useEffect(() => {
    const controller = new AbortController();

    const fetchLeads = async (retryCount = 0) => {
      try {
        setLoading(true);
        const skip = (currentPage - 1) * pageSize;

        // Add timeout to the fetch request to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Request timeout")), 10000); // 10 second timeout
        });

        const queryParams = new URLSearchParams();
        if (pageSize) queryParams.append("take", pageSize.toString());
        if (skip !== undefined) queryParams.append("skip", skip.toString());
        if (search) queryParams.append("searchTerm", search);
        if (filter.assignedTo)
          queryParams.append("assignedTo", filter.assignedTo);
        if (filter.source) queryParams.append("source", filter.source);
        if (filter.service) queryParams.append("service", filter.service);
        if (filter.status) queryParams.append("status", filter.status);
        if (dateRange?.[0])
          queryParams.append("startDate", toLocalDateStr(dateRange[0]));
        if (dateRange?.[1])
          queryParams.append("endDate", toLocalDateStr(dateRange[1]));

        const fetchPromise = fetch(
          `/api/pipeline/sales/leads?${queryParams.toString()}`,
        )
          .then((res) => res.json())
          .then((res) => {
            if (!res.success) throw new Error(res.error);
            return res.data;
          });

        const { leads: updatedLeads, totalCount: count } = (await Promise.race([
          fetchPromise,
          timeoutPromise,
        ])) as { leads: LeadWithSalesUser[]; totalCount: number };

        if (!controller.signal.aborted) {
          setInitialLeads(updatedLeads);
          setLeads(updatedLeads);
          setTotalCount(count);
          setShowPagination(count > 10);
          setLoading(false); // Move setLoading(false) here to ensure it runs on success
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Error fetching leads:", error);

          // Simple retry logic for network errors
          if (
            retryCount < 2 &&
            (error as any)?.code !== "ABORT_ERR" &&
            (error as any)?.message !== "Request timeout"
          ) {
            setTimeout(
              () => {
                fetchLeads(retryCount + 1);
              },
              1000 * (retryCount + 1),
            ); // Exponential backoff
            return;
          }

          // Show error toast for persistent failures
          errorToast("Failed to load leads. Please refresh the page.");
        }
      } finally {
        // Always stop loading, even if aborted, to prevent stuck loading state
        setLoading(false);
      }
    };

    // Add a small delay to prevent multiple rapid fire requests
    const timeoutId = setTimeout(() => {
      fetchLeads();
    }, 100);

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [refreshKey, currentPage, pageSize]); // filter and dateRange are handled by debounced effect

  const handleAddLead = () => {
    // Clear the processed filters cache when adding a new lead to ensure fresh data
    processedFiltersRef.current.clear();
    setRefreshKey((prev) => prev + 1); // Increment refreshKey to trigger refetch
  };

  // Memoize handlePageChange to prevent unnecessary re-creation
  const handlePageChange = useCallback(
    (page: number, size?: number) => {
      if (size && size !== pageSize) {
        setPageSize(size);
        setCurrentPage(1); // Reset page only if page size changed
      } else {
        setCurrentPage(page);
      }
      document.querySelector("main")?.scrollTo({ top: 0, behavior: "smooth" });
    },
    [pageSize],
  );

  useEffect(() => {
    const filterKey = JSON.stringify({
      search,
      filter,
      dateRange: dateRange?.map((d) => d?.toISOString()) || [null, null],
    });

    const isSearchEmpty = !search || search.trim() === "";

    // Skip if we've already processed this exact filter combination
    if (!isSearchEmpty && processedFiltersRef.current.has(filterKey)) {
      return;
    }

    if (isSearchEmpty) {
      processedFiltersRef.current.clear();
    }
    if (isFirstFilterEffectRun.current) {
      isFirstFilterEffectRun.current = false;
      return;
    }

    const debounceTimeout = setTimeout(() => {
      processedFiltersRef.current.add(filterKey);
      setCurrentPage((prevPage) => {
        if (prevPage === 1) {
          setRefreshKey((r) => r + 1);
          return prevPage;
        }
        return 1;
      });
    }, 800);

    return () => {
      clearTimeout(debounceTimeout);
    };
  }, [search, filter, dateRange]);

  // Combine user and company users API calls to reduce sequential requests
  useEffect(() => {
    const fetchUserAndCompanyUsers = async () => {
      try {
        // Parallel API calls instead of sequential
        const [userResponse, companyUsers, options] = await Promise.all([
          fetch("/api/getUser"),
          getCompanyUser(),
          getLeadFilterOptions(),
        ]);

        setFilterOptions(options);

        if (userResponse.ok) {
          const userData = await userResponse.json();
          setCurrentUser(userData);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserAndCompanyUsers();
  }, []);
  const { mutateAsync: createDraftEstimate, isPending } =
    useCreateDraftEstimate();

  // Memoize the draft estimate handler to prevent re-creation on every render
  const handleCreateDraftEstimate = useCallback(
    async ({
      clientId,
      vehicleId,
      leadId,
    }: {
      leadId: number;
      clientId: number | undefined;
      vehicleId: number | undefined;
    }) => {
      try {
        if (!currentUser?.companyId) {
          errorToast("Company structure is not properly loaded.");
          return;
        }

        const res = await createDraftEstimate({
          leadId,
          clientId: clientId!,
          vehicleId: vehicleId,
          companyId: currentUser.companyId.toString(),
        });

        if (res.success) {
          successToast(res?.message || "Draft estimate created");
          setLeads((prevLeads) => {
            return prevLeads.map((lead) => {
              if (lead.id === leadId) {
                return { ...lead, isEstimateCreated: true };
              }
              return lead;
            });
          });
        } else if (!res.success && res.data?.id) {
          // A draft estimate already exists, so route to it
          router.push(`/dashboard/estimate/view/${res.data.id}`);
        } else {
          errorToast(res?.message || "Failed to create draft estimate.");
        }
      } catch (err) {
        const formattedError = errorHandler(err);
        errorToast(formattedError.message);
      }
    },
    [router, currentUser, createDraftEstimate],
  );

  // Optimized column change handler with useCallback
  const handleColumnChange = useCallback(
    async ({
      leadId,
      newColumnId,
    }: {
      leadId: number;
      newColumnId: number;
    }) => {
      try {
        const res = await fetch(`/api/pipeline/sales/leads/${leadId}/column`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newColumnId }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        const updatedLead = data.data;
        const column = updatedLead.column;
        setLeads((prevLeads) =>
          prevLeads.map((lead) => {
            if (lead.id === updatedLead.id) {
              return { ...lead, column };
            }
            return lead;
          }),
        );
        successToast("Lead status updated successfully");
      } catch (err) {
        errorToast("Error updating lead status");
      }
    },
    [],
  ); // No dependencies needed

  const handleUpdateAppointmentInLead = useCallback(
    async (
      appointment: Appointment,
      { leadId, columnId }: { leadId: number; columnId: number },
    ) => {
      setLeads((prevLeads) =>
        prevLeads.map((lead) => {
          if (lead.id === leadId) {
            return {
              ...lead,
              latestAppointment: appointment,
              client: lead.client
                ? {
                    ...lead.client,
                    appointments: [appointment],
                  }
                : null,
            };
          }
          return lead;
        }),
      );

      // Trigger pipeline automation
      try {
        const lead = leads.find((l) => l.id === leadId);
        if (lead) {
          await updatePipelineAutomationTrigger({
            condition: "APPOINTMENT_SCHEDULED",
            companyId: lead.companyId,
            leadId: leadId,
            columnId: columnId,
          });
        }
      } catch (err) {
        console.error("Automation run failed", err);
      }
    },
    [leads],
  );

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8 px-2">
      <div className="mt-5 flex w-full flex-col-reverse justify-between gap-4 md:flex-row md:items-center">
        <div className="flex w-full max-w-4xl rounded-xl border bg-background p-2">
          <div className="flex w-full md:items-center gap-2 md:gap-4 md:flex-row flex-col">
            <LeadsSearch search={search} setSearch={setSearch} />
            <div className="items-center gap-2 flex flex-1 flex-row">
              <div className="flex-1 min-w-0">
                <DateRange
                  dateRange={dateRange}
                  onOk={(start, end) => setDateRange([start, end])}
                  onCancel={() => setDateRange([null, null])}
                />
              </div>
              <div className="relative flex-shrink-0 w-[130px] sm:w-auto sm:flex-1">
                <LeadsFilterDropdown
                  filterOptions={filterOptions}
                  salesColumn={salesColumn}
                  companyUsers={companyUsers}
                  filter={filter}
                  setFilter={setFilter}
                  clearFilters={clearFilters}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full p-4 bg-background dark:bg-slate-950 min-h-[65vh] flex flex-col rounded-lg drop-shadow-[0_4px_4px_rgb(0_0_0_/_0.25)]">
        <div className="mx-auto flex-1 flex flex-col space-y-6 w-full">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-600 dark:text-slate-100">
              Leads{" "}
              <span className="text-slate-400 font-normal">({totalCount})</span>
            </h3>
          </div>

          <div className="relative flex flex-1 h-full flex-col overflow-hidden rounded-md bg-background">
            <div className="flex-1 overflow-auto [ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {leads.length > 0 && !loading ? (
                <>
                  <div className="hidden lg:block">
                    <table className="w-full border-separate border-spacing-0">
                      <thead className="sticky top-0 z-10 bg-white shadow-sm">
                        <tr className="h-10 border-b">
                          <th className="px-4 py-2 text-left">Lead#</th>
                          <th className="px-4 py-2 text-left">Client </th>
                          <th className="px-4 py-2 text-left">Vehicle Info</th>
                          <th className="px-4 py-2 text-left">Services</th>
                          <th className="px-4 py-2 text-left">Assigned To</th>
                          <th className="px-4 py-2 text-left">Lead Source</th>
                          <th className="px-4 py-2 text-left">Status</th>
                          <th className="px-4 py-2 text-left">Actions</th>
                          <th className="px-4 py-2 text-left">Time Created</th>
                        </tr>
                      </thead>

                      <tbody>
                        {leads &&
                          leads.map((lead, index) => {
                            const timeCreated = moment(lead.createdAt).format(
                              "MM/DD/YYYY",
                            );
                            const clientId = lead.client?.id;

                            return (
                              <tr
                                key={lead.id + 1}
                                className={cn(
                                  "py-3",
                                  index % 2 === 0
                                    ? "bg-background"
                                    : "bg-[#F8FAFF]",
                                )}
                              >
                                <td className="px-4 py-2 text-left">
                                  {clientId ? (
                                    <Link
                                      href={`/dashboard/client/${clientId}`}
                                      className="block h-full w-full text-primary"
                                    >
                                      {(currentPage - 1) * pageSize + index + 1}
                                    </Link>
                                  ) : (
                                    <span className="block h-full w-full">
                                      {(currentPage - 1) * pageSize + index + 1}
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-2 text-left">
                                  {clientId ? (
                                    <Link
                                      href={`/dashboard/client/${clientId}`}
                                      className="block h-full w-full"
                                    >
                                      {formatDisplayName(lead.clientName)}
                                    </Link>
                                  ) : (
                                    <span className="block h-full w-full">
                                      {formatDisplayName(lead.clientName)}
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-2 text-left">
                                  {lead.vehicleInfo}
                                </td>
                                <td className="px-4 py-2 text-left">
                                  {lead.services}
                                </td>
                                <td className="px-4 py-2 text-left">
                                  {lead.salesUser?.firstName}{" "}
                                  {lead.salesUser?.lastName ?? ""}
                                </td>
                                <td className="px-4 py-2 text-left">
                                  {lead.source}
                                </td>
                                <td className="px-4 py-2 text-left">
                                  {lead?.isQualified ? (
                                    <Select
                                      showSearch
                                      value={lead.column?.id ?? " "}
                                      style={{ width: 150 }}
                                      placeholder="Search to Select"
                                      optionFilterProp="label"
                                      disabled={pending}
                                      filterSort={(optionA, optionB) =>
                                        (optionA?.label ?? "")
                                          .toLowerCase()
                                          .localeCompare(
                                            (
                                              optionB?.label ?? ""
                                            ).toLowerCase(),
                                          )
                                      }
                                      options={salesColumn.map((column) => ({
                                        value: column.id,
                                        label: column.title,
                                      }))}
                                      onSelect={(value) =>
                                        startTransition(() =>
                                          handleColumnChange({
                                            leadId: lead.id,
                                            newColumnId: value as number,
                                          }),
                                        )
                                      }
                                    />
                                  ) : (
                                    "Unqualified"
                                  )}
                                </td>

                                <td className="px-4 py-2 text-left">
                                  <LeadTableActions
                                    lead={lead}
                                    companyUsers={companyUsers}
                                    isPending={isPending}
                                    onCreateDraftEstimate={
                                      handleCreateDraftEstimate
                                    }
                                    onUpdateAppointment={
                                      handleUpdateAppointmentInLead
                                    }
                                  />
                                </td>
                                <td className="px-4 py-2 text-left">
                                  {timeCreated}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                  <div className="lg:hidden p-4 space-y-4">
                    {loading ? (
                      <LeadsMobileSkeleton />
                    ) : leads.length === 0 ? (
                      <LeadsEmptyState />
                    ) : (
                      leads.map((lead, index) => (
                        <ResponsiveSalesPipelineCard
                          key={index}
                          lead={lead as any}
                          index={index}
                          onCreateDraftEstimate={handleCreateDraftEstimate}
                          onUpdateAppointment={handleUpdateAppointmentInLead}
                          companyUsers={companyUsers}
                          salesColumn={salesColumn}
                          onColumnChange={handleColumnChange}
                        />
                      ))
                    )}
                  </div>
                </>
              ) : loading ? (
                <>
                  <div className="hidden lg:block">
                    <LeadsTableSkeleton />
                  </div>
                  <div className="lg:hidden p-4 space-y-4">
                    <LeadsMobileSkeleton />
                  </div>
                </>
              ) : (
                <LeadsEmptyState />
              )}
            </div>

            {showPagination && (
              <div className="mt-auto flex shrink-0 justify-end bg-white px-4 py-2 shadow-[0_-1px_2px_rgba(0,0,0,0.04)]">
                <Pagination
                  className="custom-pagination"
                  current={currentPage}
                  pageSize={pageSize}
                  total={totalCount}
                  onChange={handlePageChange}
                  showSizeChanger
                  onShowSizeChange={handlePageChange}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedClientId && (
        <NewAppointmentPipeline
          clientId={selectedClientId}
          vehicleId={selectedVehicleId}
          popup={popup}
          open={open}
          close={close}
        />
      )}
    </div>
  );
};

function LeadsEmptyState() {
  return (
    <div className="flex min-h-[calc(100vh-250px)] w-full flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-slate-100 bg-slate-50/30 p-12 text-center">
      <div className="relative mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/50">
        <Search size={24} className="text-slate-300" strokeWidth={1.5} />
        <div className="absolute inset-0 animate-ping rounded-3xl bg-slate-100 opacity-20" />
      </div>
      <h3 className="mb-2 text-lg font-bold text-slate-500">
        No Results Found
      </h3>
      <p className="max-w-[280px] text-sm font-medium leading-relaxed text-slate-400">
        We couldn&apos;t find what you&apos;re looking for. Try adjusting your
        filters or search terms.
      </p>
    </div>
  );
}

export default Leads;
