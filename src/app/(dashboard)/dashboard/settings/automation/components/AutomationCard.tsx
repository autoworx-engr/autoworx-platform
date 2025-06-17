"use client";
import { FC } from "react";
import { BiSolidEditAlt } from "react-icons/bi";
import { FaRegCirclePause } from "react-icons/fa6";
import { FiTrash2 } from "react-icons/fi";
import { IoPlayCircleOutline } from "react-icons/io5";
import { useDeletePipelineAutomationRule } from "../../../../../../hooks/pipeline-automation/useDeletePipelineAutomationRule";
import { useUpdatePipelineAutomationRule } from "../../../../../../hooks/pipeline-automation/useUpdatePipelineAutomationRule";
import { useUpdateCommunicationAutomationRule } from "@/hooks/communication-automation/useUpdateCommunicationAutomationRule";
import { useDeleteCommunicationAutomationRule } from "@/hooks/communication-automation/useDeleteCommunicationAutomationRule";

interface Item {
  id: string;
  title: string;
  isPaused?: boolean;
  targetColumnId: number;
  tag?: {
    type: "start" | "end";
    date: string;
  };
}

interface AutomationCardProps {
  item: Item;
  setIsCreate: any;
  setIsEdit: any;
  setId: any;
  type: string;
  companyId: string;
}

const AutomationCard: FC<AutomationCardProps> = ({
  item,
  setIsCreate,
  setIsEdit,
  setId,
  type,
  companyId,
}) => {
  const { mutate: deletePipelineRule } = useDeletePipelineAutomationRule();
  const { mutate: updatePipelineRule } = useUpdatePipelineAutomationRule();
  const { mutate: updateCommunicationRule } =
    useUpdateCommunicationAutomationRule();
  const { mutate: deleteCommunicationRule } =
    useDeleteCommunicationAutomationRule();

  const handleSetIsEdit = (id: any) => {
    setId(id);
    setIsCreate(false);
    setIsEdit(true);
  };

  const handlePause = (id: string) => {
    const data = {
      isPaused: !item.isPaused,
      targetColumnId: item.targetColumnId!,
    };
    if (type == "pipeline") {
      updatePipelineRule({ id: id, data: data });
    } else if (type == "communication") {
      updateCommunicationRule({ id: id, companyId: companyId, data: data });
    }
  };

  const handleDelete = (id: string) => {
    if (type == "pipeline") {
      deletePipelineRule(id);
    } else if (type == "communication") {
      deleteCommunicationRule(id);
    }
  };

  return (
    <div className="mx-auto w-full max-w-xl">
      <div
        key={item.id}
        className="relative flex items-center justify-between rounded-lg border bg-white p-4 transition hover:shadow"
      >
        <div className="font-medium text-gray-700">{item.title}</div>

        {item.tag && (
          <span
            className={`absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs text-white ${
              item.tag.type === "start" ? "bg-indigo-500" : "bg-gray-400"
            }`}
          >
            {item.tag.type === "start"
              ? `Campaign Starts: ${item.tag.date}`
              : `Campaign Ended: ${item.tag.date}`}
          </span>
        )}

        <div className="flex items-center gap-3 text-lg">
          <button
            onClick={() => handlePause(item.id)}
            className="text-[#6571FF] hover:text-indigo-700"
          >
            {item?.isPaused ? (
              <IoPlayCircleOutline className="h-5 w-5" />
            ) : (
              <FaRegCirclePause />
            )}
          </button>
          <button
            onClick={() => handleSetIsEdit(item.id)}
            className="text-[#6571FF] hover:text-indigo-700"
          >
            <BiSolidEditAlt />
          </button>
          <button
            onClick={() => handleDelete(item.id)}
            className="text-red-500 hover:text-red-700"
          >
            <FiTrash2 />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AutomationCard;
