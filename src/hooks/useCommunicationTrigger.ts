import { updateCommunicationAutomationTrigger } from "@/service/communication-automation-trigger/api";
import { usePipelineFilterStore } from "@/stores/PipelineFilterStore";
import { LeadWithSalesUser } from "@/types/invoiceLead";
import {
  salesPipelineKeyStr,
  salesPipelineQueryKeys,
} from "@/utils/enums/query-key-constant";
import { Appointment, Task } from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";

type UpdateCommunicationAutomationTriggerPayload = {
  companyId: number;
  leadId: number;
  columnId: number;
};

type UpdateTaskInLeadPayload = {
  task: Task;
  leadId: number;
  columnId: number;
};

type UpdateAppointmentInLeadPayload = {
  appointment: Appointment;
  leadId: number;
  columnId: number;
};

type ActionMap = {
  UPDATE_COMMUNICATION_AUTOMATION_TRIGGER: UpdateCommunicationAutomationTriggerPayload;
  UPDATE_LEAD_TASK_STATE: UpdateTaskInLeadPayload;
  UPDATE_LEAD_APPOINTMENT_STATE: UpdateAppointmentInLeadPayload;
};

type TActions = keyof ActionMap;

export default function useCommunicationTrigger() {
  const queryClient = useQueryClient();
  const searchTerm = usePipelineFilterStore((state) => state.searchTerm);

  // handle pipeline automation trigger
  const handleAutomationTrigger = async ({
    companyId,
    leadId,
    columnId,
  }: UpdateCommunicationAutomationTriggerPayload) => {
    try {
      const updatedLead = await updateCommunicationAutomationTrigger({
        companyId,
        leadId,
        columnId,
      });

      // invalidate column leads data
      queryClient.invalidateQueries({
        queryKey: [salesPipelineKeyStr.salesPipeline, columnId, searchTerm],
      });

      queryClient.invalidateQueries({
        queryKey: [
          salesPipelineKeyStr.salesPipeline,
          updatedLead.data.columnId,
          searchTerm,
        ],
      });

      // invalidate column leads count data
      queryClient.invalidateQueries({
        queryKey: [
          salesPipelineKeyStr.salesPipelineCount,
          columnId,
          searchTerm,
        ],
      });

      queryClient.invalidateQueries({
        queryKey: [
          salesPipelineKeyStr.salesPipelineCount,
          updatedLead.data.columnId,
          searchTerm,
        ],
      });
    } catch (error) {
      console.error("Error updating pipeline automation trigger:", error);
    }
  };

  // handle update pipeline task
  const handleUpdateLeadTaskState = (
    task: Task,
    leadId: number,
    columnId: number,
  ) => {
    queryClient.setQueryData(
      salesPipelineQueryKeys.getLeadsKey(columnId).concat(searchTerm ?? ""),
      (oldData: any) => {
        const updatedLeads = oldData.map((lead: LeadWithSalesUser) => {
          if (lead.id === leadId) {
            return {
              ...lead,
              tasks: [...lead.tasks, task],
            };
          }
          return lead;
        });
        return updatedLeads;
      },
    );
  };

  // handle update pipeline lead appointment state
  const handleUpdateLeadAppointmentState = (
    appointment: Appointment,
    leadId: number,
    columnId: number,
  ) => {
    queryClient.setQueryData(
      salesPipelineQueryKeys.getLeadsKey(columnId).concat(searchTerm ?? ""),
      (oldData: any) => {
        const updatedLeads = oldData.map((lead: LeadWithSalesUser) => {
          if (lead.id === leadId) {
            return {
              ...lead,
              client: lead.client
                ? {
                    ...lead.client,
                    appointments: [
                      ...(lead.client?.appointments || []),
                      appointment,
                    ],
                  }
                : null,
            };
          }
          return lead;
        });
        return updatedLeads;
      },
    );
  };

  function dispatch<T extends TActions>(action: T, payload: ActionMap[T]) {
    switch (action) {
      case "UPDATE_COMMUNICATION_AUTOMATION_TRIGGER":
        handleAutomationTrigger(
          payload as UpdateCommunicationAutomationTriggerPayload,
        );
        break;
      case "UPDATE_LEAD_TASK_STATE":
        const leadTaskPayload = payload as UpdateTaskInLeadPayload;
        handleUpdateLeadTaskState(
          leadTaskPayload.task,
          leadTaskPayload.leadId,
          leadTaskPayload.columnId,
        );
        break;
      case "UPDATE_LEAD_APPOINTMENT_STATE":
        const leadAppointmentPayload =
          payload as UpdateAppointmentInLeadPayload;
        handleUpdateLeadAppointmentState(
          leadAppointmentPayload.appointment as Appointment,
          leadAppointmentPayload.leadId,
          leadAppointmentPayload.columnId,
        );
        break;
      default:
        throw new Error(`Unhandled action type: ${action}`);
    }
  }

  return { dispatch };
}
