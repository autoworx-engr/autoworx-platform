"use client";
import React, { useEffect, useState } from "react";
import AutomationCard from "./AutomationCard";
import dynamic from "next/dynamic";
import { FiInbox } from "react-icons/fi";
import { useAllPipelineAutomationRules } from "@/hooks/pipeline-automation/useAllPipelineAutomationRules";
import { Skeleton } from "@mui/material";
import { useAllCommunicationAutomationRules } from "@/hooks/communication-automation/useAllCommunicationAutomationRules";
// Lazy load form components
const CommunicationRuleForm = dynamic(() => import("./CommunicationRuleForm"));
const PipelineRuleForm = dynamic(() => import("./PipelineRuleForm"));
const InventoryRuleForm = dynamic(() => import("./InventoryRulesForm"));
const CampaignForm = dynamic(() => import("./CampaignForm"));
const ServiceRuleForm = dynamic(() => import("./ServiceRuleForm"));
const InvoiceRuleForm = dynamic(() => import("./InvoiceRuleForm"));

// Form component map
const formComponents: Record<string, React.ComponentType<any>> = {
  pipeline: PipelineRuleForm,
  communication: CommunicationRuleForm,
  marketing: CampaignForm,
  "service-maintenance": ServiceRuleForm,
  invoice: InvoiceRuleForm,
  inventory: InventoryRuleForm,
};

export default function AllCards({
  type,
  companyId,
  user,
}: {
  type: string;
  companyId: any;
  user: any;
}) {
  const [isEdit, setIsEdit] = useState(false);
  const [isCreate, setIsCreate] = useState(false);
  const [id, setId] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<any>([]);

  const {
    data: allPipelineRules,
    isLoading: pipelineIsLoading,
    isFetching: pipelineIsFetching,
  } = useAllPipelineAutomationRules(companyId);
  const {
    data: allCommunicationRules,
    isLoading: communicationIsLoading,
    isFetching: communicationIsFetching,
  } = useAllCommunicationAutomationRules(companyId);
  const mode = isEdit ? "edit" : "create";

  useEffect(() => {
    const loadData = async () => {
      if (type === "marketing") {
        setCampaigns([
          {
            id: "0",
            title: "Campaign 0",
            tag: { type: "start", date: "30th April 2024" },
          },
          {
            id: "1",
            title: "Campaign 1",
            tag: { type: "end", date: "30th April 2024" },
          },
        ]);
      } else {
        setCampaigns([
          {
            id: "0",
            title: "Follow up",
          },
          {
            id: "1",
            title: "First message",
          },
        ]);
      }

      setIsCreate(false);
      setIsEdit(false);
    };

    loadData();
  }, [type]);

  const items =
    type === "pipeline"
      ? allPipelineRules?.data
      : type == "communication"
        ? allCommunicationRules?.data
        : campaigns;

  const FormComponent = formComponents[type];

  const handleSetIsCreate = () => {
    setIsCreate(true);
    setIsEdit(false);
    setId(null);
  };

  return (
    <div className="mx-auto flex flex-col items-start gap-10 bg-gray-50 md:flex-row">
      <div className="w-1/2">
        <div className="mx-auto w-full max-w-xl">
          <h2 className="mb-6 text-lg font-semibold capitalize text-gray-800 md:text-xl">
            {`${type} Automation`}
          </h2>
          <div className="h-[600px] overflow-y-auto rounded-md border bg-white p-4 shadow-sm md:p-6">
            <p className="mb-4 mt-1 text-base text-gray-500">
              {type == "marketing" ? "Campaigns" : "Rules"}
            </p>

            {items?.length === 0 ? (
              <div className="flex h-[450px] flex-col items-center justify-center text-center text-gray-500">
                <FiInbox className="mb-3 text-4xl text-indigo-400" />
                <p className="text-lg font-medium capitalize">
                  No {`${type} Automation`}
                </p>
                <p className="text-sm text-gray-400">
                  You haven’t added anything yet.
                </p>
              </div>
            ) : pipelineIsLoading && pipelineIsFetching ? (
              <div className="h-[450px] space-y-5">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border bg-white px-2 py-3 transition hover:shadow"
                  >
                    <Skeleton width={150} height={30} />
                    <div className="flex items-center justify-between gap-5">
                      <Skeleton width={30} height={30} />
                      <Skeleton width={30} height={30} />
                      <Skeleton width={30} height={30} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[450px] space-y-5 overflow-y-auto py-3">
                {items?.map((item: any) => (
                  <div key={item.id}>
                    <AutomationCard
                      item={item}
                      setIsCreate={setIsCreate}
                      setIsEdit={setIsEdit}
                      setId={setId}
                      type={type}
                      companyId={companyId}
                    />
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={handleSetIsCreate}
              className="mt-4 w-full rounded-md bg-indigo-500 py-2 font-semibold text-white transition hover:bg-indigo-600"
            >
              + {type == "marketing" ? "Add New Campaign" : "Add New Rules"}
            </button>
          </div>
        </div>
      </div>

      <div className="w-1/2">
        {FormComponent && (isCreate || isEdit) && (
          <FormComponent
            isEdit={isEdit}
            mode={mode}
            id={id}
            companyId={companyId}
            user={user}
          />
        )}
      </div>
    </div>
  );
}
