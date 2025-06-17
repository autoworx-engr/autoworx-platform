import { createLeadDraftEstimate } from "@/actions/pipelines/createLeadDraftEstimate";
import { removeLeadTag, saveLeadTag } from "@/actions/pipelines/leadTag";
import {
  removeLeadFromPipeline,
  updateLeadSalesUser,
} from "@/actions/pipelines/updateLeadSalesUser";
import { getCompanyUser } from "@/actions/user/getCompanyUser";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { cn } from "@/lib/cn";
import { errorToast, successToast } from "@/lib/toast";
import { LeadWithSalesUser, SalesLead } from "@/types/invoiceLead";
import SessionUserType from "@/types/sessionUserType";
import { Draggable } from "@hello-pangea/dnd";
import { Column, Lead, Tag, User } from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";
import { Popconfirm, Tooltip } from "antd";
import { customAlphabet } from "nanoid";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import React, {
  memo,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  useTransition,
} from "react";
import { IoIosAddCircleOutline } from "react-icons/io";
import { MdCancel } from "react-icons/md";
import AddTaskComponent from "./AddTaskComponent";
import AppointmentBtn from "./AppointmentBtn";
import CommunicationsNoti from "./CommunicationsNoti";
import { EmployeeTagSelector } from "./EmployeeTagSelector";
import SalesSelector from "./SalesSelector";
import {
  salesPipelineKeyStr,
  salesPipelineQueryKeys,
} from "@/utils/enums/query-key-constant";
import { usePipelineFilterStore } from "@/stores/PipelineFilterStore";
import usePipelineTrigger from "@/hooks/usePipelineTrigger";
import useCommunicationTrigger from "@/hooks/useCommunicationTrigger";
import PipelineInvoiceModal from "./PipelineInvoiceModal";

type TProps = {
  pipelineData: Column[];
  lead: SalesLead;
  columnItem: Column;
  leadIndex: number;
  categoryIndex: number;
  currentUser: SessionUserType | undefined;
  salesKey: string;
  setTagDropdownStates: React.Dispatch<
    React.SetStateAction<{ [key: string]: boolean }>
  >;
  setSelectedUser: React.Dispatch<
    React.SetStateAction<{ [key: string]: User | null }>
  >;
  setOpenSalesSelector: React.Dispatch<
    React.SetStateAction<{ [key: string]: boolean }>
  >;

  selectedUserForLead: {
    id: number;
    firstName: string;
    lastName: string | null;
  } | null;
  isSalesSelectorOpen: boolean;
  isTagDropdownOpen: boolean;
  onAppointmentOpen: (clientId?: number, vehicleId?: number) => void;
  onAppointmentUpdate: (appointmentId?: number) => void;
};

export default memo(
  React.forwardRef<Map<string, HTMLLIElement>, TProps>(function SalesLeadCard(
    {
      pipelineData,
      lead,
      columnItem,
      leadIndex,
      categoryIndex,
      currentUser,
      salesKey,
      selectedUserForLead,
      isSalesSelectorOpen,
      isTagDropdownOpen,
      setTagDropdownStates,
      setSelectedUser,
      setOpenSalesSelector,
      onAppointmentOpen,
      onAppointmentUpdate,
    }: TProps,
    ref,
  ) {
    const [invoiceId, setInvoiceId] = useState<string | null>(null);
    const leadRefs = useRef<Map<string, HTMLLIElement>>(new Map());
    const searchTerm = usePipelineFilterStore((state) => state.searchTerm);
    const { dispatch } = usePipelineTrigger();
    const { dispatch: communicationDispatch } = useCommunicationTrigger();

    useImperativeHandle(ref, () => leadRefs.current);
    const [pending, startTransition] = useTransition();
    const [companyUsers, setCompanyUsers] = useState<User[]>([]);

    const router = useRouter();
    const pathname = usePathname();
    const item = columnItem;

    const queryClient = useQueryClient();

    const refetchLeads = () => {
      queryClient.refetchQueries({
        queryKey: [salesPipelineKeyStr.salesPipeline],
      });
      queryClient.refetchQueries({
        queryKey: [salesPipelineKeyStr.salesPipelineCount],
      });
    };

    useEffect(() => {
      if (!currentUser) return;
      // setLoading(true);
      const fetchCompanyUsers = async () => {
        try {
          const users = await getCompanyUser();
          setCompanyUsers(users ?? []);
        } catch (error) {
          console.error("Error fetching company users:", error);
        } finally {
          // setLoading(false);
        }
      };

      fetchCompanyUsers();
      // removeClientIdFromParams();
    }, [currentUser, pathname]);

    //the sales selector
    const salesSelectorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          salesSelectorRef.current &&
          !salesSelectorRef.current.contains(event.target as Node)
        ) {
          setOpenSalesSelector({});
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, []);

    const handleSalesSelectorToggle = (
      categoryIndex: number,
      leadIndex: number,
    ) => {
      const key = `${categoryIndex}-${leadIndex}`;
      setOpenSalesSelector((prevState) => ({
        ...prevState,
        [key]: !prevState[key],
      }));
    };

    const handleUserSelect = async ({
      leadId,
      columnId,
      categoryIndex,
      leadIndex,
      user,
    }: {
      leadId: number;
      columnId: number;
      categoryIndex: number;
      leadIndex: number;
      user: Partial<User>;
    }) => {
      const key = `${categoryIndex}-${leadIndex}`;
      setSelectedUser((prevState) => ({
        ...prevState,
        [key]: user as User,
      }));
      setOpenSalesSelector((prevState) => ({
        ...prevState,
        [key]: false,
      }));
      // const leadId = pipelineData[categoryIndex].leads[leadIndex].leadId;
      try {
        const updatedLead = await updateLeadSalesUser(leadId, user.id!);
        if (updatedLead) {
          queryClient.setQueryData<
            (Lead & { salesUser: LeadWithSalesUser["salesUser"] })[]
          >(
            salesPipelineQueryKeys.getLeadsKey(columnId).concat(searchTerm),
            (prevLeads) => {
              if (prevLeads && prevLeads.length > 0) {
                const updatedLeads = prevLeads?.map((lead) => {
                  if (lead.id === leadId) {
                    return {
                      ...lead,
                      assignedSalesUserId: user.id!,
                      salesUser: user as User,
                    };
                  }
                  return lead;
                });
                return updatedLeads;
              }
              return prevLeads;
            },
          );
          console.log("Lead sales user updated successfully");
        } else {
          console.error("Failed to update lead sales user");
        }
      } catch (error) {
        refetchLeads();
        console.error("Error updating lead sales user:", error);
      }
    };

    // create a draft estimate for the lead
    const handleCreateDraftEstimate = async ({
      clientId,
      vehicleId,
      leadId,
      columnId,
    }: {
      leadId: number;
      clientId: number | undefined;
      vehicleId: number | undefined;
      columnId: number;
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
          //updating the pipelien data with the draft estimate flag
          queryClient.setQueryData(
            salesPipelineQueryKeys.getLeadsKey(columnId).concat(searchTerm),
            (prevLeads: LeadWithSalesUser[]) => {
              if (prevLeads && prevLeads.length > 0) {
                return prevLeads.map((lead) => {
                  if (lead.id === leadId) {
                    return { ...lead, isEstimateCreated: true };
                  }
                  return lead;
                });
              }
              return prevLeads;
            },
          );

          dispatch("UPDATE_PIPELINE_AUTOMATION_TRIGGER", {
            condition: "ESTIMATE_CREATED",
            companyId: res?.data.companyId,
            leadId: leadId,
            columnId: columnId,
          });
          communicationDispatch("UPDATE_COMMUNICATION_AUTOMATION_TRIGGER", {
            companyId: res?.data.companyId,
            leadId: leadId,
            columnId: columnId,
          });
        } else if (res.type === "error") {
          setInvoiceId(res.data.id);
          // router.push(`/dashboard/estimate/view/${res.data.id}`);
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
        refetchLeads();
      }
    };

    //remove the lead from the pipeline on click the cross
    const handleRemoveLead = async (
      leadId: number,
      categoryIndex: number,
      leadIndex: number,
    ) => {
      // const leadId = pipelineData[categoryIndex].leads[leadIndex].leadId;
      try {
        await removeLeadFromPipeline(leadId);
        pipelineData.forEach((column, index) => {
          if (index === categoryIndex) {
            const getCachesLeads =
              queryClient.getQueryData<LeadWithSalesUser[]>(
                salesPipelineQueryKeys
                  .getLeadsKey(column.id)
                  .concat(searchTerm),
              ) || [];

            const updatedLeads = getCachesLeads.filter(
              (_, i) => i !== leadIndex,
            );
            queryClient.setQueryData<LeadWithSalesUser[]>(
              salesPipelineQueryKeys.getLeadsKey(column.id).concat(searchTerm),
              updatedLeads,
            );
          }
        });
      } catch (error) {
        console.error("Error removing lead from pipeline:", error);
        refetchLeads();
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

    const handleTagSelect = async ({
      columnId,
      leadIndex,
      selectedTag,
      leadId,
      leadTags,
    }: {
      columnId: number;
      leadIndex: number;
      selectedTag: Tag | undefined;
      leadId: number;
      leadTags: LeadWithSalesUser["leadTags"];
    }) => {
      if (selectedTag) {
        // Check for duplicate tags
        const isDuplicate = leadTags.some(
          (tag) => tag.tag.id === selectedTag.id,
        );
        if (isDuplicate) {
          errorToast("Tag already assigned.");
          return;
        }

        try {
          const result = await saveLeadTag(leadId, selectedTag.id);
          if (result) {
            queryClient.setQueryData<
              (Lead & { leadTags: { id: number; tag: Tag }[] })[]
            >(
              salesPipelineQueryKeys.getLeadsKey(columnId).concat(searchTerm),
              (prevLeads) => {
                if (prevLeads && prevLeads.length > 0) {
                  return prevLeads.map((lead, lIndex) => {
                    if (lIndex === leadIndex) {
                      return {
                        ...lead,
                        leadTags: [
                          ...lead.leadTags,
                          { id: selectedTag.id, tag: selectedTag },
                        ],
                      };
                    }
                    return lead;
                  });
                }
                return prevLeads;
              },
            );
          }
        } catch (error) {
          console.error("Error saving tag:", error);
          refetchLeads();
        }
      }
    };

    const handleTagRemove = async ({
      leadId,
      leadIndex,
      tagToRemove,
      columnId,
    }: {
      leadId: number;
      leadIndex: number;
      tagToRemove: Tag;
      columnId: number;
    }) => {
      try {
        const success = await removeLeadTag(leadId, tagToRemove.id);

        if (success) {
          // Only update the state if the server action was successful
          queryClient.setQueryData<
            (Lead & { leadTags: { id: number; tag: Tag }[] })[]
          >(
            salesPipelineQueryKeys.getLeadsKey(columnId).concat(searchTerm),
            (prevLeads) => {
              if (prevLeads && prevLeads.length > 0) {
                return prevLeads.map((lead, lIndex) => {
                  if (lIndex === leadIndex) {
                    const updatedLeadTags = lead.leadTags.filter(
                      (tag) => tag.tag.id !== tagToRemove.id,
                    );
                    return {
                      ...lead,
                      leadTags: updatedLeadTags,
                    };
                  }
                  return lead;
                });
              }
              return prevLeads;
            },
          );
        } else {
          errorToast("Failed to remove tag");
        }
      } catch (error) {
        console.error("Error removing tag:", error);
        errorToast("Failed to remove tag");
        refetchLeads();
      }
    };

    return (
      <Draggable
        key={lead.leadId}
        draggableId={lead.leadId.toString()}
        index={leadIndex}
        isDragDisabled={pending}
      >
        {(provided) => (
          <li
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            ref={(el) => {
              provided.innerRef(el);
              // Store a reference to this lead element
              if (el) leadRefs?.current.set(salesKey, el);
            }}
            key={lead.leadId}
            className={cn(
              "max-w-auto relative mx-1 my-1 h-fit animate-none rounded-xl border bg-background p-1 duration-300 hover:bg-slate-100",
              pending && "opacity-40",
            )}
          >
            <div className="relative flex justify-between">
              <h3 className="font-inter pb-2 font-semibold text-black">
                {lead.name}
              </h3>
              <Popconfirm
                title="Delete the lead"
                description="Are you sure to delete this lead?It can't be undone"
                okText="Yes"
                cancelText="No"
                disabled={pending}
                className="disabled:cursor-not-allowed disabled:opacity-50"
                onConfirm={() =>
                  startTransition(() =>
                    handleRemoveLead(lead.leadId, categoryIndex, leadIndex),
                  )
                }
              >
                <MdCancel
                  fontSize="medium"
                  className="-mr-2 -mt-2 cursor-pointer text-2xl"
                  style={{ color: "#6571FFed" }}
                />
              </Popconfirm>
            </div>
            <div className="mb-1 flex flex-wrap items-center gap-1">
              {lead.leadTags.map((leadTag, index) => {
                return (
                  <span
                    key={`tag-${index}`}
                    className="mr-2 inline-flex h-[20px] items-center rounded bg-gray-300 px-1 py-1 text-xs font-semibold text-black"
                    style={{
                      backgroundColor: leadTag.tag?.bgColor,
                      color: leadTag.tag?.textColor,
                    }}
                  >
                    {leadTag.tag.name}
                    <button
                      type="button"
                      className={cn(
                        "ml-1 cursor-pointer text-xs text-white disabled:cursor-not-allowed disabled:opacity-50",
                        leadTag.tag?.bgColor === "white" && "text-black",
                      )}
                      onClick={() =>
                        startTransition(() =>
                          handleTagRemove({
                            columnId: item.id,
                            leadId: lead.leadId,
                            leadIndex,
                            tagToRemove: leadTag.tag,
                          }),
                        )
                      }
                    >
                      ✕
                    </button>
                  </span>
                );
              })}

              <button
                disabled={pending}
                type="button"
                onClick={() =>
                  startTransition(() =>
                    handleTagDropdownToggle(categoryIndex, leadIndex),
                  )
                }
                className="inline-flex h-[20px] items-center justify-center rounded bg-[#6571FF] px-1 py-1 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                + Add
              </button>
              {isTagDropdownOpen && (
                <div className="-left-100 absolute top-12 z-20">
                  <EmployeeTagSelector
                    disable={pending}
                    setValue={(selectedTag) =>
                      startTransition(() =>
                        handleTagSelect({
                          columnId: item.id,
                          leadId: lead.leadId,
                          leadTags: lead.leadTags,
                          leadIndex,
                          selectedTag,
                        }),
                      )
                    }
                    open={isTagDropdownOpen}
                    setOpen={() =>
                      handleTagDropdownToggle(categoryIndex, leadIndex)
                    }
                  />
                </div>
              )}
              {isSalesSelectorOpen && (
                <div
                  className="absolute right-0 top-6 z-10"
                  ref={salesSelectorRef}
                >
                  <SalesSelector
                    disabled={pending}
                    users={companyUsers}
                    onSelect={(user) =>
                      startTransition(() =>
                        handleUserSelect({
                          leadId: lead.leadId,
                          columnId: item.id,
                          categoryIndex,
                          leadIndex,
                          user,
                        }),
                      )
                    }
                  />
                </div>
              )}
            </div>
            <p className="text-xs">{lead.vehicle}</p>

            <p className="text-xs text-blue-500">{lead.services}</p>
            <p className="text-xs">{lead.source}</p>
            <p className="text-xs">
              Creation Date: {new Date(lead.createdAt).toLocaleDateString()}
            </p>
            <div className="flex justify-between">
              <div className="flex items-center gap-2">
                {/* client message notification or redirect to client section component */}
                <CommunicationsNoti
                  lead={{
                    clientId: lead?.client?.id ?? 0,
                    totalMessage: lead?.totalClientMessage ?? 0,
                  }}
                />
                <button
                  disabled={pending}
                  type="button"
                  onClick={() =>
                    startTransition(() =>
                      handleCreateDraftEstimate({
                        columnId: item.id,
                        leadId: lead.leadId,
                        clientId: lead?.client?.id,
                        vehicleId: lead?.client?.vehicle?.id,
                      }),
                    )
                  }
                  className="group relative disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {lead.isEstimateCreated ? (
                    <PipelineInvoiceModal invoiceId={invoiceId} />
                  ) : (
                    <Image
                      src="/icons/draftEstimate.png"
                      alt="draftEstimate"
                      width={14}
                      height={14}
                    />
                  )}
                  <span className="invisible absolute bottom-full left-14 mb-1 w-max -translate-x-1/2 transform whitespace-nowrap rounded-md border-2 border-white bg-[#66738C] px-2 py-1 text-xs text-white shadow-lg transition-opacity group-hover:visible">
                    Draft estimate
                  </span>
                </button>
                {/* TODO: shown a mark when create a appointment */}
                <AppointmentBtn
                  onOpenAppointment={() => {
                    const appointmentId = lead?.client?.appointments?.[0]?.id;
                    console.log({ client: lead?.client });
                    if (
                      lead?.client?.appointments &&
                      lead?.client?.appointments?.length > 0
                    ) {
                      onAppointmentUpdate(appointmentId);
                    } else {
                      onAppointmentOpen(
                        lead?.client?.id,
                        lead?.client?.vehicle?.id,
                      );
                    }
                  }}
                  appointment={
                    (lead?.client?.appointments?.length ?? 0) > 0
                      ? lead?.client?.appointments?.[0]
                      : undefined
                  }
                />
                {/* add task component */}
                <AddTaskComponent companyUsers={companyUsers} lead={lead} />
              </div>
              {selectedUserForLead ? (
                <Tooltip
                  title={`${selectedUserForLead.firstName} ${selectedUserForLead.lastName}`}
                  placement="right"
                >
                  <div
                    className="size-6 rounded-full border-2 border-[#66738C] p-1 text-[.60rem] text-[#66738C]"
                    onClick={() =>
                      handleSalesSelectorToggle(categoryIndex, leadIndex)
                    }
                  >
                    {selectedUserForLead.firstName.charAt(0).toUpperCase() +
                      selectedUserForLead.lastName?.charAt(0).toUpperCase()}
                  </div>
                </Tooltip>
              ) : (
                <IoIosAddCircleOutline
                  className="mt-1 text-2xl"
                  fontSize="medium cursor-pointer"
                  onClick={() =>
                    handleSalesSelectorToggle(categoryIndex, leadIndex)
                  }
                />
              )}
            </div>
          </li>
        )}
      </Draggable>
    );
  }),
);
