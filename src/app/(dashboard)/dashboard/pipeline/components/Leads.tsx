"use client";
import { createLeadDraftEstimate } from "@/actions/pipelines/createLeadDraftEstimate";
import {
  getLeadsWithCountOptimized as getLeadsWithCount,
  updateLeadColumn,
} from "@/actions/pipelines/getLeads";
import { getCompanyUser } from "@/actions/user/getCompanyUser";
import { AppointmentCreateOrEdit } from "@/components/appointment/AppointmentCreateOrEdit";
import DateRange from "@/components/DateRange";
import ResponsiveSalesPipelineCard from "@/components/mobile-responsive/pipeline/ResponsiveSalesPipelineCard";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { cn } from "@/lib/cn";
import { errorToast, successToast } from "@/lib/toast";
import { updatePipelineAutomationTrigger } from "@/service/pipeline-automation-trigger/api";
import { usePopupStore } from "@/stores/popup";
import { LeadWithSalesUser } from "@/types/invoiceLead";
import SessionUserType from "@/types/sessionUserType";
import { Appointment, Column, User } from "@prisma/client";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Pagination, Select } from "antd";
import {
  Calendar,
  CalendarCheck,
  ChevronDown,
  MessageCircleMore,
  Search,
} from "lucide-react";
import moment from "moment";
import { customAlphabet } from "nanoid";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import toast from "react-hot-toast";
import { LeadsMobileSkeleton } from "./LeadsMobileSkeleton";
import { LeadsTableSkeleton } from "./LeadsTableSkeleton";
import { NewAppointmentPipeline } from "./NewAppointmentPipeline";
import SelectComponent from "./Select";
import TaskForm from "./TaskForm";

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
  const [companyUsers, setCompanyUsers] = useState<User[]>([]);

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
  const [filter, setFilter] = useState<any>({
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
          queryParams.append("startDate", dateRange[0].toISOString());
        if (dateRange?.[1])
          queryParams.append("endDate", dateRange[1].toISOString());

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

  // Reset page to 1 when search changes
  // useEffect(() => {
  //   setCurrentPage(1);
  // }, [search]);

  // Debounced search and filter effect
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
        const [userResponse, companyUsers] = await Promise.all([
          fetch("/api/getUser"),
          getCompanyUser(),
        ]);

        if (userResponse.ok) {
          const userData = await userResponse.json();
          setCurrentUser(userData);

          // Filter sales users based on current user
          const salesUsers = companyUsers.filter(
            (user) => user.employeeType === "Sales",
          );

          if (userData?.employeeType === "Sales") {
            const currentSalesUser = salesUsers.find(
              (user) => user.id.toString() === userData?.id.toString(),
            );
            setCompanyUsers(currentSalesUser ? [currentSalesUser] : []);
          } else {
            setCompanyUsers(salesUsers);
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserAndCompanyUsers();
  }, []);
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
        const draftEstimateId = customAlphabet("1234567890", 10)();
        const res = await createLeadDraftEstimate({
          id: draftEstimateId,
          leadId,
          clientId: clientId!,
          vehicleId: vehicleId,
          type: "Estimate",
        });
        if (res.type === "success") {
          successToast(res?.message || "Draft estimate created");
          setLeads((prevLeads) => {
            return prevLeads.map((lead) => {
              if (lead.id === leadId) {
                return { ...lead, isEstimateCreated: true };
              }
              return lead;
            });
          });
        } else if (res.type === "error") {
          router.push(`/dashboard/estimate/view/${res.data.id}`);
        } else if (res.type === "globalError") {
          errorToast(
            res?.errorSource && res?.errorSource.length > 0
              ? res?.errorSource[0].message
              : res.message,
          );
        }
      } catch (err) {
        const formattedError = errorHandler(err);
        errorToast(
          formattedError?.errorSource && formattedError?.errorSource.length > 0
            ? formattedError?.errorSource[0].message
            : formattedError.message,
        );
      }
    },
    [router],
  ); // Only depend on router
  //sort leads by time created in descending order (already sorted by backend)
  // leads?.sort((a, b) => {
  //   return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  // });

  // Reset page to 1 when filters change
  // useEffect(() => {
  //   setCurrentPage(1);
  // }, [search, filter, dateRange]);

  // if (loading) {
  //   return (
  //     <Spin
  //       size="large"
  //       className="flex w-full items-center justify-center"
  //       style={{ height: "calc(100vh - 150px)" }} // Adjust height as needed>
  //     />
  //   );
  // }
  // if (loading) {
  //   return (
  //     <Spin
  //       size="large"
  //       className="flex w-full items-center justify-center"
  //       style={{ height: "calc(100vh - 150px)" }} // Adjust height as needed>
  //     />
  //   );
  // }

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
        toast.success("Lead status updated successfully");
      } catch (err) {
        toast.error("Error updating lead status");
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
    <div className="">
      {/* TODO */}
      {/* <Filter pipelineType={type} /> */}
      <div className="space-y-4 sm:space-y-6 md:space-y-8 px-3">
        <div className="mt-5 flex w-full flex-col-reverse justify-between gap-4 md:flex-row md:items-center">
          <div className="flex w-full max-w-4xl rounded-xl border bg-background p-2">
            <div className="flex w-full md:items-center gap-2 md:gap-4 md:flex-row flex-col">
              <SearchTerms search={search} setSearch={setSearch} />
              <div className="items-center gap-2 flex flex-1 flex-row">
                <div className="flex-1 min-w-0">
                  <DateRange
                    dateRange={dateRange}
                    onOk={(start, end) => setDateRange([start, end])}
                    onCancel={() => setDateRange([null, null])}
                  />
                </div>
                <div className="relative flex-shrink-0 w-[100px] sm:w-auto sm:flex-1">
                  <DropdownMenuDemo
                    leads={initialLeads ?? []}
                    filter={filter}
                    setFilter={setFilter}
                    clearFilters={clearFilters}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {leads.length > 0 && !loading ? (
          <>
            <div className="hidden lg:block">
              <table className="w-full shadow-md">
                <thead className="bg-background">
                  <tr className="h-10 border-b">
                    <th className="border-b px-4 py-2 text-left">Lead#</th>
                    <th className="border-b px-4 py-2 text-left">Client </th>
                    <th className="border-b px-4 py-2 text-left">
                      Vehicle Info
                    </th>
                    <th className="border-b px-4 py-2 text-left">Services</th>
                    <th className="border-b px-4 py-2 text-left">
                      Assigned To
                    </th>
                    <th className="border-b px-4 py-2 text-left">
                      Lead Source
                    </th>
                    <th className="border-b px-4 py-2 text-left">Status</th>
                    <th className="border-b px-4 py-2 text-left">Actions</th>
                    <th className="border-b px-4 py-2 text-left">
                      Time Created
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {leads &&
                    leads.map((lead, index) => {
                      const timeCreated = moment(lead.createdAt).format(
                        "MM/DD/YYYY",
                      );

                      return (
                        <tr
                          key={lead.id + 1}
                          className={cn(
                            "rounded-md",
                            index % 2 === 0 ? "bg-background" : "bg-blue-100",
                          )}
                        >
                          <td className="border-b px-4 py-2 text-left">
                            <Link
                              href={`/dashboard/client/${lead.clientId}`}
                              className="block h-full w-full text-[#6571FF]"
                            >
                              {(currentPage - 1) * pageSize + index + 1}
                            </Link>
                          </td>
                          <td className="border-b px-4 py-2 text-left">
                            <Link
                              href={`/dashboard/client/${lead.clientId}`}
                              className="block h-full w-full"
                            >
                              {formatDisplayName(lead.clientName)}
                            </Link>
                          </td>
                          <td className="border-b px-4 py-2 text-left">
                            <Link href="#" className="block h-full w-full">
                              {lead.vehicleInfo}
                            </Link>
                          </td>
                          <td className="border-b px-4 py-2 text-left">
                            <Link href="#" className="block h-full w-full">
                              {lead.services}
                            </Link>
                          </td>
                          <td className="border-b px-4 py-2 text-left">
                            <Link href="#" className="block h-full w-full">
                              {lead.salesUser?.firstName}{" "}
                              {lead.salesUser?.lastName ?? ""}
                            </Link>
                          </td>
                          <td className="border-b px-4 py-2 text-left">
                            <Link href="#" className="block h-full w-full">
                              {lead.source}
                            </Link>
                          </td>
                          <td className="border-b px-4 py-2 text-left">
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
                                      (optionB?.label ?? "").toLowerCase(),
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

                          <td className="border-b px-4 py-2 text-left">
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/dashboard/communication/client/${lead?.client?.id}?source=lead`}
                                className="group relative"
                              >
                                <MessageCircleMore
                                  size={20}
                                  className="duration-300 hover:text-[#6571FF]"
                                />
                                <span className="invisible absolute bottom-full left-14 mb-1 w-max -translate-x-1/2 transform whitespace-nowrap rounded-md border-2 border-white bg-[#66738C] px-2 py-1 text-xs text-white shadow-lg transition-opacity group-hover:visible">
                                  Communications
                                </span>
                              </Link>
                              <button
                                onClick={() =>
                                  handleCreateDraftEstimate({
                                    leadId: lead.id,
                                    clientId: Number(lead?.clientId),
                                    vehicleId: lead?.client?.vehicle?.id,
                                  })
                                }
                                className="group relative"
                              >
                                {lead.isEstimateCreated ? (
                                  <div className="relative h-6 w-4">
                                    <Image
                                      alt="draftEstimateDone"
                                      src="/icons/estimateDone.png"
                                      fill
                                      className="object-contain"
                                      loading="lazy"
                                      sizes="24px"
                                    />
                                  </div>
                                ) : (
                                  <div className="relative h-4 w-4">
                                    <Image
                                      src="/icons/draftEstimate.png"
                                      alt="draftEstimate"
                                      fill
                                      sizes="16px"
                                      className="object-contain duration-300 hover:opacity-80"
                                      loading="lazy"
                                    />
                                  </div>
                                )}
                                <span className="invisible absolute bottom-full left-14 mb-1 w-max -translate-x-1/2 transform whitespace-nowrap rounded-md border-2 border-white bg-[#66738C] px-2 py-1 text-xs text-white shadow-lg transition-opacity group-hover:visible">
                                  Draft estimate
                                </span>
                              </button>
                              {(() => {
                                const appointment =
                                  (lead?.client?.appointments?.length ?? 0) > 0
                                    ? lead?.client?.appointments?.[0]
                                    : undefined;
                                return (
                                  <AppointmentCreateOrEdit
                                    fromEdit={!!appointment}
                                    fromLead
                                    appointmentId={appointment?.id}
                                    triggerIcon={
                                      <button className="group relative">
                                        {!!appointment ? (
                                          <CalendarCheck
                                            size={18}
                                            color="#6571FF"
                                          />
                                        ) : (
                                          <Calendar size={18} color="#66738C" />
                                        )}

                                        <span className="invisible absolute bottom-full left-14 mb-1 w-max -translate-x-1/2 transform whitespace-nowrap rounded-md border-2 border-white bg-[#66738C] px-2 py-1 text-xs text-white shadow-lg transition-opacity group-hover:visible">
                                          New Appointment
                                        </span>
                                      </button>
                                    }
                                    vehicleId={lead?.client?.vehicle?.id}
                                    clientId={lead?.client?.id}
                                    onAppointmentCreated={(
                                      appointment: Appointment,
                                    ) => {
                                      handleUpdateAppointmentInLead(
                                        appointment,
                                        {
                                          leadId: lead.id,
                                          columnId: lead.columnId!,
                                        },
                                      );
                                    }}
                                    onAppointmentUpdated={(
                                      appointment: Appointment,
                                    ) => {
                                      handleUpdateAppointmentInLead(
                                        appointment,
                                        {
                                          leadId: lead.id,
                                          columnId: lead.columnId!,
                                        },
                                      );
                                    }}
                                  />
                                );
                              })()}
                              <div className="group relative ">
                                <TaskForm
                                  companyUsers={companyUsers}
                                  leadId={lead.id}
                                  previousTasks={lead.tasks || []}
                                />
                                <span className="invisible absolute bottom-full left-14 mb-1 w-max -translate-x-1/2 transform whitespace-nowrap rounded-md border-2 border-white bg-[#66738C] px-2 py-1 text-xs text-white shadow-lg transition-opacity group-hover:visible">
                                  Add Task
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="border-b px-4 py-2 text-left">
                            <Link href="#" className="block h-full w-full">
                              {timeCreated}
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
            <div className="overflow-y-auto lg:hidden">
              {leads &&
                leads.map((lead, index) => {
                  return (
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
                  );
                })}
            </div>
          </>
        ) : loading ? (
          // <div
          //   className="flex w-full items-center justify-center"
          //   style={{ height: "calc(100vh - 300px)" }}
          // >
          //   <Spin size="large" />
          // </div>

          <>
            <LeadsTableSkeleton />
            <LeadsMobileSkeleton />
          </>
        ) : (
          <div className="py-20 flex w-full justify-center text-gray-500">
            No leads found.
          </div>
        )}
      </div>

      {/* Pagination */}
      {showPagination && (
        <div className="py-4 sm:mx-3 px-3 flex justify-end sticky bottom-0 bg-background z-10">
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

const SearchTerms = React.memo(function SearchTerms({
  search,
  setSearch,
}: {
  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
}) {
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value);
    },
    [setSearch],
  );

  return (
    <div className="relative min-w-0 flex-1 group">
      <Search
        size={18}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-[#6571FF]"
      />

      <input
        type="text"
        value={search}
        placeholder="Search by client, vehicle, services..."
        onChange={handleSearchChange}
        className={cn(
          "w-full h-11 pl-12 pr-4 rounded-xl border  bg-white",
          "text-sm font-medium text-slate-700 placeholder:text-slate-400 outline-none",
          "transition-all duration-300 ease-in-out",
          "hover:border-slate-200 hover:bg-slate-50/30",
          "focus:border-[#6571FF]/40 focus:bg-white focus:ring-4 focus:ring-[#6571FF]/10",
        )}
      />
    </div>
  );
});

const DropdownMenuDemo = React.memo(function DropdownMenuDemo({
  leads,
  setFilter,
  filter,
  clearFilters,
}: {
  leads: LeadWithSalesUser[];
  setFilter: any;
  filter: {
    [key: string]: string;
  };
  clearFilters: () => void;
}) {
  // Memoize expensive computations to prevent recalculation on every render
  const { statusItems, serviceItems, sourceItems, salesPersonItems } =
    useMemo(() => {
      const uniqueStatuses = new Set<string>();
      const uniqueServices = new Set<string>();
      const uniqueSources = new Set<string>();
      const salesPersonsId = new Set<number>();

      leads?.forEach((lead) => {
        if (lead.column?.title) {
          uniqueStatuses.add(lead.column.title);
        }
        if (lead.services) {
          uniqueServices.add(lead.services);
        }
        if (lead.source) {
          uniqueSources.add(lead.source);
        }
        if (lead.salesUser?.id) {
          salesPersonsId.add(lead.salesUser?.id);
        }
      });

      return {
        statusItems: Array.from(uniqueStatuses).map((statusName, index) => ({
          id: `status-${index}`,
          value: statusName,
          label: statusName,
        })),
        serviceItems: Array.from(uniqueServices).map((serviceName, index) => ({
          id: `service-${index}`,
          value: serviceName,
          label: serviceName,
        })),
        sourceItems: Array.from(uniqueSources).map((sourceName, index) => ({
          id: `source-${index}`,
          value: sourceName,
          label: sourceName,
        })),
        salesPersonItems: Array.from(salesPersonsId).map((personId, index) => ({
          id: `person-${index}`,
          value: personId.toString(),
          label:
            leads?.find((lead) => lead.salesUser?.id === personId)?.salesUser
              ?.firstName +
            " " +
            leads?.find((lead) => lead.salesUser?.id === personId)?.salesUser
              ?.lastName,
        })),
      };
    }, [leads]);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="flex items-center justify-between w-full rounded-xl border px-4 py-2"
          aria-label="Customise options"
        >
          <span>Filter</span>
          <ChevronDown size={16} />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="data-[side=top]:animate-slideDownAndFade data-[side=right]:animate-slideLeftAndFade data-[side=bottom]:animate-slideUpAndFade data-[side=left]:animate-slideRightAndFade min-w-[220px] rounded-md bg-background p-[5px] py-8 shadow-[0px_10px_38px_-10px_rgba(22,_23,_24,_0.35),_0px_10px_20px_-15px_rgba(22,_23,_24,_0.2)] will-change-[opacity,transform]"
          sideOffset={5}
        >
          <div className="flex flex-col gap-y-2 px-4">
            <SelectComponent
              label="Assigned To"
              items={[
                { id: "all", value: "All", label: "All" },
                ...salesPersonItems,
              ]}
              onChange={(value) =>
                setFilter({
                  ...filter,
                  assignedTo: value === "All" ? null : value,
                })
              }
              value={
                filter?.assignedTo
                  ? salesPersonItems.find(
                      (item) => item.value === filter?.assignedTo,
                    )?.value || ""
                  : ""
              }
            />

            <SelectComponent
              label="Services"
              items={[
                { id: "all", value: "All", label: "All" },
                ...serviceItems,
              ]}
              onChange={(value) =>
                setFilter({
                  ...filter,
                  service: value === "All" ? null : value,
                })
              }
              value={filter?.service || ""}
            />

            <SelectComponent
              label="Sources"
              items={[
                { id: "all", value: "All", label: "All" },
                ...sourceItems,
              ]}
              onChange={(value) =>
                setFilter({ ...filter, source: value === "All" ? null : value })
              }
              value={filter?.source || ""}
            />
            <SelectComponent
              label="Status"
              items={[
                { id: "all", value: "All", label: "All" },
                ...statusItems,
              ]}
              onChange={(value) =>
                setFilter({ ...filter, status: value === "All" ? null : value })
              }
              value={filter?.status || ""}
            />

            <div className="px-4 pt-2">
              <button
                onClick={clearFilters}
                className={cn(
                  "group mt-4 flex w-full items-center justify-center gap-2 rounded-lg py-2 transition-all duration-200 ",
                  "hover:bg-red-50", // Soft background shift
                  " text-slate-500 hover:text-red-500", // Typography style
                  "active:scale-95 border border-slate-200 hover:border-red-100", // Tactile feedback
                )}
              >
                Clear All Filters
              </button>
            </div>
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
});

export default Leads;
