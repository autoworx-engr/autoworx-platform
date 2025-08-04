import { create } from "zustand";
import {
  AllPipelineAutomationRules,
  findOnePipelineAutomationRules,
} from "@/service/pipeline-automation/api";

interface AutomationPipelineState {
  automationPipelines: any[];
  fetchAutomationPipeline: (companyId: any) => Promise<void>;
  fetchAutomationPipelineById: (id: string) => Promise<any>;
}

export const useAutomationPipelineStore = create<AutomationPipelineState>(
  (set) => ({
    automationPipelines: [],
    fetchAutomationPipeline: async (companyId) => {
      const res = await AllPipelineAutomationRules(companyId);
      set({ automationPipelines: res?.data });
    },

    fetchAutomationPipelineById: async (id: string) => {
      const res = await findOnePipelineAutomationRules(Number(id));
      return res?.data;
    },
  }),
);
