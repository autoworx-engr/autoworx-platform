"use client";
import { LeadWithSalesUser } from "@/types/invoiceLead";
import { Task, User } from "@prisma/client";
import TaskForm from "../../../components/TaskForm";
import { useColumnDispatch } from "@/context/sales-pipeline.context";
import { actionTypes } from "@/constants/lead.constant";
import { successToast } from "@/lib/toast";
import { updatePipelineAutomationTrigger } from "@/service/pipeline-automation-trigger/api";
import { updateCommunicationAutomationTrigger } from "@/service/communication-automation-trigger/api";

type TProps = {
  lead: LeadWithSalesUser;
  companyUsers: Partial<User>[];
};

export default function AddTaskComponent({ lead, companyUsers }: TProps) {
  const dispatch = useColumnDispatch();

  const handleCommunicationAutomationTrigger = async () => {
    try {
      updateCommunicationAutomationTrigger({
        companyId: lead.companyId,
        leadId: lead.id,
        columnId: lead.columnId!,
      });
    } catch (err) {
      console.error("Error updating communication automation trigger:", err);
    }
  };

  const handleLeadTaskUpdate = async (task: Task) => {
    try {
      dispatch({
        type: actionTypes.CREATE_LEAD_TASK,
        payload: {
          task,
          leadId: lead.id,
          columnId: lead.columnId!,
        },
      });
      successToast("Task added successfully");

      const response = await updatePipelineAutomationTrigger({
        condition: "TASK_CREATED",
        companyId: lead.companyId,
        leadId: lead.id,
        columnId: lead.columnId!,
      });

      if (response.statusCode === 200) {
        dispatch({
          type: actionTypes.AUTOMATION_TRIGGER,
          payload: {
            updatedLead: response.data,
            previousColumnId: lead.columnId!,
          },
        });
      }
    } catch (err) {
      console.error("Error updating lead task:", err);
      return;
    }
  };

  return (
    <div className="group relative mt-1.5">
      <TaskForm
        companyUsers={companyUsers}
        leadId={lead?.id}
        clientId={lead?.client?.id}
        previousTasks={lead?.tasks || []}
        totalTasksCount={lead?.tasks?.length}
        onCommunicationAutomationTrigger={handleCommunicationAutomationTrigger}
        onUpdateTaskInLead={handleLeadTaskUpdate}
      />
      <span className="invisible absolute bottom-full left-14 mb-1 w-max -translate-x-1/2 transform whitespace-nowrap rounded-md border-2 border-white bg-[#66738C] px-2 py-1 text-xs text-white shadow-lg transition-opacity group-hover:visible">
        Add Task
      </span>
    </div>
  );
}
