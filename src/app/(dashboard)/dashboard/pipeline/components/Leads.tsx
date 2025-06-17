"use client";
import { cn } from "@/lib/cn";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import Link from "next/link";
import React, { useEffect, useState, useTransition } from "react";

import { createLeadDraftEstimate } from "@/actions/pipelines/createLeadDraftEstimate";
import { getLeads, updateLeadColumn } from "@/actions/pipelines/getLeads";
import { getCompanyUser } from "@/actions/user/getCompanyUser";
import DateRange from "@/components/DateRange";
import ResponsiveSalesPipelineCard from "@/components/mobile-responsive/pipeline/ResponsiveSalesPipelineCard";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { errorToast, successToast } from "@/lib/toast";
import { usePopupStore } from "@/stores/popup";
import { LeadWithSalesUser } from "@/types/invoiceLead";
import SessionUserType from "@/types/sessionUserType";
import { Column, User } from "@prisma/client";
import { Select, Spin } from "antd";
import moment from "moment";
import { customAlphabet } from "nanoid";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { FaChevronDown } from "react-icons/fa";
import { IoIosSearch } from "react-icons/io";
import { PiWechatLogoLight } from "react-icons/pi";
import AddLeads from "./AddLeads";
import AppointmentBtn from "./AppointmentBtn";
import { NewAppointmentPipeline } from "./NewAppointmentPipeline";
import SelectComponent from "./Select";
import TaskForm from "./TaskForm";

type TProps = {
  salesColumn: Column[];
};

const Leads = ({ salesColumn }: TProps) => {
  const [initialLeads, setInitialLeads] = useState<LeadWithSalesUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [leads, setLeads] = useState<LeadWithSalesUser[]>([]);
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

  // console.log(initialLeads, "initialLeads");
  // console.log(leads, "leads");

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        setLoading(true);
        const updatedLeads = await getLeads({});
        setInitialLeads(updatedLeads);
      } catch (error) {
        console.error("Error fetching leads:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();
  }, [refreshKey]); // Refetch leads when refreshKey changes

  const handleAddLead = () => {
    setRefreshKey((prev) => prev + 1); // Increment refreshKey to trigger refetch
  };

  useEffect(() => {
    const fetchUser = async () => {
      const response = await fetch("/api/getUser");
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const fetchCompanyUsers = async () => {
      try {
        const users = await getCompanyUser();
        const salesUsers = users.filter(
          (user) => user.employeeType === "Sales",
        );
        if (currentUser?.employeeType === "Sales") {
          const currentSalesUser = salesUsers.find(
            (user) => user.id.toString() === currentUser?.id.toString(),
          );

          setCompanyUsers(currentSalesUser ? [currentSalesUser] : []);
        } else {
          setCompanyUsers(salesUsers);
        }
      } catch (error) {
        console.error("Error fetching company users:", error);
      }
    };

    fetchCompanyUsers();
  }, [currentUser]);
  const handleCreateDraftEstimate = async ({
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
        clientId: clientId,
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
  };
  //sort leads by time created in descending order
  leads?.sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  useEffect(() => {
    if (search.length > 0) {
      let searchTerm = search.toLowerCase();
      const filteredLeads = initialLeads?.filter(
        (lead) =>
          lead.clientName.toLowerCase().includes(searchTerm) ||
          lead.vehicleInfo.toLowerCase().includes(searchTerm) ||
          lead.services.toLowerCase().includes(searchTerm) ||
          lead.source.toLowerCase().includes(searchTerm),
      );
      setLeads(filteredLeads ?? []);
    } else {
      setLeads(initialLeads ?? []);
    }
  }, [search]);

  useEffect(() => {
    if (dateRange[0] && dateRange[1]) {
      const matchesDateRange = initialLeads?.filter((lead) => {
        const leadDate = lead.createdAt ? new Date(lead.createdAt) : null;
        //@ts-expect-error
        const startDate = new Date(dateRange[0]);
        //@ts-expect-error
        const endDate = new Date(dateRange[1]);
        endDate.setHours(23, 59, 59, 999); // Include the entire end day

        // return leadDate >= startDate && leadDate <= endDate;
        return leadDate ? leadDate >= startDate && leadDate <= endDate : false;
      });
      setLeads(matchesDateRange ?? []);
    } else {
      setLeads(initialLeads ?? []);
    }
  }, [dateRange]);

  useEffect(() => {
    let leadsData2 = initialLeads ?? [];
    if (filter.service) {
      leadsData2 =
        leadsData2?.filter((lead) => lead.services === filter.service) ?? [];
    }
    if (filter.source) {
      leadsData2 =
        leadsData2?.filter((lead) => lead.source === filter.source) ?? [];
    }
    if (filter.assignedTo) {
      leadsData2 =
        leadsData2?.filter(
          (lead) => lead.salesUser?.id === filter.assignedTo,
        ) ?? [];
    }
    if (filter.status) {
      leadsData2 =
        leadsData2?.filter((lead) => lead.column?.title === filter.status) ??
        [];
    }
    setLeads(leadsData2);
    if (
      !filter.service &&
      !filter.assignedTo &&
      !filter.status &&
      !filter.source
    ) {
      setLeads(initialLeads ?? []);
    }
  }, [filter]);

  useEffect(() => {
    setLeads(initialLeads ?? []);
    // const Leads = leadsData || [];
    // let ind = 0;
    // for (const lead of Leads) {
    //   if (
    //     !lead.isQualified &&
    //     leadsData &&
    //     Array.isArray(leadsData) &&
    //     leadsData[ind] &&
    //     leadsData[ind].column &&
    //     leadsData[ind].column.title
    //   ) {
    //     leadsData[ind].column.title = "Unqualified";
    //   }

    //   ind++;
    // }
  }, [initialLeads]);

  if (loading) {
    return (
      <Spin
        size="large"
        className="flex w-full items-center justify-center"
        style={{ height: "calc(100vh - 150px)" }} // Adjust height as needed>
      />
    );
  }

  // column change handler
  const handleColumnChange = async ({
    leadId,
    newColumnId,
  }: {
    leadId: number;
    newColumnId: number;
  }) => {
    try {
      const updatedLead = await updateLeadColumn(leadId, newColumnId);
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
  };

  return (
    <div className="space-y-8 px-3">
      {/* TODO */}
      {/* <Filter pipelineType={type} /> */}
      <div className="mt-5 flex w-full flex-col-reverse justify-between gap-4 md:flex-row md:items-center">
        <div className="flex w-full max-w-4xl rounded-lg border border-gray-300 bg-background p-2">
          <div className="flex w-full items-center gap-4">
            <SearchTerms search={search} setSearch={setSearch} />
            <div className="hidden items-center gap-4 lg:flex">
              <div className="m-2 px-4">
                <DateRange
                  onOk={(start, end) => setDateRange([start, end])}
                  onCancel={() => setDateRange([null, null])}
                />
              </div>
              <div className="relative">
                <DropdownMenuDemo
                  leads={initialLeads ?? []}
                  filter={filter}
                  setFilter={setFilter}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* card list view  */}
      <div className="overflow-y-auto lg:hidden">
        {leads &&
          leads.map((lead, index) => {
            return (
              <ResponsiveSalesPipelineCard
                key={index}
                lead={lead as any}
                index={index}
              />
            );
          })}
      </div>

      <div className="hidden lg:block">
        <table className="w-full shadow-md">
          <thead className="bg-background">
            <tr className="h-10 border-b">
              <th className="border-b px-4 py-2 text-left">Lead#</th>
              <th className="border-b px-4 py-2 text-left">Client </th>
              <th className="border-b px-4 py-2 text-left">Vehicle Info</th>
              <th className="border-b px-4 py-2 text-left">Services</th>
              <th className="border-b px-4 py-2 text-left">Assigned To</th>
              <th className="border-b px-4 py-2 text-left">Lead Source</th>
              <th className="border-b px-4 py-2 text-left">Status</th>
              <th className="border-b px-4 py-2 text-left">Actions</th>
              <th className="border-b px-4 py-2 text-left">Time Created</th>
            </tr>
          </thead>

          <tbody>
            {leads &&
              leads.map((lead, index) => {
                const timeCreated = moment(lead.createdAt).format("MM/DD/YYYY");

                return (
                  <tr
                    key={index + 1}
                    className={cn(
                      "rounded-md",
                      index % 2 === 0 ? "bg-background" : "bg-blue-100",
                    )}
                  >
                    <td className="border-b px-4 py-2 text-left">
                      <Link
                        href="#"
                        className="block h-full w-full text-[#6571FF]"
                      >
                        {index + 1}
                      </Link>
                    </td>
                    <td className="border-b px-4 py-2 text-left">
                      <Link href="#" className="block h-full w-full">
                        {lead.clientName}
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
                          <PiWechatLogoLight
                            size={21}
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
                              clientId: lead?.client?.id,
                              vehicleId: lead?.client?.vehicle?.id,
                            })
                          }
                          className="group relative"
                        >
                          {lead.isEstimateCreated ? (
                            <Image
                              src="/icons/estimateDone.png"
                              alt="draftEstimateDone"
                              width={14}
                              height={14}
                              className="duration-300 hover:text-[#6571FF]"
                            />
                          ) : (
                            <Image
                              src="/icons/draftEstimate.png"
                              alt="draftEstimate"
                              width={14}
                              height={14}
                              className="duration-300 hover:text-[#6571FF]"
                            />
                          )}
                          <span className="invisible absolute bottom-full left-14 mb-1 w-max -translate-x-1/2 transform whitespace-nowrap rounded-md border-2 border-white bg-[#66738C] px-2 py-1 text-xs text-white shadow-lg transition-opacity group-hover:visible">
                            Draft estimate
                          </span>
                        </button>
                        <AppointmentBtn
                          onOpenAppointment={() => {
                            if (lead?.client?.id) {
                              const params = new URLSearchParams(searchParams!);
                              params.set(
                                "clientId",
                                lead?.client?.id?.toString(),
                              );
                              router.push(`${pathname}?${params.toString()}`);
                              setSelectedClientId(lead?.client?.id);
                            }
                            lead?.client?.vehicle?.id &&
                              setSelectedVehicleId(lead?.client?.vehicle?.id);
                            open("ADD_TASK");
                          }}
                          appointment={
                            (lead?.client?.appointments?.length ?? 0) > 0
                              ? lead?.client?.appointments?.[0]
                              : undefined
                          }
                        />

                        <div className="group relative mt-1.5">
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

function SearchTerms({
  search,
  setSearch,
}: {
  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
}) {
  return (
    <div className="relative min-w-0 flex-1">
      <IoIosSearch className="absolute left-3 top-3 text-gray-400" />
      <input
        type="text"
        value={search}
        placeholder="Search..."
        className="w-full rounded border border-gray-300 p-2 pl-10"
        onChange={(e) => {
          setSearch(e.target.value);
          // setFilter({ search: e.target.value });
        }}
      />
    </div>
  );
}

const DropdownMenuDemo = ({
  leads,
  setFilter,
  filter,
}: {
  leads: LeadWithSalesUser[];
  setFilter: any;
  filter: {
    [key: string]: string;
  };
}) => {
  const uniqueStatuses = new Set<string>();

  leads?.forEach((lead) => {
    if (lead.column?.title) {
      uniqueStatuses.add(lead.column.title);
    }
  });

  // Convert the Set back to an array
  const statusItems = Array.from(uniqueStatuses).map((statusName, index) => ({
    id: `status-${index}`,
    value: statusName,
    label: statusName,
  }));

  const uniqueServices = new Set<string>();
  leads?.forEach((lead) => {
    if (lead.services) {
      uniqueServices.add(lead.services);
    }
  });

  // Convert the Set back to an array
  const serviceItems = Array.from(uniqueServices).map((serviceName, index) => ({
    id: `service-${index}`,
    value: serviceName,
    label: serviceName,
  }));

  const uniqueSources = new Set<string>();
  leads?.forEach((lead) => {
    if (lead.source) {
      uniqueSources.add(lead.source);
    }
  });

  // Convert the Set back to an array
  const sourceItems = Array.from(uniqueSources).map((sourceName, index) => ({
    id: `source-${index}`,
    value: sourceName,
    label: sourceName,
  }));

  const salesPersonsId = new Set<number>();
  leads?.forEach((lead) => {
    if (lead.salesUser?.id) {
      salesPersonsId.add(lead.salesUser?.id);
    }
  });

  const salesPersonItems = Array.from(salesPersonsId).map(
    (personId, index) => ({
      id: `person-${index}`,
      value: personId,
      label:
        leads?.find((lead) => lead.salesUser?.id === personId)?.salesUser
          ?.firstName +
        " " +
        leads?.find((lead) => lead.salesUser?.id === personId)?.salesUser
          ?.lastName,
    }),
  );

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="flex items-center gap-x-12 rounded-md border px-4 py-2"
          aria-label="Customise options"
        >
          <span>Filter</span>
          <FaChevronDown />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="data-[side=top]:animate-slideDownAndFade data-[side=right]:animate-slideLeftAndFade data-[side=bottom]:animate-slideUpAndFade data-[side=left]:animate-slideRightAndFade min-w-[220px] rounded-md bg-background p-[5px] py-8 shadow-[0px_10px_38px_-10px_rgba(22,_23,_24,_0.35),_0px_10px_20px_-15px_rgba(22,_23,_24,_0.2)] will-change-[opacity,transform]"
          sideOffset={5}
        >
          <div className="flex flex-col gap-y-2">
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
                //@ts-expect-error
                salesPersonItems.filter(
                  //@ts-expect-error
                  (item) => item.value === filter?.assignedTo,
                )[0]?.value as string
              }
            />

            <SelectComponent
              label="Services"
              items={[
                { id: "all", value: "All", label: "All" },
                ...serviceItems,
              ]}
              onChange={(value) =>
                setFilter({ ...filter, service: value === "All" ? "" : value })
              }
              value={filter?.service}
            />

            <SelectComponent
              label="Sources"
              items={[
                { id: "all", value: "All", label: "All" },
                ...sourceItems,
              ]}
              onChange={(value) =>
                setFilter({ ...filter, source: value === "All" ? "" : value })
              }
              value={filter?.source}
            />
            <SelectComponent
              label="Status"
              items={[
                { id: "all", value: "All", label: "All" },
                ...statusItems,
              ]}
              onChange={(value) =>
                setFilter({ ...filter, status: value === "All" ? "" : value })
              }
              value={filter?.status}
            />
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

export default Leads;
