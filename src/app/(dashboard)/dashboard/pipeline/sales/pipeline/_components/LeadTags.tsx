import { actionTypes } from "@/constants/lead.constant";
import { useColumnDispatch } from "@/context/sales-pipeline.context";
import {
  useAddLeadTagMutation,
  useRemoveLeadTagMutation,
} from "@/hooks/pipeline/usePipelineLeads";
import { cn } from "@/lib/cn";
import { updateTagAutomationTrigger } from "@/service/tag-automation-trigger/api";
import { LeadWithSalesUser } from "@/types/invoiceLead";
import { Tag } from "@prisma/client";
import { Popconfirm } from "antd";
import { useState } from "react";
import { SalesTagSelector } from "../../../components/SalesTagSelector";

type TLeadTagsProps = {
  leadTags: {
    id: number;
    tag: Tag;
  }[];
  lead: LeadWithSalesUser;
};

type TTagSelect = {
  columnId: number;
  leadId: number;
  selectedTag: {
    id: number;
    tag: Tag;
  };
};

type TRemoveTag = {
  columnId: number;
  leadId: number;
  tagId: number;
};

export default function LeadTags({ leadTags, lead }: TLeadTagsProps) {
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const dispatch = useColumnDispatch();
  const { mutateAsync: addTag } = useAddLeadTagMutation();
  const { mutateAsync: removeTag } = useRemoveLeadTagMutation();

  const handleAddTag = async ({
    columnId,
    leadId,
    selectedTag,
  }: TTagSelect) => {
    try {
      const result = await addTag({ leadId, tagId: selectedTag.id });

      if (result?.success) {
        dispatch({
          type: actionTypes.ADD_TAG,
          payload: {
            columnId,
            leadId,
            tag: selectedTag,
          },
        });

        const response = await updateTagAutomationTrigger({
          columnId: columnId,
          companyId: result.data?.lead?.companyId,
          pipelineType: "SALES",
          tagId: selectedTag?.id,
          leadId: result.data?.leadId,
        });
        // console.log("response", response?.data);
        // if (response?.success) {
        //   dispatch({
        //     type: actionTypes.AUTOMATION_TRIGGER,
        //     payload: {
        //       updatedLead: response.data,
        //       previousColumnId: columnId,
        //     },
        //   });
        // }
      }
    } catch (error) {
      console.error("Error adding tag:", error);
    }
  };

  const handleRemoveTag = async ({ columnId, leadId, tagId }: TRemoveTag) => {
    try {
      await removeTag({ leadId, tagId });

      dispatch({
        type: actionTypes.REMOVE_TAG,
        payload: { columnId, leadId, tagId },
      });
    } catch (error) {
      console.error("Error removing tag:", error);
    }
  };
  return (
    <div className="mb-1 flex flex-wrap items-center gap-1">
      {leadTags.map((leadTag) => {
        return (
          <span
            key={leadTag.id}
            className="mr-2 inline-flex h-[20px] items-center rounded bg-gray-300 px-1 py-1 text-xs font-semibold text-black"
            style={{
              backgroundColor: leadTag.tag?.bgColor,
              color: leadTag.tag?.textColor,
            }}
          >
            {leadTag.tag.name}
            <span onClick={(e) => e.stopPropagation()}>
              <Popconfirm
                title="Delete Tag"
                description="Are you sure you want to remove this tag?"
                okText="Delete"
                cancelText="Cancel"
                onConfirm={() =>
                  handleRemoveTag({
                    leadId: lead.id,
                    columnId: lead.columnId!,
                    tagId: leadTag.id,
                  })
                }
                onPopupClick={(e) => e.stopPropagation()}
                overlayClassName="[&_.ant-popover-inner]:rounded-2xl [&_.ant-popover-inner]:p-4 [&_.ant-popover-message-title]:font-semibold [&_.ant-popover-message-title]:text-slate-800"
                okButtonProps={{
                  className:
                    "!rounded-lg !border-none !bg-[#6571ff] !font-semibold !shadow-sm !shadow-[#6571ff]/30 hover:!bg-[#525ceb]",
                }}
                cancelButtonProps={{
                  className:
                    "!rounded-lg !border-slate-200 !font-medium !text-slate-600 hover:!border-slate-300 hover:!bg-slate-50 hover:!text-slate-700",
                }}
              >
                <button
                  type="button"
                  onClick={(e) => e.stopPropagation()}
                  className={cn(
                    "ml-1 cursor-pointer text-xs text-black disabled:cursor-not-allowed disabled:opacity-50",
                  )}
                >
                  ✕
                </button>
              </Popconfirm>
            </span>
          </span>
        );
      })}
      {/* Todo: leadTags loop */}

      <button
        disabled={false} // pending
        type="button"
        className="inline-flex h-[20px] items-center justify-center rounded bg-primary px-1 py-1 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        onClick={() => setIsTagDropdownOpen(true)}
      >
        + Add
      </button>
      {isTagDropdownOpen && (
        <div className="-left-100 absolute top-12 z-20">
          <SalesTagSelector
            leadTags={leadTags}
            disable={false} // pending
            setValue={(selectedTag) => {
              if (selectedTag && lead.columnId) {
                handleAddTag({
                  columnId: lead.columnId,
                  leadId: lead.id,
                  selectedTag: {
                    id: selectedTag.id,
                    tag: {
                      id: selectedTag.id,
                      name: selectedTag.name,
                      bgColor: selectedTag.bgColor,
                      textColor: selectedTag.textColor,
                      type: selectedTag.type,
                      createdAt: selectedTag.createdAt,
                      updatedAt: selectedTag.updatedAt,
                      companyId: selectedTag.companyId,
                    },
                  },
                });
              }
            }}
            open={isTagDropdownOpen}
            setOpen={() =>
              setIsTagDropdownOpen((prevDropdownOpen) => !prevDropdownOpen)
            }
          />
        </div>
      )}
    </div>
  );
}
