"use client";
import {
  getLeadFilterOptions,
  LeadFilterOptions,
} from "@/actions/pipelines/getLeadFilterOptions";
import { getCompanyUser } from "@/actions/user/getCompanyUser";
import { AppointmentCreateOrEdit } from "@/components/appointment/AppointmentCreateOrEdit";
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
import { Calendar, CalendarCheck, MessageCircleMore } from "lucide-react";
import moment from "moment";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import LeadsFilterDropdown, { LeadFilter } from "./LeadsFilterDropdown";
import { LeadsMobileSkeleton } from "./LeadsMobileSkeleton";
import LeadsSearch from "./LeadsSearch";
import { LeadsTableSkeleton } from "./LeadsTableSkeleton";
import { NewAppointmentPipeline } from "./NewAppointmentPipeline";
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
        const [userResponse, companyUsers, options] = await Promise.all([
          fetch("/api/getUser"),
          getCompanyUser(),
          getLeadFilterOptions(),
        ]);

        setFilterOptions(options);

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
    <div className="">
      {/* TODO */}
      {/* <Filter pipelineType={type} /> */}
      <div className="space-y-4 sm:space-y-6 md:space-y-8 px-3">
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
                <div className="relative flex-shrink-0 w-[100px] sm:w-auto sm:flex-1">
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
                      const timeCreated = moment
                        .utc(lead.createdAt)
                        .format("MM/DD/YYYY");

                      return (
                        <tr
                          key={lead.id + 1}
                          className={cn(
                            "rounded-md",
                            index % 2 === 0 ? "bg-background" : "bg-blue-100",
                          )}
                        >
                          <td className="border-b px-4 py-2 text-left">
                            {lead.clientId ? (
                              <Link
                                href={`/dashboard/client/${lead.clientId}`}
                                className="block h-full w-full text-primary"
                              >
                                {(currentPage - 1) * pageSize + index + 1}
                              </Link>
                            ) : (
                              <span className="block h-full w-full text-primary">
                                {(currentPage - 1) * pageSize + index + 1}
                              </span>
                            )}
                          </td>
                          <td className="border-b px-4 py-2 text-left">
                            {lead.clientId ? (
                              <Link
                                href={`/dashboard/client/${lead.clientId}`}
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
                          <td className="border-b px-4 py-2 text-left">
                            {lead.vehicleInfo}
                          </td>
                          <td className="border-b px-4 py-2 text-left">
                            {lead.services}
                          </td>
                          <td className="border-b px-4 py-2 text-left">
                            {lead.salesUser?.firstName}{" "}
                            {lead.salesUser?.lastName ?? ""}
                          </td>
                          <td className="border-b px-4 py-2 text-left">
                            {lead.source}
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
                              {(lead?.client?.id ?? lead?.clientId) ? (
                                <Link
                                  href={`/dashboard/communication/client/${lead?.client?.id ?? lead?.clientId}?source=lead`}
                                  className="group relative"
                                >
                                  <MessageCircleMore
                                    size={20}
                                    className="duration-300 hover:text-primary"
                                  />
                                  <span className="invisible absolute bottom-full left-14 mb-1 w-max -translate-x-1/2 transform whitespace-nowrap rounded-md border-2 border-white bg-[#66738C] px-2 py-1 text-xs text-white shadow-lg transition-opacity group-hover:visible">
                                    Communications
                                  </span>
                                </Link>
                              ) : (
                                <span className="group relative cursor-not-allowed opacity-40">
                                  <MessageCircleMore size={20} />
                                  <span className="invisible absolute bottom-full left-14 mb-1 w-max -translate-x-1/2 transform whitespace-nowrap rounded-md border-2 border-white bg-[#66738C] px-2 py-1 text-xs text-white shadow-lg transition-opacity group-hover:visible">
                                    Communications
                                  </span>
                                </span>
                              )}
                              <button
                                onClick={() =>
                                  handleCreateDraftEstimate({
                                    leadId: lead.id,
                                    clientId: Number(lead?.clientId),
                                    vehicleId: lead?.client?.vehicle?.id,
                                  })
                                }
                                disabled={isPending}
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
                                  lead?.latestAppointment ??
                                  ((lead?.client?.appointments?.length ?? 0) > 0
                                    ? lead?.client?.appointments?.[0]
                                    : undefined);
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
                                          Appointment
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
                                  totalTasksCount={lead.taskCount ?? 0}
                                />
                                <span className="invisible absolute bottom-full left-14 mb-1 w-max -translate-x-1/2 transform whitespace-nowrap rounded-md border-2 border-white bg-[#66738C] px-2 py-1 text-xs text-white shadow-lg transition-opacity group-hover:visible">
                                  Add Task
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="border-b px-4 py-2 text-left">
                            {timeCreated}
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
        <div className="py-4 sm:mx-3 px-3 flex justify-end bg-background">
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

export default Leads;
