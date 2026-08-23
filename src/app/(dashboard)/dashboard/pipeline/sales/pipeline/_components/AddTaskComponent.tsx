"use client";
import { actionTypes } from "@/constants/lead.constant";
import { useColumnDispatch } from "@/context/sales-pipeline.context";
import { successToast } from "@/lib/toast";
import { updatePipelineAutomationTrigger } from "@/service/pipeline-automation-trigger/api";
import { LeadWithSalesUser } from "@/types/invoiceLead";
import { Task } from "@prisma/client";
import TaskListPopup from "./TaskListPopup";
import TaskCreateOrEdit from "@/components/task/TaskCreateOrEdit";
import Image from "next/image";
import { useState } from "react";

type TProps = {
  lead: LeadWithSalesUser;
};

export default function AddTaskComponent({ lead }: TProps) {
  const dispatch = useColumnDispatch();
  const [editTaskId, setEditTaskId] = useState<number | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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

  const handleTaskUpdated = async (task: Task) => {
    try {
      dispatch({
        type: actionTypes.CREATE_LEAD_TASK,
        payload: {
          task,
          leadId: lead.id,
          columnId: lead.columnId!,
          isUpdate: true,
        },
      });
      // successToast("Task updated successfully");
      setIsEditModalOpen(false);
      setEditTaskId(null);
    } catch (err) {
      console.error("Error updating task:", err);
      return;
    }
  };

  const handleTaskClick = (taskId: number) => {
    setEditTaskId(taskId);
    setIsEditModalOpen(true);
  };

  const totalTasksCount = lead?.tasks?.length || 0;
  const isShowTaskCount = totalTasksCount > 0;

  const triggerButton = (
    <div className="relative cursor-pointer">
      <div className="relative h-4 w-4">
        <Image
          src="/icons/addtask.png"
          alt="Add Task"
          sizes="100vw"
          fill
          className="object-contain duration-300 hover:opacity-80"
        />
      </div>
      {isShowTaskCount && (
        <span className="absolute -top-2 left-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] leading-none text-white">
          {totalTasksCount}
        </span>
      )}
    </div>
  );

  return (
    <div className="group relative ">
      <TaskCreateOrEdit
        triggerIcon={triggerButton}
        leadId={lead?.id}
        clientId={lead?.client?.id}
        onTaskCreated={handleLeadTaskUpdate}
      />
      {/* Edit Task Modal */}
      {editTaskId && (
        <TaskCreateOrEdit
          taskId={editTaskId}
          fromEdit={true}
          leadId={lead?.id}
          clientId={lead?.client?.id}
          isModalOpen={isEditModalOpen}
          setIsModalOpen={setIsEditModalOpen}
          onTaskUpdated={handleTaskUpdated}
        />
      )}
      {lead?.tasks && lead?.tasks?.length > 0 && (
        <TaskListPopup tasks={lead?.tasks} onTaskClick={handleTaskClick} />
      )}
      <span className="invisible absolute bottom-full left-14 mb-1 w-max -translate-x-1/2 transform whitespace-nowrap rounded-md border-2 border-white bg-[#66738C] px-2 py-1 text-xs text-white shadow-lg transition-opacity group-hover:visible">
        Add Task
      </span>
    </div>
  );
}
