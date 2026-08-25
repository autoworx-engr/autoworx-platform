import { AppointmentCreateOrEdit } from "@/components/appointment/AppointmentCreateOrEdit";
import { actionTypes } from "@/constants/lead.constant";
import { useColumnDispatch } from "@/context/sales-pipeline.context";
import { errorToast, successToast } from "@/lib/toast";
import { updatePipelineAutomationTrigger } from "@/service/pipeline-automation-trigger/api";
import { LeadWithSalesUser } from "@/types/invoiceLead";
import { Appointment } from "@prisma/client";
import Image from "next/image";
import { useEffect, useState } from "react";
import CommunicationsNoti from "../../../components/CommunicationsNoti";
import PipelineInvoiceModal from "../../../components/PipelineInvoiceModal";
import AddTaskComponent from "./AddTaskComponent";
import LeadAssign from "./LeadAssign";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { useCreateDraftEstimate } from "@/hooks/pipeline/useCreateDraftEstimate";
import { Calendar, CalendarCheck, MessageCircleMore } from "lucide-react";
import { updateInvoiceAutomationTrigger } from "@/service/invoice-automation-trigger/api";
import { useRouter } from "next/navigation";
import { useCanAccessRoute } from "@/hooks/useCanAccessRoute";

type TProps = {
  lead: LeadWithSalesUser;
};

type TCreateDraftEstimateParams = {
  columnId: number;
  leadId: number;
  clientId?: number;
  vehicleId: number | null;
};

const TOOLTIP_CLASS =
  "invisible absolute bottom-full left-14 mb-1 w-max -translate-x-1/2 transform whitespace-nowrap rounded-md border-2 border-white bg-[#66738C] px-2 py-1 text-xs text-white shadow-lg transition-opacity group-hover:visible";

function DisabledAction({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <span className="group relative cursor-not-allowed opacity-40">
      {children}
      <span className={TOOLTIP_CLASS}>{label}</span>
    </span>
  );
}

export default function LeadActions({ lead }: TProps) {
  const dispatch = useColumnDispatch();
  const router = useRouter();
  const [invoiceId, setInvoiceId] = useState<string | null>(
    lead.invoiceId ?? null,
  );

  // Sync local invoiceId state with lead.invoiceId changes (e.g., after creation)
  useEffect(() => {
    if (lead.invoiceId) {
      setInvoiceId(lead.invoiceId);
    }
  }, [lead.invoiceId]);

  const canCreateEstimate = useCanAccessRoute("/dashboard/estimate/create");
  // const handleCreateDraftEstimate = async ({
  //   columnId,
  //   leadId,
  //   clientId,
  //   vehicleId,
  // }: TCreateDraftEstimateParams) => {
  //   try {
  //     const draftEstimateId = customAlphabet("1234567890", 10)();
  //     const res = await createLeadDraftEstimate({
  //       id: draftEstimateId,
  //       leadId,
  //       clientId: clientId!,
  //       vehicleId: vehicleId,
  //       type: "Estimate",
  //     });

  //     if (res.type === "success") {
  //       successToast(res?.message || "Draft estimate created");
  //       //updating the pipelien data with the draft estimate flag
  //       dispatch({
  //         type: actionTypes.CREATE_INVOICE,
  //         payload: {
  //           columnId: columnId,
  //           leadId: leadId,
  //           isInvoiceCreated: true,
  //         },
  //       });
  //       console.log("res", res);
  //       // Trigger pipeline automation
  //       const response = await updatePipelineAutomationTrigger({
  //         condition: "ESTIMATE_CREATED",
  //         companyId: res?.data.companyId,
  //         leadId,
  //         columnId,
  //       });

  //       if (response.statusCode === 200) {
  //         dispatch({
  //           type: actionTypes.AUTOMATION_TRIGGER,
  //           payload: {
  //             updatedLead: response.data,
  //             previousColumnId: columnId,
  //           },
  //         });
  //       }

  //       // Invoice automation
  //       await updateInvoiceAutomationTrigger({
  //         companyId: res?.data.companyId,
  //         invoiceId: res?.data?.id,
  //         columnId: columnId!,
  //         type: res?.data?.type,
  //       });
  //       router.push(
  //         `/dashboard/estimate/edit/${res?.data.id}?clientId=${res?.data.clientId}`,
  //       );
  //     } else if (res.type === "error") {
  //       setInvoiceId(res.data.id);
  //     } else if (res.type === "globalError") {
  //       errorToast(
  //         res?.errorSource && res?.errorSource.length > 0
  //           ? res?.errorSource[0].message
  //           : res.message,
  //       );
  //     }
  //   } catch (err) {
  //     console.error("Error creating draft estimate:", err);
  //     errorHandler(err);
  //     errorToast("Failed to create draft estimate. Please try again.");
  //   }
  // };

  const triggerAutomations = async ({
    companyId,
    leadId,
    columnId,
    invoiceId,
    type,
  }: {
    companyId: number;
    leadId: number;
    columnId: number;
    invoiceId: string;
    type: "Estimate" | "Invoice";
  }) => {
    return Promise.allSettled([
      updatePipelineAutomationTrigger({
        condition: "ESTIMATE_CREATED",
        companyId,
        leadId,
        columnId,
      }),
      updateInvoiceAutomationTrigger({
        companyId,
        invoiceId,
        columnId,
        type,
      }),
    ]);
  };

  const { mutateAsync: createDraftEstimate, isPending } =
    useCreateDraftEstimate();

  const handleCreateDraftEstimate = async ({
    columnId,
    leadId,
    clientId,
    vehicleId,
  }: TCreateDraftEstimateParams) => {
    try {
      // Basic validation
      if (!clientId) {
        errorToast("Add a client to this lead first.");
        return;
      }

      if (!leadId) {
        errorToast("Lead not found. Please refresh and try again.");
        return;
      }

      if (!columnId) {
        errorToast("Pipeline stage missing. Please refresh and try again.");
        return;
      }

      const res = await createDraftEstimate({
        leadId,
        clientId,
        vehicleId: vehicleId ?? undefined,
        companyId: lead.companyId.toString(),
      });

      // Handle API error responses first (early return)
      if (!res.success && res.data?.id) {
        setInvoiceId(res.data.id);
        // Estimate already exists — reflect it on the card right away
        dispatch({
          type: actionTypes.CREATE_INVOICE,
          payload: {
            columnId,
            leadId,
            isInvoiceCreated: true,
            invoiceId: res.data.id,
          },
        });
        return;
      }

      if (!res.success) {
        errorToast(res.message || "Something went wrong");
        return;
      }

      const { companyId, id, clientId: resClientId, type } = res.data;

      successToast(res.message || "Draft estimate created");

      // Reflect the new estimate on the card immediately
      setInvoiceId(id);

      // Update pipeline state
      dispatch({
        type: actionTypes.CREATE_INVOICE,
        payload: {
          columnId,
          leadId,
          isInvoiceCreated: true,
          invoiceId: id,
        },
      });

      // Run automations in parallel (faster)
      triggerAutomations({
        columnId,
        companyId,
        invoiceId: id,
        leadId,
        type,
      }).then(([pipelineResult]) => {
        if (
          pipelineResult.status === "fulfilled" &&
          pipelineResult.value?.statusCode === 200
        ) {
          dispatch({
            type: actionTypes.AUTOMATION_TRIGGER,
            payload: {
              updatedLead: pipelineResult.value.data,
              previousColumnId: columnId,
            },
          });
        }
      });

      // Navigate at the end
      router.push(`/dashboard/estimate/edit/${id}?clientId=${resClientId}`);
    } catch (err) {
      console.log("err", err);
      errorHandler(err);
      errorToast("Failed to create draft estimate. Please try again.");
    }
  };

  const handleUpdateAppointmentInLead = async (
    appointment: Appointment,
    leadInfo: {
      leadId: number;
      columnId: number;
    },
  ) => {
    try {
      dispatch({
        type: actionTypes.ADD_APPOINTMENT,
        payload: {
          leadId: leadInfo.leadId,
          columnId: leadInfo.columnId,
          appointment: appointment,
        },
      });

      // Trigger pipeline automation
      const response = await updatePipelineAutomationTrigger({
        condition: "APPOINTMENT_SCHEDULED",
        companyId: lead.companyId,
        leadId: leadInfo.leadId,
        columnId: leadInfo.columnId,
      });

      if (response.statusCode === 200) {
        dispatch({
          type: actionTypes.AUTOMATION_TRIGGER,
          payload: {
            updatedLead: response.data,
            previousColumnId: leadInfo.columnId,
          },
        });
      }

      // Trigger communication automation
      // updateCommunicationAutomationTrigger({
      //   companyId: lead.companyId,
      //   leadId: leadInfo.leadId,
      //   columnId: leadInfo.columnId,
      // });
    } catch (err) {
      console.error("Automation run failed", err);
    }
  };

  const appointment =
    (lead?.client?.appointments?.length ?? 0) > 0
      ? lead?.client?.appointments?.[0]
      : undefined;
  const fromEdit = !!appointment?.id;
  const vehicleId = lead?.vehicleId;
  // Only the resolved client record — lead.clientId has no foreign key and may
  // point at a deleted client, which the appointment modal can't look up.
  const clientId = lead?.client?.id ?? undefined;
  const hasDraftEstimate = !!lead.isEstimateCreated && !!invoiceId;
  const hasClient = !!clientId;
  return (
    <>
      <div className="flex justify-between">
        <div className="flex items-center gap-2">
          {/* client message notification or redirect to client section component */}
          {hasClient ? (
            <CommunicationsNoti lead={lead} />
          ) : (
            <DisabledAction label="Communications">
              <MessageCircleMore size={20} color="#66738C" />
            </DisabledAction>
          )}
          <button
            disabled={isPending || !canCreateEstimate || !hasClient}
            type="button"
            onClick={() => {
              if (!hasDraftEstimate) {
                handleCreateDraftEstimate({
                  columnId: lead.columnId!,
                  leadId: lead.id,
                  clientId: lead.client?.id,
                  vehicleId: lead?.vehicleId,
                });
              }
              // otherwise show estimate modal
            }}
            className="group relative disabled:cursor-not-allowed disabled:opacity-40"
          >
            {hasDraftEstimate ? (
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
          {!hasClient && (
            <DisabledAction label="Appointment">
              <Calendar size={18} color="#66738C" />
            </DisabledAction>
          )}
          {hasClient && (
            <AppointmentCreateOrEdit
              key={`lead-${lead.id}-appt-${appointment?.id ?? "new"}`}
              fromEdit={fromEdit}
              fromLead
              appointmentId={fromEdit ? appointment?.id : undefined}
              triggerIcon={
                <button className="group relative">
                  {!!appointment ? (
                    <CalendarCheck size={18} color="#6571FF" />
                  ) : (
                    <Calendar size={18} color="#66738C" />
                  )}

                  <span className="invisible absolute bottom-full left-14 mb-1 w-max -translate-x-1/2 transform whitespace-nowrap rounded-md border-2 border-white bg-[#66738C] px-2 py-1 text-xs text-white shadow-lg transition-opacity group-hover:visible">
                    Appointment
                  </span>
                </button>
              }
              vehicleId={vehicleId}
              clientId={clientId}
              draftEstimateId={invoiceId ?? undefined}
              onAppointmentCreated={(appointment: Appointment) => {
                handleUpdateAppointmentInLead(appointment, {
                  leadId: lead.id,
                  columnId: lead.columnId!,
                });
              }}
              onAppointmentUpdated={(appointment: Appointment) => {
                handleUpdateAppointmentInLead(appointment, {
                  leadId: lead.id,
                  columnId: lead.columnId!,
                });
              }}
            />
          )}
          {/* add task component */}
          {hasClient ? (
            <AddTaskComponent lead={lead} />
          ) : (
            <DisabledAction label="Add Task">
              <Image
                src="/icons/addtask.png"
                alt="Add Task"
                width={14}
                height={14}
              />
            </DisabledAction>
          )}
        </div>
        <LeadAssign
          lead={lead}
          salesUser={
            lead.salesUser && {
              id: lead.salesUser.id,
              firstName: lead.salesUser?.firstName,
              lastName: lead.salesUser?.lastName,
            }
          }
        />
      </div>

      {/* {openAppointment && lead?.client?.id && lead.vehicleId && (
        <NewAppointmentPipeline
          onUpdateAppointmentInLead={handleUpdateAppointmentInLead}
          clientId={lead?.client?.id}
          vehicleId={lead.vehicleId}
          popup={popup}
          open={open}
          close={() => {
            close();
            setOpenAppointment(false);
          }}
        />
      )} */}
    </>
  );
}
