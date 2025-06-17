import { create } from "zustand";
import { LeadLink } from "@prisma/client";
import { getLeadLinks } from "@/actions/lead/getLeadLinks";

interface LeadLinkState {
  leadLinks: LeadLink[];
  fetchLeadLinks: (companyId: number) => Promise<void>;
}

export const useLeadLinkStore = create<LeadLinkState>((set) => ({
  leadLinks: [],
  fetchLeadLinks: async (companyId) => {
    const res = await getLeadLinks({ companyId });
    set({ leadLinks: res?.data });
  },
}));
