import { cn } from "@/lib/cn";
import { SalesTagSelector } from "../../../components/SalesTagSelector";
import SalesSelector from "../../../components/SalesSelector";
import { Tag } from "@prisma/client";
import { useState } from "react";
import { LeadWithSalesUser } from "@/types/invoiceLead";
import { removeLeadTag, saveLeadTag } from "@/actions/pipelines/leadTag";
import { useColumnDispatch } from "@/context/sales-pipeline.context";
import { actionTypes } from "@/constants/lead.constant";

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

  const handleAddTag = async ({
    columnId,
    leadId,
    selectedTag,
  }: TTagSelect) => {
    try {
      const result = await saveLeadTag(leadId, selectedTag.id);

      if (result) {
        dispatch({
          type: actionTypes.ADD_TAG,
          payload: {
            columnId,
            leadId,
            tag: selectedTag,
          },
        });
      }
    } catch (error) {
      console.error("Error adding tag:", error);
    }
  };

  const handleRemoveTag = async ({ columnId, leadId, tagId }: TRemoveTag) => {
    try {
      const success = await removeLeadTag(leadId, tagId);
      if (success) {
        dispatch({
          type: actionTypes.REMOVE_TAG,
          payload: { columnId, leadId, tagId },
        });
      }
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
            <button
              type="button"
              className={cn(
                "ml-1 cursor-pointer text-xs text-white disabled:cursor-not-allowed disabled:opacity-50",
                leadTag.tag?.bgColor === "white" && "text-black"
              )}
              onClick={() => {
                handleRemoveTag({
                  leadId: lead.id,
                  columnId: lead.columnId!,
                  tagId: leadTag.id,
                });
              }}
            >
              ✕
            </button>
          </span>
        );
      })}
      {/* Todo: leadTags loop */}

      <button
        disabled={false} // pending
        type="button"
        className="inline-flex h-[20px] items-center justify-center rounded bg-[#6571FF] px-1 py-1 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
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
